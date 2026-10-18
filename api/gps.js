// api/gps.js - Turso FINAL - Funciona 100%
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  const HTTP_URL = TURSO_URL.replace("libsql://", "https://");

  async function tursoRaw(sql, args=[]) {
    const r = await fetch(HTTP_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ statements: [{ q: sql, params: args }] })
    });
    return r.json();
  }

  const q = req.query || {};
  let body = {};
  if (req.method === 'POST') {
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch(e){}
  }
  const lat = q.lat || body.lat;
  const lng = q.lng || body.lng;
  const velocidad = q.velocidad || body.velocidad || 0;

  if (q.all === "1") {
    const raw = await tursoRaw("SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY id DESC LIMIT 100");
    let rows = [];
    if (Array.isArray(raw) && raw[0]?.results?.rows) rows = raw[0].results.rows;
    else if (raw.results?.[0]?.rows) rows = raw.results[0].rows;
    else rows = raw.results?.rows || [];
    return res.status(200).json(rows);
  }

  if (lat && lng) {
    await tursoRaw("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", [7, parseFloat(lat), parseFloat(lng), parseFloat(velocidad)||0]);
    return res.status(200).json({ ok:true, saved:true });
  }

  if (q.init === "1") {
    await tursoRaw("CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER, lat REAL, lng REAL, velocidad REAL, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    return res.status(200).json({ ok:true });
  }

  return res.status(200).json({ ok:true, status:"GPS Turso OK" });
}
