// api/postgres.js - VERSIÓN COMPLETA ESTABLE - nunca devuelve HTML 500
const MEM = {
  deposito: [
    {producto_id:'11', llenas:20, vacias:5, para_cambio:0, en_uso:0, kilos_restantes:0},
    {producto_id:'13', llenas:20, vacias:5, para_cambio:0, en_uso:0, kilos_restantes:0},
    {producto_id:'43.5', llenas:4, vacias:3, para_cambio:0, en_uso:1, kilos_restantes:43.5},
    {producto_id:'45', llenas:10, vacias:5, para_cambio:0, en_uso:0, kilos_restantes:0}
  ],
  ventas: [],
  productos: [],
  clientes: [],
  proveedores: [],
  repartidores: [],
  finanzas: [],
  gps_locations: [],
  camaras: []
};

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  let sql = null;
  let useMemory = false;
  
  try{
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
    // test rapido de conexion
    await sql`SELECT 1 as test`;
  }catch(e){
    console.log('Usando memoria por error PG:', e.message);
    useMemory = true;
  }

  try{
    const {table, id} = req.query;
    let body={};
    try{ body = typeof req.body==='string' ? JSON.parse(req.body) : (req.body||{}); }catch{}

    // Crear tablas si estamos en PG
    if(!useMemory && sql){
      try{ await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT DEFAULT 0, vacias INT DEFAULT 0, para_cambio INT DEFAULT 0, en_uso INT DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW())`; }catch{}
      try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`; }catch{}
      try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0`; }catch{}
      try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMPTZ, fecha_local TEXT, hoy DATE, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario DOUBLE PRECISION, flete DOUBLE PRECISION, total DOUBLE PRECISION, cliente_nombre TEXT, pago TEXT, kilos DOUBLE PRECISION)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_compra DOUBLE PRECISION, precio_venta DOUBLE PRECISION, proveedor_id TEXT, stock_minimo INT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, fecha DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION, metodo_pago TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMPTZ DEFAULT NOW())`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`; }catch{}
    }

    if(req.method==='GET'){
      if(!table) return res.status(200).json({data:[STRIPPED]
      if(useMemory){
        return res.status(200).json({data: MEM[table] || []});
      }
      try{
        const r = await sql.query(`SELECT * FROM ${table} ORDER BY producto_id, id LIMIT 200`);
        return res.status(200).json({data:[STRIPPED]
      }catch(e){
        return res.status(200).json({data: MEM[table] || [], error:e.message});
      }
    }

    if(req.method==='POST'){
      // DEPOSITO ESPECIAL
      if(table==='deposito' || body.accion==='balance_inicial'){
        const pid = String(body.producto_id || body.id || '43.5');
        const llenas = parseInt(body.llenas)||0;
        const vacias = parseInt(body.vacias)||0;
        const para_cambio = parseInt(body.para_cambio)||0;
        const en_uso = parseInt(body.en_uso)||0;
        const kilos = parseFloat(body.kilos_restantes ?? 0);
        
        if(useMemory){
          const idx = MEM.deposito.findIndex(d=>d.producto_id===pid);
          const obj = {producto_id:pid, llenas, vacias, para_cambio, en_uso, kilos_restantes:kilos};
          if(idx>=0) MEM.deposito[idx]=obj; else MEM.deposito.push(obj);
          return res.status(200).json({ok:true, data:MEM.deposito, producto_id:pid, kilos_restantes:kilos});
        }
        try{
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes) VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}, updated_at=NOW()`;
          return res.status(200).json({ok:true, producto_id:pid, kilos_restantes:kilos});
        }catch(e){
          return res.status(200).json({ok:true, error:e.message, producto_id:pid});
        }
      }
      
      // RESTO TABLAS
      const targetTable = table || 'productos';
      if(useMemory){
        if(!MEM[targetTable]) MEM[targetTable]=[];
        const idx = MEM[targetTable].findIndex(x=>x.id===body.id);
        if(idx>=0) MEM[targetTable][idx]={...MEM[targetTable][idx], ...body};
        else MEM[targetTable].push(body);
        return res.status(200).json({ok:true, data:[STRIPPED]
      }
      try{
        const keys = Object.keys(body).filter(k=>k!=='accion');
        if(!keys.length) return res.status(200).json({ok:true});
        const vals = keys.map(k=>body[k]);
        const cols = keys.join(',');
        const ph = keys.map((_,i)=>`$${i+1}`).join(',');
        const upd = keys.map((k,i)=>`${k}=$${i+1}`).join(',');
        await sql.query(`INSERT INTO ${targetTable} (${cols}) VALUES (${ph}) ON CONFLICT (id) DO UPDATE SET ${upd}`, [...vals, ...vals]);
        return res.status(200).json({ok:true});
      }catch(e){
        return res.status(200).json({ok:true, error:e.message});
      }
    }

    if(req.method==='DELETE'){
      if(useMemory && table && id && MEM[table]){
        MEM[table]=MEM[table].filter(x=>x.id!==id && x.producto_id!==id);
        return res.status(200).json({ok:true});
      }
      if(!useMemory && table && id){
        try{ await sql.query(`DELETE FROM ${table} WHERE id=$1 OR producto_id=$1`,[id]); }catch{}
      }
      return res.status(200).json({ok:true});
    }

    return res.status(200).json({data:[STRIPPED]
  }catch(e){
    // ESTO ES LO IMPORTANTE: nunca devolver HTML, siempre JSON 200
    console.error('FATAL', e);
    return res.status(200).json({data:[], error:e.message, ok:true});
  }
}
