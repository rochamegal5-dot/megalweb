// api/gps.js - Versión simple y estable para Vercel
export default async function handler(req, res) {
  try {
    const TURSO_URL = process.env.TURSO_DATABASE_URL;
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    // Si no hay config, no crashear
    if (!TURSO_URL || !TURSO_TOKEN) {
      return res.status(200).json({ 
        ok: false, 
        error: "Falta TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en Vercel",
        hasUrl: !!TURSO_URL,
        hasToken: !!TURSO_TOKEN,
        env: Object.keys(process.env).filter(k => k.includes('TURSO'))
      });
    }

    const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
    const { device_id, lat, lng, velocidad, all, init } = req.query || {};

    async function tursoExec(sql, args=[]) {
      const r = await fetch(HTTP_URL, { 
        method: "POST", 
        headers: { 
          "Authorization": `Bearer ${TURSO_TOKEN}`, 
          "Content-Type": "application/json" 
        }, 
        body: JSON.stringify({ statements: [{ q: sql, params: args }] }) 
      });
      const text = await r.text();
      try {
        const j = JSON.parse(text);
        if (!r.ok) throw new Error(text);
        return j;
      } catch(e) {
        throw new Error(`Turso error: ${text}`);
      }
    }

    if (init === "1") {
      await tursoExec(`CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, lat REAL, lng REAL, velocidad REAL DEFAULT 0, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await tursoExec(`CREATE INDEX IF NOT EXISTS idx_device_time ON gps_locations(device_id, recorded_at)`);
      await tursoExec(`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, color TEXT DEFAULT '#ef4444', device_id INTEGER DEFAULT 7, activo INTEGER DEFAULT 1)`);
      return res.status(200).json({ ok: true, message: "Tablas gps_locations y repartidores creadas" });
    }

    if (all === "1") {
      const result = await tursoExec("SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY recorded_at DESC LIMIT 100");
      const rows = result.results?.[0]?.rows || [];
      return res.status(200).json(rows);
    }

    if (lat && lng) {
      await tursoExec("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", 
        [parseInt(device_id)||7, parseFloat(lat), parseFloat(lng), parseFloat(velocidad)||0]);
      return res.status(200).json({ ok: true, saved: true });
    }

    return res.status(200).json({ ok: true, message: "API GPS Turso funcionando", usage: "/api/gps?init=1 para crear tablas, /api/gps?all=1 para listar, /api/gps?lat=-34.48&lng=-54.33 para guardar" });

  } catch (e) {
    console.error("API GPS Error:", e);
    return res.status(200).json({ ok: false, error: e.message, stack: e.stack?.substring(0,500) });
  }
}
