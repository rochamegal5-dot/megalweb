import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Faltan ENV VITE_SUPABASE_URL o SERVICE_ROLE_KEY en Vercel')

    const supabase = createClient(url, key)
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || req.query)
    
    const device_id = parseInt(body.device_id || body.repartidor_id || 7)
    const lat = parseFloat(body.lat || body.latitud)
    const lng = parseFloat(body.lng || body.longitud)

    if (!lat || !lng) return res.status(400).json({ error: 'Falta lat/lng' })

    const { data, error } = await supabase
      .from('gps_locations')
      .insert({
        device_id,
        lat,
        lng,
        speed: 0,
        accuracy: 10,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return res.status(200).json({ ok: true, data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
