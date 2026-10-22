// api/check-turso.js - VERIFICAR TABLAS MEGAL STOCK v3
export default async function handler(req, res) {
  const TURSO_RAW = process.env.TURSO_DATABASE_URL;
  const TURSO_URL = TURSO_RAW ? TURSO_RAW.replace('libsql://', 'https://') : null;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  if (!TURSO_URL || !TURSO_TOKEN) return res.status(500).json({error: "Falta TURSO config", raw: !!TURSO_RAW});

  async function fetchAll(q){
    const r = await fetch(TURSO_URL,{
      method:"POST",
      headers:{"Authorization":`Bearer ${TURSO_TOKEN}`,"Content-Type":"application/json"},
      body:JSON.stringify({statements:[{q}]})
    });
    if(!r.ok){ const txt=await r.text(); throw new Error(`Turso ${r.status}: ${txt}`); }
    const data = await r.json();
    const result = data[0]?.results;
    if(!result) return [];
    const cols=result.columns;
    return result.rows.map(row=>{const obj={};cols.forEach((c,i)=>obj[c]=row[i]);return obj;});
  }

  try {
    const tablas = await fetchAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const productos = await fetchAll("SELECT * FROM productos");
    const deposito = await fetchAll("SELECT * FROM stock_deposito");
    const schema_deposito = await fetchAll("PRAGMA table_info(stock_deposito)");
    const schema_mov = await fetchAll("PRAGMA table_info(movimientos_stock)");
    
    return res.status(200).json({
      ok: true,
      url_convertida: TURSO_URL.substring(0,30)+"...",
      tablas: tablas.map(t=>t.name),
      productos,
      deposito,
      validaciones: {
        tiene_kilos_en_uso: schema_deposito.some(c=>c.name==='kilos_en_uso'),
        tiene_cambio: schema_deposito.some(c=>c.name==='cambio'),
        tiene_kilos_mov: schema_mov.some(c=>c.name==='kilos'),
        tiene_remito: schema_mov.some(c=>c.name==='remito_entrada'),
      },
      schema_deposito,
      schema_movimientos: schema_mov
    });
  } catch(e) {
    return res.status(500).json({error: e.message, stack: e.stack});
  }
}
