export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  let sql;
  try{
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
  }catch(e){
    try{
      const mod2 = await import('@neondatabase/serverless');
      const { neon } = mod2;
      const dbUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;
      sql = neon(dbUrl);
      // envolver para que funcione como template tag
      const orig = sql;
      sql = (strings, ...values)=>{
        if(typeof strings==='string') return orig(strings);
        // si es query normal con template
        let q=strings[0];
        for(let i=0;i<values.length;i++){ q+=`$${i+1}`+strings[i+1]; }
        return { query: async()=>orig(q, values), rows: [] };
      };
      sql.query = async (q, params=[])=>{ const r=await orig(q, params); return {rows:r}; };
    }catch(e2){
      return res.status(200).json({data:[], error:'No DB driver: '+e2.message});
    }
  }

  try{
    const { table, id, hoy } = req.query;
    let body={};
    try{ body= typeof req.body==='string' ? JSON.parse(req.body) : (req.body||{}); }catch(_){}

    // Crear tablas con IF NOT EXISTS
    try{
      await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT DEFAULT 0, vacias INT DEFAULT 0, para_cambio INT DEFAULT 0, en_uso INT DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW())`;
    }catch(_){}
    try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`; }catch(_){}
    try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0`; }catch(_){}
    try{ await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMPTZ, fecha_local TEXT, hoy DATE, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario DOUBLE PRECISION, flete DOUBLE PRECISION, total DOUBLE PRECISION, cliente_nombre TEXT, pago TEXT, kilos DOUBLE PRECISION)`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_compra DOUBLE PRECISION, precio_venta DOUBLE PRECISION, proveedor_id TEXT, stock_minimo INT)`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT)`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, fecha DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION, metodo_pago TEXT)`; }catch(_){}
    try{ await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMPTZ DEFAULT NOW())`; }catch(_){}

    if(req.method==='GET'){
      if(!table) return res.status(200).json({data:[STRIPPED]
      try{
        if(table==='deposito'){
          const r = await sql`SELECT * FROM deposito ORDER BY producto_id`;
          return res.status(200).json({data:r.rows || r});
        }
        if(table==='ventas'){
          const r = await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 200`;
          return res.status(200).json({data:r.rows || r});
        }
        const r = await sql.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 200`);
        return res.status(200).json({data:r.rows || []});
      }catch(e){
        return res.status(200).json({data:[], error:e.message});
      }
    }

    if(req.method==='POST'){
      // DEPOSITO - caso especial fraccionado
      if(table==='deposito' || body.accion==='balance_inicial' || body.producto_id){
        if(table==='deposito' || body.accion==='balance_inicial'){
          const pid = String(body.producto_id || body.id || '43.5');
          const llenas = parseInt(body.llenas)||0;
          const vacias = parseInt(body.vacias)||0;
          const para_cambio = parseInt(body.para_cambio||0);
          const en_uso = parseInt(body.en_uso||0);
          const kilos = parseFloat(body.kilos_restantes ?? body.kilos ?? 0);
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes) VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}, updated_at=NOW()`;
          return res.status(200).json({ok:true, producto_id:pid, kilos_restantes:kilos});
        }
      }
      if(table==='ventas'){
        const d=body;
        await sql`INSERT INTO ventas (id, fecha, fecha_local, hoy, tipo, tipo_cliente, modo, canal, producto_id, cantidad, precio_unitario, flete, total, cliente_nombre, pago, kilos) VALUES (${d.id}, ${d.fecha || new Date().toISOString()}, ${d.fecha_local||''}, ${d.hoy || new Date().toISOString().split('T')[0]}, ${d.tipo||''}, ${d.tipo_cliente||''}, ${d.modo||''}, ${d.canal||''}, ${d.producto_id||''}, ${parseInt(d.cantidad)||1}, ${parseFloat(d.precio_unitario)||0}, ${parseFloat(d.flete)||0}, ${parseFloat(d.total)||0}, ${d.cliente_nombre||''}, ${d.pago||''}, ${parseFloat(d.kilos)||0}) ON CONFLICT (id) DO NOTHING`;
        return res.status(200).json({ok:true});
      }
      if(table){
        // generico
        const keys = Object.keys(body).filter(k=>!['accion'].includes(k));
        if(!keys.length) return res.status(200).json({ok:true});
        // construir insert dinamico simple
        const cols = keys.join(',');
        const placeholders = keys.map((_,i)=>`$${i+1}`).join(',');
        const vals = keys.map(k=>body[k]);
        try{
          await sql.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')}`, [...vals, ...vals]);
        }catch(e){
          // fallback sin upsert
          try{ await sql.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`, vals); }catch(_){}
        }
        return res.status(200).json({ok:true});
      }
    }

    if(req.method==='DELETE' && table && id){
      try{ await sql.query(`DELETE FROM ${table} WHERE id=$1`,[id]); }catch(_){}
      return res.status(200).json({ok:true});
    }

    return res.status(200).json({ok:true});
  }catch(e){
    console.error(e);
    return res.status(200).json({data:[], error:e.message, stack:e.stack});
  }
}
