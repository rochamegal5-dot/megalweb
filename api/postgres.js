import { sql } from '@vercel/postgres';

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  
  try{
    const {table, id} = req.query;
    const body = req.body ? (typeof req.body==='string' ? JSON.parse(req.body) : req.body) : {};

    // Tablas - con ALTER para no romper si ya existen
    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT DEFAULT 0, vacias INT DEFAULT 0, para_cambio INT DEFAULT 0, en_uso INT DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0)`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0`;
    await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TEXT, fecha_local TEXT, hoy TEXT, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario DOUBLE PRECISION, flete DOUBLE PRECISION, total DOUBLE PRECISION, cliente_nombre TEXT, pago TEXT, kilos DOUBLE PRECISION)`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_compra DOUBLE PRECISION, precio_venta DOUBLE PRECISION, proveedor_id TEXT, stock_minimo INT)`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, fecha TEXT, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION, metodo_pago TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, repartidor TEXT, fecha TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`;

    if(req.method==='GET'){
      if(!table) return res.status(200).json({data:[STRIPPED]
      const r = await sql`SELECT * FROM ${sql(table)} LIMIT 200`.catch(async()=>{ 
        // fallback si sql(table) no funciona
        const q = await sql.query(`SELECT * FROM ${table} LIMIT 200`);
        return q;
      });
      const rows = r.rows || r;
      return res.status(200).json({data: rows});
    }

    if(req.method==='POST'){
      if(table==='deposito' || body.accion==='balance_inicial'){
        const pid = String(body.producto_id || '43.5');
        const llenas = parseInt(body.llenas)||0;
        const vacias = parseInt(body.vacias)||0;
        const para_cambio = parseInt(body.para_cambio)||0;
        const en_uso = parseInt(body.en_uso)||0;
        const kilos = parseFloat(body.kilos_restantes ?? 0);
        await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes) VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}`;
        return res.status(200).json({ok:true});
      }
      if(table==='ventas'){
        const d=body;
        await sql`INSERT INTO ventas (id, fecha, fecha_local, hoy, tipo, tipo_cliente, modo, canal, producto_id, cantidad, precio_unitario, flete, total, cliente_nombre, pago, kilos) VALUES (${d.id}, ${d.fecha}, ${d.fecha_local}, ${d.hoy}, ${d.tipo}, ${d.tipo_cliente}, ${d.modo}, ${d.canal}, ${d.producto_id}, ${d.cantidad}, ${d.precio_unitario}, ${d.flete}, ${d.total}, ${d.cliente_nombre}, ${d.pago}, ${d.kilos}) ON CONFLICT (id) DO NOTHING`;
        return res.status(200).json({ok:true});
      }
      if(table && body.id){
        const keys = Object.keys(body);
        // upsert genérico
        try{
          await sql.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT (id) DO UPDATE SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')}`, [...Object.values(body), ...Object.values(body)]);
        }catch(e){
          await sql.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(',')}) ON CONFLICT (id) DO NOTHING`, Object.values(body));
        }
        return res.status(200).json({ok:true});
      }
      return res.status(200).json({ok:true});
    }

    if(req.method==='DELETE' && table && id){
      await sql.query(`DELETE FROM ${table} WHERE id=$1 OR producto_id=$1`,[id]);
      return res.status(200).json({ok:true});
    }

    return res.status(200).json({data:[STRIPPED]
  }catch(e){
    console.error('API ERROR:', e);
    // NUNCA devolver HTML 500, siempre JSON 200
    return res.status(200).json({data:[], error:e.message});
  }
}
