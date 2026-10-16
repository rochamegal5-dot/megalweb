import { createClient } from '@libsql/client/web';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  
  try {
    const lat = parseFloat(req.query.lat || '-34.48')
    const lng = parseFloat(req.query.lng || '-54.33')
    const device_id = parseInt(req.query.device_id || '7')

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })

    // Crea tabla si no existe (sin límite de 500MB)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS gps_locations (
        id TEXT PRIMARY KEY,
        device_id INTEGER,
        lat REAL,
        lng REAL,
        recorded_at TEXT
      )
    `)

    const id = Date.now().toString()
    await client.execute({
      sql: 'INSERT INTO gps_locations (id, device_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?, ?)',
      args: [id, device_id, lat, lng, new Date().toISOString()]
    })

    return res.status(200).json({ ok: true, id, device_id, lat, lng })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
