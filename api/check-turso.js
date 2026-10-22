// api/check-turso.js - VERIFICAR TABLAS MEGAL STOCK v3
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  if (!TURSO_URL || !TURSO_TOKEN) return res.status(500).json({error: "Falta TURSO config"});

  async function fetchAll(q){
    const r = await fetch(TURSO_URL,{
      method:"POST",
      headers:{"Authorization":`Bearer ${TURSO_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({statements:[{q}]})
    });
    const data = await r.json();
    const result = data[0]?.results;
    if(!result) return {columns:[], rows:[]};
    const cols=result.columns;
    const rows=result.rows.map(row=>{const obj={};cols.forEach((c,i)=>obj[c]=row[i]);return obj;});
    return rows;
  }

  try {
    const tablas = await fetchAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const productos = await fetchAll("SELECT * FROM productos");
    const deposito = await fetchAll("SELECT d.*, p.nombre FROM stock_deposito d LEFT JOIN productos p ON d.producto_id=p.id");
    const camioneta = await fetchAll("SELECT * FROM stock_camioneta");
    const movimientos = await fetchAll("SELECT COUNT(*) as total FROM movimientos_stock");
    const fraccionadas = await fetchAll("SELECT COUNT(*) as total FROM ventas_fraccionadas");
    const schema_deposito = await fetchAll("PRAGMA table_info(stock_deposito)");
    const schema_mov = await fetchAll("PRAGMA table_info(movimientos_stock)");

    return res.status(200).json({
      ok: true,
      tablas: tablas.map(t=>t.name),
      checks: {
        productos_existen: productos.length>0,
        productos,
        deposito,
        camioneta_count: camioneta.length,
        movimientos_total: movimientos[0]?.total||0,
        fraccionadas_total: fraccionadas[0]?.total||0,
        schema_deposito,
        schema_movimientos: schema_mov,
        // validaciones criticas
        validaciones: {
          productos_4: productos.length>=4,
          tiene_11: productos.some(p=>p.id==='11'),
          tiene_13: productos.some(p=>p.id==='13'),
          tiene_43: productos.some(p=>p.id==='43.5'),
          tiene_45: productos.some(p=>p.id==='45'),
          deposito_tiene_kilos_en_uso: schema_deposito.some(c=>c.name==='kilos_en_uso'),
          deposito_tiene_cambio: schema_deposito.some(c=>c.name==='cambio'),
          movimientos_tiene_hora: schema_mov.some(c=>c.name==='fecha_hora'),
          movimientos_tiene_kilos: schema_mov.some(c=>c.name==='kilos'),
          movimientos_tiene_remito: schema_mov.some(c=>c.name==='remito_entrada'),
        }
      }
    });
  } catch(e) {
    return res.status(500).json({error: e.message});
  }
}

