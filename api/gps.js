// api/gps.js - GasTrack Turso FINAL - No crashea
export default async function handler(req, res) {
  try {
    const TURSO_URL = process.env.TURSO_DATABASE_URL;
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

    if (!TURSO_URL || !TURSO_TOKEN) {
      return res.status(200).json({ ok: false, error: "Falta config TURSO" });
    }

    const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
    const q = req.query || {};
    
    // Soporta GET y POST
    let body = {};
    if (req.method === 'POST') {
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch(e){ body = {}; }
    }
    
    const lat = q.lat || body.lat;
    const lng = q.lng || body.lng || body.longitud;
    const velocidad = q.velocidad || body.velocidad || body.speed || 0;
    const device_id = q.device_id || body.device_id || 7;
    const all = q.all;
    const init = q.init;

    async function tursoExec(sql, args=[]) {
      const r = await fetch(HTTP_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ statements: [{ q: sql, params: args }] })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(JSON.stringify(j));
      return j;
    }

    // Crear tablas
    if (init === "1") {
      await tursoExec(`CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, lat REAL, lng REAL, velocidad REAL DEFAULT 0, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
      await tursoExec(`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, color TEXT DEFAULT '#ef4444', device_id INTEGER DEFAULT 7, activo INTEGER DEFAULT 1)`);
      return res.status(200).json({ ok: true, message: "Tablas creadas" });
    }

    // Listar - FIX para rows vacíos
    if (all === "1") {
      const result = await tursoExec(`SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY recorded_at DESC LIMIT 100`);
      // Turso puede devolver 2 formatos, normalizamos
      let rows = result.results?.[0]?.rows || [];
      // Si rows son objetos, convertir a array [device_id, lat, lng, velocidad, recorded_at]
      const normalized = rows.map(r => {
        if (Array.isArray(r)) return r;
        return [r.device_id || r[0], r.lat || r[1], r.lng || r[2], r.velocidad || r[3], r.recorded_at || r[4]];
      });
      return res.status(200).json(normalized);
    }

    // Guardar
    if (lat && lng) {
      const result = await tursoExec(
        `INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)`,
        [parseInt(device_id)||7, parseFloat(lat), parseFloat(lng), parseFloat(velocidad)||0]
      );
      return res.status(200).json({ ok: true, saved: true });
    }

    return res.status(200).json({ ok: true, msg: "API GPS lista", use: "?init=1 | ?all=1 | ?lat=&lng=" });

  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
