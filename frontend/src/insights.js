/**
 * CivicWatch presentation-only statistics.
 * Do not recompute control limits or signal decisions here; the tested Python
 * Poisson u-chart in app/qc.py is the sole authority for those results.
 */
export function phaseTotals(observations, phase, zone = null, shift = null) {
  const rows = (observations ?? []).filter(row =>
    row.phase === phase &&
    (zone === null || row.zone_id === zone) &&
    (shift === null || row.shift === shift)
  )
  const stops = rows.reduce((sum, row) => sum + Number(row.stops_observed), 0)
  const vehicles = rows.reduce((sum, row) => sum + Number(row.vehicles_observed), 0)
  return {
    records: rows.length,
    stops,
    vehicles,
    rate: vehicles > 0 ? 1000 * stops / vehicles : null,
  }
}

export function summarizeGroups(results) {
  const observations = results?.observations ?? []
  const groups = results?.groups ?? []
  return groups.map(group => {
    const { zone_id: zone, shift } = group
    const baseline = phaseTotals(observations, 'baseline', zone, shift)
    const monitoring = phaseTotals(observations, 'monitoring', zone, shift)
    const signals = observations.filter(row =>
      row.zone_id === zone && row.shift === shift &&
      row.phase === 'monitoring' && row.signal
    ).length
    const ratio = baseline.rate > 0 && monitoring.rate !== null
      ? monitoring.rate / baseline.rate : null
    return {
      zone, shift, baseline, monitoring, signals, ratio,
      dispersion: group.pearson_dispersion,
      warnings: group.warnings ?? [],
    }
  })
}

export function evidenceRows(results) {
  return (results?.observations ?? [])
    .filter(row => row.phase === 'monitoring' && row.signal)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) ||
      a.zone_id.localeCompare(b.zone_id) || a.shift.localeCompare(b.shift))
}

export const numberText = (value, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? 'N/A' : Number(value).toFixed(digits)

export const countText = value => Number(value || 0).toLocaleString('en-US')

function csvCell(value) {
  let str = value === null || value === undefined ? '' : String(value)
  // Prevent spreadsheet formula execution on untrusted uploaded CSV fields.
  if (/^[\s]*[=+\-@]/.test(str)) str = "'" + str
  return '"' + str.replaceAll('"', '""') + '"'
}

export function evidenceCsv(results) {
  const columns = [
    ['date', 'Date'], ['zone_id', 'Zone'], ['shift', 'Shift'],
    ['stops_observed', 'Observed stops'],
    ['vehicles_observed', 'Observed vehicles'],
    ['rate_per_1000', 'Rate per 1000 vehicles'],
    ['center_per_1000', 'Baseline center per 1000'],
    ['ucl_per_1000', 'UCL per 1000'],
    ['lcl_per_1000', 'LCL per 1000'],
    ['signal_direction', 'Signal direction'],
    ['authorization_status', 'Reported authorization status'],
    ['policy_reference', 'Reported policy reference'],
    ['source_type', 'Source type'],
  ]
  const note = [
    'CivicWatch evidence log — statistical signals only; not evidence of unlawful or discriminatory enforcement',
    'Control limits estimated from baseline-only Poisson u-chart; uploaded data may be synthetic or unverified',
  ]
  return [
    ...note.map(line => csvCell(line)),
    columns.map(([, label]) => csvCell(label)).join(','),
    ...evidenceRows(results).map(row =>
      columns.map(([key]) => csvCell(row[key])).join(',')
    ),
  ].join('\r\n') + '\r\n'
}
