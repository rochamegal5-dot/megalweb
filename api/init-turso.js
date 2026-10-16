// api/init-turso.js - Crea todas las tablas sin usar el dashboard de Turso
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(500).json({ ok: false, error: "Falta TURSO_DATABASE_URL / AUTH_TOKEN en Vercel" });
  }

  const statements = [
    "CREATE TABLE IF NOT EXISTS gps_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, lat REAL, lng REAL, velocidad REAL DEFAULT 0, recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE INDEX IF NOT EXISTS idx_device_time ON gps_locations(device_id, recorded_at)",
    "CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, vehiculo TEXT, patente TEXT, color TEXT DEFAULT '#3b82f6', device_id INTEGER DEFAULT 7, activo INTEGER DEFAULT 1)",
    "CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, costo INTEGER, precio_venta INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, telefono TEXT, nombre1 TEXT, apellido1 TEXT, depto TEXT, ciudad TEXT, calle TEXT, numero TEXT, latitud REAL, longitud REAL, fiado INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, cuit TEXT, telefono TEXT)",
    "CREATE TABLE IF NOT EXISTS stock_deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS stock_camioneta (repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, PRIMARY KEY (repartidor_id, producto_id))",
    "CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, origen TEXT DEFAULT 'web', tipo_venta TEXT, repartidor_id TEXT, cliente_id TEXT, producto_id TEXT, cantidad_llenas INTEGER DEFAULT 0, cantidad_vacias INTEGER DEFAULT 0, cantidad_defectuosas INTEGER DEFAULT 0, kilos_recarga REAL DEFAULT 0, total INTEGER DEFAULT 0, metodo_pago TEXT, estado TEXT DEFAULT 'Cobrado', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS puntos_ruta (id TEXT PRIMARY KEY, nombre TEXT, latitud REAL, longitud REAL, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS configuraciones (clave TEXT PRIMARY KEY, valor REAL)",
    "INSERT OR IGNORE INTO configuraciones (clave, valor) VALUES ('flete_reparto', 150)"
  ];

  try {
    // Turso HTTP API
    const body = { statements: statements.map(q => ({ q })) };
    
    const r = await fetch(TURSO_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TURSO_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({ ok: false, error: "Turso error", details: data });
    }

    return res.status(200).json({ ok: true, message: "Tablas creadas correctamente en Turso", result: data });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
