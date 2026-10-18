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
    return r.json();
  }

  const q = req.query;

  if (q.all === "1") {
    const countRes = await tursoExec("SELECT COUNT(*) as total FROM gps_locations");
    const listRes = await tursoExec("SELECT id, device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY id DESC LIMIT 100");
    
    return res.status(200).json({
      debug_count: countRes,
      debug_list: listRes,
      total: countRes.results?.[0]?.rows?.[0],
      rows: listRes.results?.[0]?.rows || []
    });
  }

  if (q.lat && q.lng) {
    const insertRes = await tursoExec("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", [7, parseFloat(q.lat), parseFloat(q.lng), parseFloat(q.velocidad)||0]);
    return res.status(200).json({ ok:true, saved:true, insertDebug: insertRes });
  }

  if (q.init === "1") {
    await tursoExec(`CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER, lat REAL, lng REAL, velocidad REAL, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    return res.status(200).json({ ok:true, message:"creada" });
  }

  return res.status(200).json({ ok:true });
}
