import test from 'node:test'
import assert from 'node:assert/strict'
import {
  phaseTotals, summarizeGroups, evidenceRows, evidenceCsv, numberText,
} from './insights.js'

const sample = {
  groups: [
    { zone_id: 'Zone_A', shift: 'evening', warnings: [], pearson_dispersion: 1.1 },
    { zone_id: 'Zone_B', shift: 'morning', warnings: ['check baseline'], pearson_dispersion: 1.6 },
  ],
  observations: [
    { date: '2026-09-01', zone_id: 'Zone_A', shift: 'evening',
      phase: 'baseline', stops_observed: 2, vehicles_observed: 100, signal: false },
    { date: '2026-09-02', zone_id: 'Zone_A', shift: 'evening',
      phase: 'baseline', stops_observed: 3, vehicles_observed: 200, signal: false },
    { date: '2026-09-03', zone_id: 'Zone_A', shift: 'evening',
      phase: 'monitoring', stops_observed: 7, vehicles_observed: 100,
      rate_per_1000: 70, center_per_1000: 16.67, ucl_per_1000: 60,
      lcl_per_1000: 0, signal: true, signal_direction: 'high',
      authorization_status: 'outside', policy_reference: '=SUM(1,1)',
      source_type: 'synthetic' },
    { date: '2026-09-03', zone_id: 'Zone_B', shift: 'morning',
      phase: 'baseline', stops_observed: 1, vehicles_observed: 100, signal: false },
    { date: '2026-09-04', zone_id: 'Zone_B', shift: 'morning',
      phase: 'monitoring', stops_observed: 1, vehicles_observed: 200,
      rate_per_1000: 5, signal: false },
  ],
}

test('pooled summaries use sum(stops) / sum(exposure), not average of row rates', () => {
  const b = phaseTotals(sample.observations, 'baseline', 'Zone_A', 'evening')
  assert.equal(b.records, 2)
  assert.equal(b.stops, 5)
  assert.equal(b.vehicles, 300)
  assert.equal(Number(b.rate.toFixed(4)), 16.6667)
  const m = phaseTotals(sample.observations, 'monitoring', 'Zone_A', 'evening')
  assert.equal(m.rate, 70)
})

test('zone/shift summaries compare like-for-like groups', () => {
  const summary = summarizeGroups(sample)
  assert.equal(summary.length, 2)
  assert.equal(summary[0].signals, 1)
  assert.ok(Math.abs(summary[0].ratio - 4.2) < 1e-10)
  assert.deepEqual(summary[1].warnings, ['check baseline'])
  assert.equal(summary[1].signals, 0)
})

test('missing exposures do not produce fabricated rates', () => {
  assert.equal(phaseTotals([], 'baseline').rate, null)
  assert.equal(numberText(null), 'N/A')
  assert.equal(numberText(Number.NaN), 'N/A')
})

test('only monitoring signals appear in the evidence log', () => {
  const rows = evidenceRows(sample)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].zone_id, 'Zone_A')
  const updated = { ...sample, observations: [
    ...sample.observations,
    { ...sample.observations[2], phase: 'baseline', date: '2026-08-31', signal: true },
  ] }
  assert.equal(evidenceRows(updated).length, 1)
})

test('CSV includes units, synthetic disclaimer, and neutralizes spreadsheet formulas', () => {
  const csv = evidenceCsv(sample)
  assert.match(csv, /Rate per 1000 vehicles/)
  assert.match(csv, /not evidence of unlawful or discriminatory enforcement/)
  assert.match(csv, /"'=SUM\(1,1\)"/)
  assert.match(csv, /"Zone_A"/)
  assert.ok(csv.endsWith('\r\n'))
})

test('no alert case still creates a usable CSV header', () => {
  const csv = evidenceCsv({ observations: [] })
  assert.match(csv, /"Date","Zone"/)
  assert.ok(!csv.includes('2026-09-03'))
})
