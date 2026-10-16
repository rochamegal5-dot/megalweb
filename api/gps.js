// /api/gps.js - FINAL CON TURSO - maneja GPS + INIT
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(500).json({ ok: false, error: "Falta TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en Vercel" });
  }

  const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
  const { device_id, lat, lng, velocidad, all, init } = req.query;

  async function tursoExec(sql, args = []) {
    const resp = await fetch(HTTP_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TURSO_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        statements: [{ q: sql, params: args }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(JSON.stringify(data));
    }
    return data;
  }

  try {
    // --- INIT: crea todas las tablas ---
    if (init === "1") {
      const creates = [
        `CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, lat REAL, lng REAL, velocidad REAL DEFAULT 0, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE INDEX IF NOT EXISTS idx_device_time ON gps_locations(device_id, recorded_at)`,
        `CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, vehiculo TEXT, patente TEXT, color TEXT DEFAULT '#3b82f6', device_id INTEGER DEFAULT 7, activo INTEGER DEFAULT 1)`,
        `CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, costo INTEGER, precio_venta INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, telefono TEXT, nombre1 TEXT, apellido1 TEXT, depto TEXT, ciudad TEXT, calle TEXT, numero TEXT, latitud REAL, longitud REAL, fiado INTEGER DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS stock_deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS stock_camioneta (repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, PRIMARY KEY (repartidor_id, producto_id))`,
        `CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, origen TEXT DEFAULT 'web', repartidor_id TEXT, cliente_id TEXT, producto_id TEXT, cantidad_llenas INTEGER DEFAULT 0, total INTEGER DEFAULT 0, metodo_pago TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS configuraciones (clave TEXT PRIMARY KEY, valor REAL)`,
        `INSERT OR IGNORE INTO configuraciones (clave, valor) VALUES ('flete_reparto', 150)`
      ];
      for (const sql of creates) {
        await tursoExec(sql);
      }
      return res.status(200).json({ ok: true, message: "Tablas creadas correctamente en megal-erp" });
    }

    // --- GET ALL ---
    if (all === "1") {
      const id = device_id ? parseInt(device_id) : null;
      const sql = id
        ? "SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 100"
        : "SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY recorded_at DESC LIMIT 200";
      const result = await tursoExec(sql, id ? [id] : []);
      const rows = result.results?.[0]?.rows || result.results?.[0]?.response?.result?.rows || [];
      // Normalizar formato
      const data = Array.isArray(rows) ? rows.map(r => Array.isArray(r) ? { device_id: r[0], lat: r[1], lng: r[2], velocidad: r[3], recorded_at: r[4] } : r) : [];
      return res.status(200).json(data.length ? data : rows);
    }

    // --- INSERT GPS ---
    if (lat && lng) {
      const dId = parseInt(device_id) || 7;
      const vel = parseFloat(velocidad) || 0;
      await tursoExec("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", [dId, parseFloat(lat), parseFloat(lng), vel]);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "falta lat/lng o all=1 o init=1" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

