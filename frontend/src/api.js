/** The local Vite proxy handles /analyze when VITE_API_BASE is unset.
 *  Production must provide the public Posit Connect API URL at build time.
 */
const API_BASE = (import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '')

export async function analyzeCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    let detail = `Analysis failed (HTTP ${response.status})`
    try {
      const payload = await response.json()
      if (typeof payload.detail === 'string') detail = payload.detail
    } catch {
      // Fall back to the HTTP status for non-JSON errors.
    }
    throw new Error(detail)
  }
  return response.json()
}
