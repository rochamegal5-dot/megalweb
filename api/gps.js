// api/gps.js - FINAL FUNCIONANDO
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
  
  async function tursoExec(sql, args=[]) {
    const r = await fetch(HTTP_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ statements: [{ q: sql, params: args }] })
    });
    const j = await r.json();
    // Normalizar: Turso a veces devuelve array, a veces objeto
    const first = Array.isArray(j) ? j[0] : (j.results ? j : { results: j.results || j });
    const resultsObj = first.results || first;
    // resultsObj puede ser array o objeto
    const rowContainer = Array.isArray(resultsObj) ? resultsObj[0] : resultsObj;
    return rowContainer?.rows || rowContainer?.results?.rows || first?.results?.rows || [];
  }

  async function tursoExecRaw(sql, args=[]) {
    const r = await fetch(HTTP_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ statements: [{ q: sql, params: args }] })
    });
    return r.json();
  }

  const q = req.query;

  if (q.all === "1") {
    const raw = await tursoExecRaw("SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY id DESC LIMIT 100");
    // raw es [{"results":{"rows":[[...]]}}]
    let rows = [];
    if (Array.isArray(raw) && raw[0]?.results?.rows) rows = raw[0].results.rows;
    else if (raw.results?.[0]?.rows) rows = raw.results[0].rows;
    else if (raw.results?.rows) rows = raw.results.rows;
    
    return res.status(200).json(rows);
  }

  if (q.lat && q.lng) {
    await tursoExec("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", [7, parseFloat(q.lat), parseFloat(q.lng), parseFloat(q.velocidad)||0]);
    return res.status(200).json({ ok:true, saved:true });
  }

  if (q.init === "1") {
    await tursoExec("CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER, lat REAL, lng REAL, velocidad REAL, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    return res.status(200).json({ ok:true });
  }

  const count = await tursoExec("SELECT COUNT(*) as c FROM gps_locations");
  return res.status(200).json({ ok:true, count: count[0] || count });
}
