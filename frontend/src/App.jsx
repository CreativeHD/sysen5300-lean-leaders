import Plot from 'react-plotly.js'
import { useState, Fragment } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { analyzeCsv } from './api'
import { OverviewInsights, InvestigationDetails } from './Insights'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [zone, setZone] = useState('Zone_A')
  const [shift, setShift] = useState('evening')

  async function analyze() {
    if (!file) return

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const data = await analyzeCsv(file)
      setResults(data)
      setZone(data.groups[0].zone_id)
      setShift(data.groups[0].shift)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const observations = results?.observations || []
  const groups = results?.groups || []
  const zoneData = [...new Set(observations.map(row => row.zone_id))]
.map(zone => {
  const rows = observations.filter(row => row.zone_id === zone)
   const rate = phase => {
    const data = rows.filter(row => row.phase === phase)
    const stops = data.reduce((sum, row) => sum + row.stops_observed, 0)
    const vehicles = data.reduce((sum, row) => sum + row.vehicles_observed, 0)
    return vehicles ? (stops/vehicles) * 1000 : 0
   }
   return {
    zone,
    rate: rate('monitoring'),
    baseline: rate('baseline'),
    monitoring: rate('monitoring'),
    alerts: rows.filter(row => row.phase === 'monitoring' && row.signal).length
   }
  })

 
  const alerts = observations.filter(
    row => row.phase === 'monitoring' && row.signal
  )

const zones = [...new Set(observations.map(row => row.zone_id))]
  const shifts = [...new Set(observations.map(row => row.shift))]

  const alertCount = (zone, shift) =>
    alerts.filter(row => row.zone_id === zone && row.shift === shift).length

  const maxAlerts = Math.max(1, ...zones.flatMap(zone =>
    shifts.map(shift => alertCount(zone, shift))
  ))



  const chartData = observations
    .filter(row => row.zone_id === zone && row.shift === shift)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="container">
      <header className="civic-hero">
        <div className="civic-hero__eyebrow">CIVICWATCH / COMMUNITY OBSERVATION INTELLIGENCE</div>
        <h1>Traffic enforcement, examined with evidence.</h1>
        <p>Explore field-observed stop rates, identify statistical anomalies, and document observations that deserve a closer look.</p>
        <div className="civic-hero__tags">
          <span>Poisson u-chart</span><span>Traffic-adjusted rates</span><span>Six Sigma SPC</span>
        </div>
        <p className="civic-hero__note">Statistical signals are not evidence of unlawful enforcement or discrimination.</p>
      </header>
      
      <div className="dashboard-row">
      <section className="workflow">
        <h2>How CivicWatch Works</h2>
        <p>
          1. Upload - Provide Traffic Observation and Enforcement Data.
        </p>
        <p>
          2. Analyze - Explore Enforcement Rates and Detect Unusual Patterns.
        </p>
        <p>
          3. Review - Identify Observations That May Need Further Review.
        </p>
      </section>

      <section>
        <h2>1. Upload Dataset</h2>
        <input
          type="file"
          accept=".csv"
          onChange={e => {
            setFile(e.target.files[0])
            setResults(null)
            setError('')
          }}
        />
        <button onClick={analyze} disabled={!file || loading}>
          {loading ? 'Analyzing...' : 'Analyze Dataset'}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </section>
      </div>

      {results && (
        <>
          <OverviewInsights results={results} />

          <section id="civicwatch-control-chart">
            <h2>3. Control Chart</h2>
            <p>Stop rates per 1,000 vehicles</p>

            <select value={zone} onChange={e => setZone(e.target.value)}>
              {[...new Set(groups.map(g => g.zone_id))].map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>

            <select value={shift} onChange={e => setShift(e.target.value)}>
              {[...new Set(groups.map(g => g.shift))].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={20} />
                <YAxis />
                <Tooltip />
                <Legend />
                {chartData.some(row => row.phase === 'monitoring') && (
                  <ReferenceLine
                    x={chartData.find(row => row.phase === 'monitoring').date}
                    stroke="#b38b55"
                    strokeDasharray="5 5"
                    label={{ value: 'Monitoring starts', position: 'insideTopRight', fill: '#87663d', fontSize: 11 }}
                  />
                )}

                <Line
                  dataKey="rate_per_1000"
                  name="Observed Rate"
                  stroke="#2d6a4f"
                  dot={props => props.payload?.signal ? (
                    <circle cx={props.cx} cy={props.cy} r={5} fill="#b9563e" stroke="#fff" strokeWidth={2} />
                  ) : null}
                  activeDot={{ r: 6 }}
                />
                <Line
                  dataKey="center_per_1000"
                  name="Center Line"
                  stroke="#74a892"
                  dot={false}
                />
                <Line
                  dataKey="ucl_per_1000"
                  name="UCL"
                  stroke="#d97745"
                  dot={false}
                />
                <Line
                  dataKey="lcl_per_1000"
                  name="LCL"
                  stroke="#8a9a5b"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="chart-note">
              The dashed vertical line marks the start of monitoring; orange dots mark observations flagged by
              the Python three-sigma u-chart. Limits change with vehicle exposure, and a signal is not proof of misconduct.
            </p>
          </section>

<div className="dashboard-row">
            <section>
              <h2>Enforcement Rates by Zone</h2>
              <p>Monitoring Period Stops per 1,000 Observed Vehicles.</p>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={zoneData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis />
                  <Tooltip formatter={value => Number(value).toFixed(2)} />
                  <Bar dataKey="rate" name="Stop Rate" fill="#2d6a4f" />
                </BarChart>
              </ResponsiveContainer>
            </section>
            
            <section>
              <h2>Monitoring Alerts by Zone and Shift</h2>
              <p>Number of Statistical Alerts Detected During the Monitoring Period.</p>

              <div
              className="heatmap"
              style={{
                gridTemplateColumns: `100px repeat(${shifts.length},minmax(70px, 1fr))`
              }}
              >
                <span></span>

                {shifts.map(shift => (
                  <strong key={shift}>{shift}</strong>
                 ))}

                 {zones.map(zone => (
                  <Fragment key={zone}>
                    <strong>{zone}</strong>

                    {shifts.map(shift => {
                      const count = alertCount(zone, shift)
                      const high = count > 0 && count / maxAlerts > 0.5

                      return(
                        <div
                          key={shift}
                          className="heatmap-cell"
                          style={{
                            background: count === 0 ? '#E9EEE6' :
                              high ? '#A64E32' : '#D9AD7B',
                            color: high ? '#FFFFFF' : '#183C32'
                          }}
                          title={`${zone} / ${shift}: ${count} alerts`}
                        >
                          {count}
                        </div>
                      )
                    })}
                  </Fragment>
                 ))}
              </div>

              <p className="heatmap-note">
                Darker colors indicate more statistical alerts, not evidence of misconduct.
              </p>
            </section>
            </div>

            <section>
              <h2>Distribution of Monitoring Rates by Zone</h2>
              <p>Box-and-whisker distribution of monitoring stop rates per 1,000 vehicles.</p>

              <Plot
                data={[...new Set(observations.map(row => row.zone_id))].map(zone => ({
                  y: observations
                    .filter(row => row.zone_id === zone && row.phase === 'monitoring' && row.vehicles_observed > 0)
                    .map(row => row.rate_per_1000),
                  type: 'box',
                  name: zone,
                  marker: { color: '#40916c' },
                  boxpoints: 'outliers'
                }))}
                layout={{
                  height: 350,
                  yaxis: { title: 'Stops per 1,000 vehicles' },
                  showlegend: false
                }}
                style={{ width: '100%' }}
                useResizeHandler
              />
            </section>

          <InvestigationDetails
            results={results}
            onInspect={(nextZone, nextShift) => {
              setZone(nextZone)
              setShift(nextShift)
              document.getElementById('civicwatch-control-chart')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              })
            }}
          />

          <section className="next-steps">
            <h2>6. Recommended Next Steps</h2>
            {alerts.length > 0 ? (
              <>
                <p>
                  Unusual enforcement patterns were detected. 
                  Consider the following actions:
                  </p>
                <ol>
                  <li>Review flagged dates, zones, and shifts.</li>
                  <li>Verify traffic counts and enforcement data.</li>
                  <li>Compare findings with available policy or operational context.</li>
                  <li>Document findings and determine if further investigation is needed.</li>
                </ol>
              </>
            ) : (
              <p>
                No unusual patterns were flagged.
              </p>
            )}

            <p className="next-steps-note">
                Statistical alerts are screening signals, not confirmation of a special cause or proof of misconduct.
            </p>
                  </section>
                </>
              )}

              <footer>
                <p>
          Statistical alerts indicate unusual process variation,
          not proof of unlawful enforcement.
        </p>
      </footer>
    </div>
  )
}

export default App