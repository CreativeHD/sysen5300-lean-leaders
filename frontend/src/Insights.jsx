import {
  phaseTotals, summarizeGroups, evidenceRows, evidenceCsv,
  numberText, countText,
} from './insights'
import './Insights.css'

function Metric({ label, value, detail, emphasis = false }) {
  return (
    <div className={'insight-metric' + (emphasis ? ' insight-metric--emphasis' : '')}>
      <div className="insight-metric__label">{label}</div>
      <div className="insight-metric__value">{value}</div>
      <div className="insight-metric__detail">{detail}</div>
    </div>
  )
}

export function OverviewInsights({ results }) {
  const observations = results?.observations ?? []
  const baseline = phaseTotals(observations, 'baseline')
  const monitoring = phaseTotals(observations, 'monitoring')
  const groups = summarizeGroups(results)
  const alerts = evidenceRows(results)
  const warnings = results?.warnings ?? []
  const impacted = groups.filter(g => g.signals > 0).length
  const change = baseline.rate > 0 && monitoring.rate !== null
    ? 100 * (monitoring.rate / baseline.rate - 1) : null

  return (
    <div className="insight-stack">
      <section id="civicwatch-overview" className="insight-section insight-overview" aria-labelledby="insight-heading">
        <div className="insight-section__heading">
          <div>
            <span className="insight-eyebrow">QUANTITATIVE SUMMARY</span>
            <h2 id="insight-heading">What the observations show</h2>
            <p>Exposure-adjusted rates, statistical signals, and the historical context used to interpret them.</p>
          </div>
          <span className={'insight-pill ' + (alerts.length ? 'insight-pill--alert' : 'insight-pill--neutral')}>
            {alerts.length ? 'Review recommended' : 'No monitoring signals'}
          </span>
        </div>
        <div className="insight-metrics">
          <Metric label="Observed vehicles" value={countText(baseline.vehicles + monitoring.vehicles)}
            detail={countText(observations.length) + ' observation periods'} />
          <Metric label="Observed stops" value={countText(baseline.stops + monitoring.stops)}
            detail="Field-observed enforcement events" />
          <Metric label="Baseline rate" value={numberText(baseline.rate)}
            detail="Stops per 1,000 observed vehicles" />
          <Metric label="Monitoring rate" value={numberText(monitoring.rate)}
            detail="Stops per 1,000 observed vehicles" />
          <Metric label="Relative rate change"
            value={change === null ? 'N/A' : (change > 0 ? '+' : '') + numberText(change, 1) + '%'}
            detail="Pooled descriptive change; not a significance test" />
          <Metric label="Groups with signals" value={countText(impacted) + ' / ' + countText(groups.length)}
            detail={countText(alerts.length) + ' flagged monitoring observations'} emphasis={alerts.length > 0} />
        </div>
        <p className="insight-footnote">
          Rates combine all included zones and shifts, so a pooled change may reflect shifts in observation mix.
          Control-chart signals are assessed separately by zone and shift, using only historical baseline observations.
        </p>
      </section>

      <section id="civicwatch-quality" className="insight-section" aria-labelledby="quality-heading">
        <div className="insight-section__heading">
          <div>
            <span className="insight-eyebrow">MODEL ASSUMPTIONS</span>
            <h2 id="quality-heading">Baseline quality and cautions</h2>
            <p>Validation warnings produced by the Python analysis engine, shown rather than silently discarded.</p>
          </div>
          <span className={'insight-pill ' + (warnings.length ? 'insight-pill--warning' : 'insight-pill--ok')}>
            {warnings.length ? warnings.length + ' diagnostic warning' + (warnings.length === 1 ? '' : 's') : 'No threshold warnings'}
          </span>
        </div>
        {warnings.length > 0 ? (
          <ul className="insight-warning-list">
            {warnings.map((warning, i) => (
              <li key={i}><span aria-hidden="true">!</span><div>{warning}</div></li>
            ))}
          </ul>
        ) : (
          <p className="insight-positive">No group crossed the program's dispersion or minimum-history warning thresholds.</p>
        )}
        <div className="insight-explainer">
          <strong>What these checks mean</strong>
          <p>
            The Poisson u-chart assumes comparable observation periods, consistent measurement,
            and approximately Poisson event counts. The engine uses a Pearson dispersion
            screening heuristic (warning above 1.5 or below 0.5) and warns if a group has
            fewer than 20 baseline observations. These checks <strong>do not certify</strong> process
            stability, independence, or representative sampling.
          </p>
          <p>
            The dashboard applies one primary special-cause rule: a monitoring observation
            beyond its own baseline-derived three-sigma limits. Other run or trend rules are
            not implemented. Checking many observations can produce chance alerts.
          </p>
        </div>
      </section>

      <section id="civicwatch-comparisons" className="insight-section" aria-labelledby="group-heading">
        <div className="insight-section__heading">
          <div>
            <span className="insight-eyebrow">COMPARABLE PROCESSES</span>
            <h2 id="group-heading">Baseline versus monitoring by group</h2>
            <p>Within each zone and shift, compare historical and monitoring-period rates without confusing raw traffic growth with stop-rate growth.</p>
          </div>
        </div>
        <div className="insight-table-wrap">
          <table className="insight-table">
            <thead><tr>
              <th scope="col">Zone / shift</th>
              <th scope="col">Baseline rate</th>
              <th scope="col">Monitoring rate</th>
              <th scope="col">Rate ratio</th>
              <th scope="col">Alerts</th>
              <th scope="col">Baseline periods</th>
            </tr></thead>
            <tbody>
              {groups.map(g => (
                <tr key={g.zone + '/' + g.shift}>
                  <th scope="row">{g.zone}<small>{g.shift}</small></th>
                  <td>{numberText(g.baseline.rate)}</td>
                  <td>{numberText(g.monitoring.rate)}</td>
                  <td>{g.ratio === null ? 'N/A' : numberText(g.ratio) + '×'}</td>
                  <td><span className={g.signals ? 'insight-count insight-count--alert' : 'insight-count'}>{g.signals}</span></td>
                  <td>{g.baseline.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="insight-footnote">
          Rates are stops per 1,000 vehicles. The ratio is monitoring rate divided by baseline rate;
          it is descriptive and has no confidence interval or independent hypothesis test.
          Individual alerts come only from the Python u-chart, not the pooled ratio.
        </p>
      </section>
    </div>
  )
}

function downloadLog(results) {
  const csv = evidenceCsv(results)
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'civicwatch-statistical-alerts.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function InvestigationDetails({ results, onInspect }) {
  const alerts = evidenceRows(results)
  const all = results?.observations ?? []
  const synthetic = all.length > 0 && all.every(row => row.source_type === 'synthetic')

  return (
    <div className="insight-stack">
      <section id="civicwatch-investigations" className="insight-section" aria-labelledby="evidence-heading">
        <div className="insight-section__heading">
          <div>
            <span className="insight-eyebrow">FIELD REVIEW</span>
            <h2 id="evidence-heading">4. Statistical signal investigation log</h2>
            <p>Every flagged observation with its underlying counts, historical threshold, and reported context.</p>
          </div>
          <button type="button" className="insight-export" onClick={() => downloadLog(results)}>
            Export alert log (.csv)
          </button>
        </div>
        {synthetic && (
          <p className="insight-demo-note">
            Demonstration data: all records in this upload are synthetic. Zone identifiers,
            enforcement observations, and policy references are fictional.
          </p>
        )}
        {alerts.length === 0 ? (
          <p className="insight-positive">No monitoring observations exceeded their group-specific three-sigma limits. This does not prove the absence of process changes or unlawful activity.</p>
        ) : (
          <div className="insight-alerts">
            {alerts.map((row, i) => {
              const direction = row.signal_direction === 'low' ? 'below the lower' : 'above the upper'
              const limit = row.signal_direction === 'low' ? row.lcl_per_1000 : row.ucl_per_1000
              return (
                <article className="insight-alert" key={row.date + row.zone_id + row.shift + i}>
                  <div className="insight-alert__top">
                    <div>
                      <span className="insight-eyebrow">FLAGGED OBSERVATION · {String(i + 1).padStart(2, '0')}</span>
                      <h3>{row.zone_id} · {row.shift} <span>{row.date}</span></h3>
                    </div>
                    <span className="insight-pill insight-pill--alert">Outside 3σ limits</span>
                  </div>
                  <div className="insight-alert__data">
                    <div><small>Observed stops</small><strong>{countText(row.stops_observed)}</strong></div>
                    <div><small>Traffic exposure</small><strong>{countText(row.vehicles_observed)} vehicles</strong></div>
                    <div><small>Observed rate</small><strong>{numberText(row.rate_per_1000)} / 1k</strong></div>
                    <div><small>Historical center</small><strong>{numberText(row.center_per_1000)} / 1k</strong></div>
                    <div><small>3σ UCL / LCL</small><strong>{numberText(row.ucl_per_1000)} / {numberText(row.lcl_per_1000)}</strong></div>
                    <div><small>Reported authorization</small><strong>{row.authorization_status || 'unknown'}</strong></div>
                    <div><small>Policy reference</small><strong>{row.policy_reference || 'Not provided'}</strong></div>
                    <div><small>Data provenance</small><strong>{row.source_type || 'Unknown'}</strong></div>
                  </div>
                  <p className="insight-alert__interpretation">
                    Observed rate is <strong>{direction}</strong> control limit ({numberText(limit)} stops per 1,000 vehicles).
                    Review data quality, sampling context, and independently verified policy records before deciding on follow-up.
                  </p>
                  <button type="button" className="insight-link-button"
                    onClick={() => onInspect(row.zone_id, row.shift)}>
                    Inspect {row.zone_id} / {row.shift} control chart ↑
                  </button>
                </article>
              )
            })}
          </div>
        )}
        <p className="insight-footnote">
          Authorization fields are unverified, user-supplied context; “outside” is not an automated legal determination.
          Control limits are statistical thresholds, not policy rules, probability statements about wrongdoing, or specification limits.
        </p>
      </section>
      <section id="civicwatch-methods" className="insight-section insight-methods" aria-labelledby="method-heading">
        <span className="insight-eyebrow">SIX SIGMA INTERPRETATION</span>
        <h2 id="method-heading">5. From statistical signal to responsible investigation</h2>
        <div className="insight-steps">
          <div><span>01</span><strong>Validate measurement</strong><p>Confirm the same observation window, vehicle counts, distinct stops, and missing or duplicated records.</p></div>
          <div><span>02</span><strong>Assess the baseline</strong><p>Review dispersion warnings, comparability, possible clustering, and enough stable historical data.</p></div>
          <div><span>03</span><strong>Review the signal</strong><p>Compare exposure-adjusted rates and control limits; distinguish a chance alarm from a sustained shift.</p></div>
          <div><span>04</span><strong>Verify context</strong><p>Seek genuine policy records and qualified legal or community review. Do not infer intent, discrimination, or illegality from this chart.</p></div>
        </div>
        <div className="insight-explainer">
          <strong>Method and scope</strong>
          <p>
            CivicWatch estimates a separate baseline stop rate for each zone and shift,
            then applies a variable-exposure Poisson u-chart with three-sigma limits to
            monitoring observations. When each vehicle could be stopped at most once,
            a binomial p-chart is a related alternative; Poisson is an approximation
            for rare stop events. This prototype does not perform causal attribution,
            demographic disparity analysis, eight Nelson-rule tests, or legal adjudication.
          </p>
        </div>
      </section>
    </div>
  )
}
