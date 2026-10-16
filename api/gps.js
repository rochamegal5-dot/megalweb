export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const TURSO_URL = process.env.TURSO_DATABASE_URL.replace('libsql://', 'https://');
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    const lat = parseFloat(req.query.lat || '-34.48');
    const lng = parseFloat(req.query.lng || '-54.33');
    const device_id = parseInt(req.query.device_id || '7');

    // 1. Crear tabla
    await fetch(`${TURSO_URL}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, device_id INTEGER, lat REAL, lng REAL, recorded_at TEXT)' } }]
      })
    });

    // 2. Insertar
    if (!req.query.all) {
      const id = Date.now().toString();
      await fetch(`${TURSO_URL}/v2/pipeline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ type: 'execute', stmt: { sql: 'INSERT INTO gps_locations VALUES (?,?,?,?,?)', args: [{ type: 'text', value: id }, { type: 'integer', value: device_id.toString() }, { type: 'float', value: lat.toString() }, { type: 'float', value: lng.toString() }, { type: 'text', value: new Date().toISOString() }] } }]
        })
      });
    }

    // 3. Devolver JSON completo
    const r = await fetch(`${TURSO_URL}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ type: 'execute', stmt: { sql: 'SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 1000' } }]
      })
    });

    const j = await r.json();
    const rows = j.results?.[0]?.response?.result?.rows || [];

    // Convertir rows de Turso a JSON legible
    const data = rows.map(row => {
      const obj = {};
      j.results[0].response.result.cols.forEach((c, i) => {
        obj[c.name] = row[i]?.value;
      });
      return obj;
    });

    return res.status(200).json({ ok: true, total: data.length, data });

  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.toString() });
  }
}
