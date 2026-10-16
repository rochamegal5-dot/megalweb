import { createClient } from '@libsql/client';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const lat = parseFloat(req.query.lat || '-34.48');
    const lng = parseFloat(req.query.lng || '-54.33');
    const device_id = parseInt(req.query.device_id || '7');

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    await client.execute(`
      CREATE TABLE IF NOT EXISTS gps_locations (
        id TEXT PRIMARY KEY,
        device_id INTEGER,
        lat REAL,
        lng REAL,
        recorded_at TEXT
      )
    `);

    const id = Date.now().toString();
    await client.execute({
      sql: 'INSERT INTO gps_locations VALUES (?,?,?,?,?)',
      args: [id, device_id, lat, lng, new Date().toISOString()]
    });

    const rs = await client.execute('SELECT COUNT(*) as c FROM gps_locations');

    return res.status(200).json({ ok: true, id, total: rs.rows[0].c });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.toString() });
  }
}
