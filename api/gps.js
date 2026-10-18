// api/gps.js - Backend Turso (soporta web + APK GasTrack)
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  if (!TURSO_URL || !TURSO_TOKEN) return res.status(500).json({ ok: false, error: "Falta TURSO config" });
  
  const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
  
  // Soporta POST JSON del APK y GET query de la web
  const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
  const query = req.query || {};
  
  const device_id = query.device_id || body.device_id;
  const lat = query.lat || body.lat;
  const lng = query.lng || body.lng || body.longitud;
  const velocidad = query.velocidad || body.velocidad || body.speed || 0;
  const repartidor = body.repartidor || query.repartidor;
  const all = query.all;
  const init = query.init;

  async function tursoExec(sql, args=[]) {
    const r = await fetch(HTTP_URL, { method: "POST", headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ statements: [{ q: sql, params: args }] }) });
    const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j;
  }
  
  try {
    if (init === "1") {
      const creates = [
        `CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, lat REAL, lng REAL, velocidad REAL DEFAULT 0, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE INDEX IF NOT EXISTS idx_device_time ON gps_locations(device_id, recorded_at)`,
        `CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, vehiculo TEXT, patente TEXT, color TEXT DEFAULT '#3b82f6', device_id INTEGER DEFAULT 7, activo INTEGER DEFAULT 1)`,
        `CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, costo INTEGER, precio_venta INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, telefono TEXT, nombre1 TEXT, apellido1 TEXT, depto TEXT, ciudad TEXT, calle TEXT, numero TEXT, latitud REAL, longitud REAL, fiado INTEGER DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS puntos_referencia (id TEXT PRIMARY KEY, nombre TEXT, latitud REAL, longitud REAL, lat REAL, lng REAL, cliente_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, cuit TEXT, telefono TEXT, rubro TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS stock_deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0)`,
        `CREATE TABLE IF NOT EXISTS stock_camioneta (repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, PRIMARY KEY (repartidor_id, producto_id))`,
        `CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, origen TEXT DEFAULT 'web', repartidor_id TEXT, cliente_id TEXT, producto_id TEXT, cantidad_llenas INTEGER DEFAULT 0, total INTEGER DEFAULT 0, metodo_pago TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, tipo TEXT, concepto TEXT, monto INTEGER, fecha DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS marketing (id TEXT PRIMARY KEY, campaña TEXT, canal TEXT, presupuesto INTEGER, leads INTEGER DEFAULT 0, estado TEXT DEFAULT 'Activa', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
        `CREATE TABLE IF NOT EXISTS configuraciones (clave TEXT PRIMARY KEY, valor REAL)`,
        `INSERT OR IGNORE INTO configuraciones (clave, valor) VALUES ('flete_reparto', 150)`
      ];
      for (const sql of creates) await tursoExec(sql);
      return res.status(200).json({ ok: true, message: "Tablas completas creadas (con puntos_referencia)" });
    }
    
    if (all === "1") {
      const id = device_id ? parseInt(device_id) : null;
      const sql = id ? "SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 200" : "SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY recorded_at DESC LIMIT 500";
      const result = await tursoExec(sql, id ? [id] : []);
      const rows = result.results?.[0]?.rows || [];
      return res.status(200).json(rows);
    }
    
    // AQUÍ es donde entra el APK GasTrack (5.3MB) - POST con lat/lng
    if (lat && lng) {
      // Si viene repartidor del APK (Moto-Samsung...), lo usamos como device_id 7 por defecto o guardamos
      const finalDeviceId = parseInt(device_id) || 7;
      await tursoExec("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", [finalDeviceId, parseFloat(lat), parseFloat(lng), parseFloat(velocidad)||0]);
      console.log(`GPS Guardado: ${repartidor || finalDeviceId} - ${lat},${lng} ${velocidad}km/h`);
      return res.status(200).json({ ok: true, saved: { device_id: finalDeviceId, lat, lng, velocidad } });
    }
    
    return res.status(400).json({ ok: false, error: "falta lat/lng" });
  } catch (e) { 
    return res.status(500).json({ ok: false, error: e.message }); 
  }
}
