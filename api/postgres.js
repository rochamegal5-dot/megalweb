import { sql } from '@vercel/postgres';

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  try{
    const { table, id, hoy } = req.query;
    const body = req.body && typeof req.body==='object' ? req.body : (req.body ? JSON.parse(req.body) : {});

    // Crear tablas si no existen - CON kilos_restantes
    await sql`CREATE TABLE IF NOT EXISTS deposito (
      producto_id TEXT PRIMARY KEY,
      llenas INT DEFAULT 0,
      vacias INT DEFAULT 0,
      para_cambio INT DEFAULT 0,
      en_uso INT DEFAULT 0,
      kilos_restantes DOUBLE PRECISION DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0;`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0;`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0;`;

    await sql`CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      fecha TIMESTAMPTZ,
      fecha_local TEXT,
      hoy DATE,
      tipo TEXT,
      tipo_cliente TEXT,
      modo TEXT,
      canal TEXT,
      producto_id TEXT,
      cantidad INT,
      precio_unitario DOUBLE PRECISION,
      flete DOUBLE PRECISION,
      total DOUBLE PRECISION,
      cliente_nombre TEXT,
      pago TEXT,
      kilos DOUBLE PRECISION
    );`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_compra DOUBLE PRECISION, precio_venta DOUBLE PRECISION, proveedor_id TEXT, stock_minimo INT);`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT);`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT);`;
    await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT);`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, fecha DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION, metodo_pago TEXT);`;
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMPTZ DEFAULT NOW());`;
    await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT);`;

    if(req.method==='GET'){
      if(table==='deposito'){
        const r = await sql.query(`SELECT * FROM deposito ORDER BY producto_id`);
        return res.status(200).json({data:[STRIPPED]
      }
      if(table==='ventas'){
        let q=`SELECT * FROM ventas`;
        if(hoy==='1'){ q+=` WHERE hoy = CURRENT_DATE OR canal='mostrador' OR fecha::date = CURRENT_DATE`; }
        q+=` ORDER BY fecha DESC LIMIT 200`;
        const r = await sql.query(q);
        return res.status(200).json({data:[STRIPPED]
      }
      if(table){
        const r = await sql.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 200`);
        return res.status(200).json({data:[STRIPPED]
      }
      return res.status(200).json({data:[STRIPPED]
    }

    if(req.method==='POST'){
      if(table==='deposito' || body.accion==='balance_inicial'){
        const pid = body.producto_id || body.id || '43.5';
        const llenas = parseInt(body.llenas)||0;
        const vacias = parseInt(body.vacias)||0;
        const para_cambio = parseInt(body.para_cambio||body.paraCambio||0);
        const en_uso = parseInt(body.en_uso||0);
        const kilos = parseFloat(body.kilos_restantes ?? body.kilos ?? 0);
        await sql`
          INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes, updated_at)
          VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}, NOW())
          ON CONFLICT (producto_id) DO UPDATE SET
            llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}, updated_at=NOW()
        `;
        return res.status(200).json({ok:true, producto_id:pid, kilos_restantes:kilos});
      }
      if(table==='ventas'){
        const d=body;
        await sql`
          INSERT INTO ventas (id, fecha, fecha_local, hoy, tipo, tipo_cliente, modo, canal, producto_id, cantidad, precio_unitario, flete, total, cliente_nombre, pago, kilos)
          VALUES (${d.id}, ${d.fecha || new Date().toISOString()}, ${d.fecha_local || ''}, ${d.hoy || new Date().toISOString().split('T')[0]}, ${d.tipo || ''}, ${d.tipo_cliente || ''}, ${d.modo || ''}, ${d.canal || ''}, ${d.producto_id || ''}, ${parseInt(d.cantidad)||1}, ${parseFloat(d.precio_unitario)||0}, ${parseFloat(d.flete)||0}, ${parseFloat(d.total)||0}, ${d.cliente_nombre || ''}, ${d.pago || ''}, ${parseFloat(d.kilos)||0})
          ON CONFLICT (id) DO NOTHING
        `;
        return res.status(200).json({ok:true});
      }
      if(table){
        const cols = Object.keys(body).filter(k=>k!=='accion');
        if(!cols.length) return res.status(200).json({ok:true});
        const vals = cols.map(c=>body[c]);
        const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
        const updates = cols.map((c,i)=>`${c}=$${i+1}`).join(',');
        const q = `INSERT INTO ${table} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
        await sql.query(q, [...vals, ...vals]);
        return res.status(200).json({ok:true});
      }
    }

    if(req.method==='DELETE'){
      if(table && id){
        await sql.query(`DELETE FROM ${table} WHERE id=$1`,[id]);
        return res.status(200).json({ok:true});
      }
    }

    return res.status(200).json({ok:true, msg:'no table'});
  }catch(e){
    console.error('API ERROR',e);
    return res.status(200).json({error:e.message, data:[STRIPPED]
  }
}
