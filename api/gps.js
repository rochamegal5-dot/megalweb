export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const TURSO_URL = process.env.TURSO_DATABASE_URL.replace('libsql://', 'https://');
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    const callTurso = async (sql) => {
      const r = await fetch(`${TURSO_URL}/v2/pipeline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql } }] })
      });
      return r.json();
    };

    // Crear tabla
    await callTurso('CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, device_id INTEGER, lat REAL, lng REAL, recorded_at TEXT)');

    // INSERTA SIEMPRE que haya lat/lng
    const hasCoords = req.query.lat && req.query.lng;
    if (hasCoords) {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const device_id = parseInt(req.query.device_id || '7');
      const id = Date.now().toString();
      const now = new Date().toISOString();
      await callTurso(`INSERT INTO gps_locations VALUES ('${id}', ${device_id}, ${lat}, ${lng}, '${now}')`);
    }

    // Devuelve TODO
    const j = await callTurso('SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 1000');
    const result = j.results?.[0]?.response?.result;
    const cols = result?.cols || [];
    const rows = result?.rows || [];
    
    const data = rows.map(row => {
      const o = {};
      cols.forEach((c, i) => o[c.name] = row[i]?.value);
      return o;
    });

    return res.status(200).json({ ok: true, total: data.length, data, inserted: hasCoords });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
