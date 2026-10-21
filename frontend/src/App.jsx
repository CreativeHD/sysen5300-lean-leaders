import Plot from 'react-plotly.js'
import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { analyzeCsv } from './api'
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

  // Monitoring alerts are observations outside control limits
  const alerts = observations.filter(
    row => row.phase === 'monitoring' && row.signal
  )

  const sdData = [...new Set(observations.map(row => row.zone_id))]
  .map(zone => {
    const rates = observations
      .filter(row =>
        row.zone_id === zone &&
        row.phase === 'monitoring' &&
        row.vehicles_observed > 0
      )
      .map(row => row.rate_per_1000)

      const mean = rates.reduce((a, b) => a + b, 0) / rates.length

    const sd = rates.length > 1
      ? Math.sqrt(
          rates.reduce((sum, rate) => sum + (rate - mean) ** 2, 0)
          / (rates.length - 1)
        )
      : 0

    return { zone, sd }
  })

  // Select the observations for one zone and shift
  const chartData = observations
    .filter(row => row.zone_id === zone && row.shift === shift)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="container">
      <header>
        <h1>CivicWatch</h1>
        <p>Six Sigma Statistical Process Control Dashboard</p>
      </header>

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

      {results && (
        <>
          <section>
            <h2>2. Summary Results</h2>
            <div className="summary">
              <div>
                <h3>{observations.length}</h3>
                <p>Total Observations</p>
              </div>
              <div>
                <h3>{groups.length}</h3>
                <p>Groups Analyzed</p>
              </div>
              <div>
                <h3>{alerts.length}</h3>
                <p>Monitoring Alerts</p>
              </div>
            </div>
          </section>

          <section>
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
              <h2>Monitoring Alerts by Zone</h2>
              <p>Number of Monitoring Observations Outside Statistical Control Limits.</p>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={zoneData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="alerts" name="Alerts" fill="#d97745" />
                </BarChart>
              </ResponsiveContainer>
            </section>

            <section>
              <h2>Standard Deviation by Zone</h2>
              <p>Variation in Monitoring Stop Rates per 1,000 Vehicles.</p>

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

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" minTickGap={20} />
                <YAxis />
                <Tooltip />
                <Legend />

                <Line
                  dataKey="rate_per_1000"
                  name="Observed Rate"
                  stroke="#2d6a4f"
                  dot={false}
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
          </section>

          <section>
            <h2>4. Monitoring Alerts</h2>

            {alerts.length === 0 ? (
              <p>No monitoring alerts detected.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Zone</th>
                    <th>Shift</th>
                    <th>Stop Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((row, i) => (
                    <tr key={i}>
                      <td>{row.date}</td>
                      <td>{row.zone_id}</td>
                      <td>{row.shift}</td>
                      <td>{row.rate_per_1000.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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