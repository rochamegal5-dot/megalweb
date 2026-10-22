// api/init-turso.js - MEGAL STOCK COMPLETO v3
// Tablas para control total de stock con proveedor y fraccionado 43.5

export default async function handler(req, res) {
  const TURSO_RAW = process.env.TURSO_DATABASE_URL;
  const TURSO_URL = TURSO_RAW ? TURSO_RAW.replace('libsql://', 'https://') : null;
  
   if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(500).json({ ok: false, error: "Falta TURSO_DATABASE_URL / AUTH_TOKEN en Vercel" });
  }

  const statements = [
    // PRODUCTOS base (actualizado)
    "CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, costo INTEGER, precio_venta INTEGER, permite_completo INTEGER DEFAULT 0, es_fraccionado INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    
    // STOCK DEPOSITO - con soporte 43.5 en uso
    "CREATE TABLE IF NOT EXISTS stock_deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0, cambio INTEGER DEFAULT 0, kilos_en_uso REAL DEFAULT 0, tubo_en_uso_id TEXT, FOREIGN KEY(producto_id) REFERENCES productos(id))",
    
    // STOCK CAMIONETA - Antonio / Jose con hora
    "CREATE TABLE IF NOT EXISTS stock_camioneta (repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, cambio INTEGER DEFAULT 0, PRIMARY KEY (repartidor_id, producto_id))",
    
    // MOVIMIENTOS STOCK - TODO auditado con hora de carga fundamental
    "CREATE TABLE IF NOT EXISTS movimientos_stock (id TEXT PRIMARY KEY, fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, tipo TEXT NOT NULL, origen TEXT, destino TEXT, repartidor_id TEXT, producto_id TEXT, cantidad INTEGER DEFAULT 0, kilos REAL DEFAULT 0, modalidad TEXT, remito_entrada TEXT, remito_salida TEXT, proveedor_id TEXT, detalle TEXT, usuario TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    
    // TUBO 43.5 EN USO - control fraccionado
    "CREATE TABLE IF NOT EXISTS tubo_fraccionado_en_uso (id TEXT PRIMARY KEY, producto_id TEXT DEFAULT '43.5', kilos_restantes REAL DEFAULT 43.5, kilos_vendidos REAL DEFAULT 0, estado TEXT DEFAULT 'EN_USO', fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP, fecha_cierre DATETIME)",
    
    // HISTORIAL FRACCIONADO 43.5 - venta por kilos
    "CREATE TABLE IF NOT EXISTS ventas_fraccionadas (id TEXT PRIMARY KEY, fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, tubo_id TEXT, kilos REAL, cliente_nombre TEXT, precio_por_kilo INTEGER, total INTEGER, repartidor_id TEXT DEFAULT 'mostrador')",
    
    // PROVEEDOR REMITOS
    "CREATE TABLE IF NOT EXISTS remitos_proveedor (id TEXT PRIMARY KEY, tipo TEXT, numero TEXT, proveedor_id TEXT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, productos_json TEXT, total_envases INTEGER DEFAULT 0)",
    
    // TABLAS EXISTENTES - asegurar
    "CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, vehiculo TEXT, patente TEXT, color TEXT DEFAULT '#3b82f6', device_id INTEGER DEFAULT 7, activo INTEGER DEFAULT 1)",
    "CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, cuit TEXT, telefono TEXT)",
    "CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, origen TEXT DEFAULT 'web', tipo_venta TEXT, repartidor_id TEXT, cliente_id TEXT, producto_id TEXT, cantidad_llenas INTEGER DEFAULT 0, cantidad_vacias INTEGER DEFAULT 0, cantidad_defectuosas INTEGER DEFAULT 0, kilos_recarga REAL DEFAULT 0, total INTEGER DEFAULT 0, metodo_pago TEXT, estado TEXT DEFAULT 'Cobrado', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",

    // INDICES
    "CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos_stock(fecha_hora)",
    "CREATE INDEX IF NOT EXISTS idx_mov_tipo ON movimientos_stock(tipo)",
    "CREATE INDEX IF NOT EXISTS idx_mov_repartidor ON movimientos_stock(repartidor_id)",
    "CREATE INDEX IF NOT EXISTS idx_fraccionado_fecha ON ventas_fraccionadas(fecha_hora)",

    // PRODUCTOS INICIALES MEGAL
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('11', 'Garrafa 11kg', 'garrafa', 1, 0)",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('13', 'Garrafa 13kg', 'garrafa', 1, 0)",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('43.5', 'Tubo 43.5kg', 'tubo', 0, 1)",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('45', 'Tubo 45kg', 'tubo', 0, 0)",

    // STOCK INICIAL DEPOSITO
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio) VALUES ('11', 10, 15, 1)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES ('13', 20, 25, 2, 0)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES ('43.5', 5, 8, 1, 30)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio) VALUES ('45', 8, 5, 0)",

    // REPARTIDORES
    "INSERT OR IGNORE INTO repartidores (id, nombre, color) VALUES ('antonio', 'Antonio', '#3b82f6')",
    "INSERT OR IGNORE INTO repartidores (id, nombre, color) VALUES ('jose', 'Jose', '#10b981')"
  ];

  try {
    const body = { statements: statements.map(q => ({ q })) };
    const r = await fetch(TURSO_URL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ ok: false, error: "Turso error", details: data });
    return res.status(200).json({ ok: true, message: "Stock MEGAL v3 creado - 4 productos + fraccionado + proveedor", result: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
