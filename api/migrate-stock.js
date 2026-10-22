// api/migrate-stock.js - MIGRA STOCK VIEJO A V3
export default async function handler(req, res) {
  const TURSO_RAW = process.env.TURSO_DATABASE_URL;
  const TURSO_URL = TURSO_RAW ? TURSO_RAW.replace('libsql://', 'https://') : null;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  if (!TURSO_URL || !TURSO_TOKEN) return res.status(500).json({error: "Falta config"});

  async function exec(q){
    const r = await fetch(TURSO_URL,{
      method:"POST",
      headers:{"Authorization":`Bearer ${TURSO_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({statements:[{q}]})
    });
    const data = await r.json();
    if(data[0]?.error) throw new Error(data[0].error);
    return data;
  }

  const migraciones = [
    "ALTER TABLE stock_deposito ADD COLUMN cambio INTEGER DEFAULT 0",
    "ALTER TABLE stock_deposito ADD COLUMN kilos_en_uso REAL DEFAULT 0",
    "ALTER TABLE stock_deposito ADD COLUMN tubo_en_uso_id TEXT",
    "ALTER TABLE stock_camioneta ADD COLUMN cambio INTEGER DEFAULT 0",
    "ALTER TABLE productos ADD COLUMN permite_completo INTEGER DEFAULT 0",
    "ALTER TABLE productos ADD COLUMN es_fraccionado INTEGER DEFAULT 0",
    "CREATE TABLE IF NOT EXISTS movimientos_stock (id TEXT PRIMARY KEY, fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, tipo TEXT, origen TEXT, destino TEXT, repartidor_id TEXT, producto_id TEXT, cantidad INTEGER DEFAULT 0, kilos REAL DEFAULT 0, modalidad TEXT, remito_entrada TEXT, remito_salida TEXT, proveedor_id TEXT, detalle TEXT)",
    "CREATE TABLE IF NOT EXISTS ventas_fraccionadas (id TEXT PRIMARY KEY, fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, tubo_id TEXT, kilos REAL, cliente_nombre TEXT, precio_por_kilo INTEGER, total INTEGER, repartidor_id TEXT DEFAULT 'mostrador')",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('11', 'Garrafa 11kg', 'garrafa', 1, 0)",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('13', 'Garrafa 13kg', 'garrafa', 1, 0)",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('43.5', 'Tubo 43.5kg', 'tubo', 0, 1)",
    "INSERT OR IGNORE INTO productos (id, nombre, tipo, permite_completo, es_fraccionado) VALUES ('45', 'Tubo 45kg', 'tubo', 0, 0)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES ('11', 10, 15, 1, 0)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES ('13', 20, 25, 2, 0)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES ('43.5', 5, 8, 1, 43.5)",
    "INSERT OR IGNORE INTO stock_deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES ('45', 8, 5, 0, 0)"
  ];

  for(const q of migraciones){
    try{ await exec(q); }catch(e){ console.log("ignorado", q.substring(0,30), e.message); }
  }

  return res.status(200).json({ok: true, message: "Migracion OK - ahora verifica /api/check-turso"});
}
