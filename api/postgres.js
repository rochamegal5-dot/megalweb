// api/postgres.js - SIN IMPORT ESTATICO - evita FUNCTION_INVOCATION_FAILED
let MEM = {
  deposito: [
    {producto_id:'11', llenas:20, vacias:5, para_cambio:0, en_uso:0, kilos_restantes:0},
    {producto_id:'13', llenas:20, vacias:5, para_cambio:0, en_uso:0, kilos_restantes:0},
    {producto_id:'43.5', llenas:4, vacias:3, para_cambio:0, en_uso:1, kilos_restantes:43.5},
    {producto_id:'45', llenas:10, vacias:5, para_cambio:0, en_uso:0, kilos_restantes:0}
  ],
  ventas: [], productos: [], clientes: [], proveedores: [],
  repartidores: [], finanzas: [], gps_locations: [], camaras: [],
  puntos_ref: [], marketing: [], tubo_43_historial: []
};

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  let sql = null;
  let usePG = false;

  try{
    const { sql: vercelSql } = await import('@vercel/postgres');
    const hasUrl = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL);
    if(hasUrl){
      sql = vercelSql;
      await sql`SELECT 1 as ok`;
      usePG = true;
    }
  }catch(e){
    console.log('PG no disponible, usando memoria:', e.message);
    usePG = false;
  }

  try{
    const {table, id} = req.query;
    let body={};
    try{ body = typeof req.body==='string' ? JSON.parse(req.body) : (req.body||{}); }catch{}

    if(usePG && sql){
      try{ await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT DEFAULT 0, vacias INT DEFAULT 0, para_cambio INT DEFAULT 0, en_uso INT DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0)`; }catch{}
      try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`; }catch{}
      try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0`; }catch{}
      try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TEXT, hoy TEXT, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario DOUBLE PRECISION, flete DOUBLE PRECISION, total DOUBLE PRECISION, cliente_nombre TEXT, pago TEXT, kilos DOUBLE PRECISION)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_venta DOUBLE PRECISION)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, monto DOUBLE PRECISION)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION)`; }catch{}
      try{ await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT)`; }catch{}
    }

    if(req.method==='GET'){
      if(!table) return res.status(200).json({data:[STRIPPED]
      if(!usePG){
        return res.status(200).json({data: MEM[table]||[], mem:true});
      }
      try{
        const r = await sql.query(`SELECT * FROM ${table} LIMIT 300`);
        return res.status(200).json({data: r.rows||[], pg:true});
      }catch(e){
        return res.status(200).json({data: MEM[table]||[], error:e.message, mem:true});
      }
    }

    if(req.method==='POST'){
      if(table==='deposito' || body.accion==='balance_inicial'){
        const pid = String(body.producto_id||'43.5');
        const llenas = parseInt(body.llenas)||0;
        const vacias = parseInt(body.vacias)||0;
        const para_cambio = parseInt(body.para_cambio)||0;
        const en_uso = parseInt(body.en_uso)||0;
        const kilos = parseFloat(body.kilos_restantes??0);
        if(!usePG){
          const idx = MEM.deposito.findIndex(d=>d.producto_id===pid);
          const obj = {producto_id:pid, llenas, vacias, para_cambio, en_uso, kilos_restantes:kilos};
          if(idx>=0) MEM.deposito[idx]=obj; else MEM.deposito.push(obj);
          return res.status(200).json({ok:true, data:MEM.deposito, mem:true, kilos_restantes:kilos});
        }
        try{
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes) VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}`;
          return res.status(200).json({ok:true, pg:true, kilos_restantes:kilos});
        }catch(e){
          return res.status(200).json({ok:true, error:e.message, mem:true});
        }
      }
      if(!usePG){
        if(!MEM[table]) MEM[table]=[];
        MEM[table].push(body);
        return res.status(200).json({ok:true, mem:true});
      }
      try{
        const keys = Object.keys(body);
        if(keys.length===0) return res.status(200).json({ok:true});
        await sql.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT (id) DO NOTHING`, Object.values(body));
        return res.status(200).json({ok:true, pg:true});
      }catch(e){
        return res.status(200).json({ok:true, error:e.message});
      }
    }

    if(req.method==='DELETE'){
      if(!usePG){
        if(MEM[table]) MEM[table]=MEM[table].filter(x=>x.id!==id && x.producto_id!==id);
        return res.status(200).json({ok:true, mem:true});
      }
      try{ await sql.query(`DELETE FROM ${table} WHERE id=$1 OR producto_id=$1`,[id]); }catch{}
      return res.status(200).json({ok:true, pg:true});
    }

    return res.status(200).json({data:[STRIPPED]
  }catch(e){
    console.error('FATAL', e);
    return res.status(200).json({data:[], error:e.message, ok:true});
  }
}
