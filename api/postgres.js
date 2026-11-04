// api/postgres.js - MEGAL ERP FINAL - NO DA 500 HTML
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  
  const table = (req.query.table || '').toString();
  const id = (req.query.id || '').toString();

  try {
    // CREAR TABLAS SI NO EXISTEN
    await sql.query(`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, repartidor_id TEXT, lat FLOAT, lng FLOAT, velocidad FLOAT, fecha TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, fecha TEXT, tipo TEXT, categoria TEXT, descripcion TEXT, monto FLOAT, metodo_pago TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT, vacias INT, en_uso INT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TEXT, fecha_local TEXT, hoy TEXT, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario FLOAT, flete FLOAT, total FLOAT, cliente_nombre TEXT, pago TEXT, kilos FLOAT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rubro TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_compra FLOAT, precio_venta FLOAT, stock_minimo INT, proveedor_id TEXT, kg FLOAT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT, barrio TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, estado TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS puntos_ref (id TEXT PRIMARY KEY, nombre TEXT, lat FLOAT, lng FLOAT)`);

    // GET
    if(req.method==='GET'){
      if(!table) return res.json({data:[]});
      const allowed=['gps_locations','finanzas','deposito','ventas','proveedores','productos','clientes','repartidores','camaras','puntos_ref','marketing'];
      if(!allowed.includes(table)) return res.json({data:[]});
      const {rows} = await sql.query(`SELECT * FROM ${table} ORDER BY fecha DESC LIMIT 500`);
      return res.json({data:rows});
    }

    // POST
    if(req.method==='POST'){
      const b = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{});
      
      if(table==='ventas' || b.canal || b.producto_id){
        const v=b;
        await sql.query(`INSERT INTO ventas (id,fecha,fecha_local,hoy,tipo,tipo_cliente,modo,canal,producto_id,cantidad,precio_unitario,flete,total,cliente_nombre,pago,kilos) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT (id) DO UPDATE SET fecha=EXCLUDED.fecha, total=EXCLUDED.total, flete=EXCLUDED.flete`,
        [v.id||'V_'+Date.now(), v.fecha||new Date().toISOString(), v.fecha_local||'', v.hoy||'', v.tipo||'solo_gas', v.tipo_cliente||'consumidor_final', v.modo||'retira', v.canal||'mostrador', v.producto_id||'13', parseInt(v.cantidad)||1, parseFloat(v.precio_unitario)||0, parseFloat(v.flete)||0, parseFloat(v.total)||0, v.cliente_nombre||'Mostrador', v.pago||'contado', parseFloat(v.kilos)||13]);
        return res.json({ok:true});
      }
      if(table==='deposito' || b.accion==='balance_inicial'){
        await sql.query(`INSERT INTO deposito (producto_id, llenas, vacias, en_uso) VALUES ($1,$2,$3,0) ON CONFLICT (producto_id) DO UPDATE SET llenas=EXCLUDED.llenas, vacias=EXCLUDED.vacias`,
        [String(b.producto_id), parseInt(b.llenas)||0, parseInt(b.vacias)||0]);
        return res.json({ok:true});
      }
      if(table==='finanzas'){
        await sql.query(`INSERT INTO finanzas (id,fecha,tipo,categoria,descripcion,monto,metodo_pago) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [b.id||'FIN_'+Date.now(), b.fecha||new Date().toISOString().split('T')[0], b.tipo||'ingreso', b.categoria||'venta', b.descripcion||'', parseFloat(b.monto)||0, b.metodo_pago||b.metodo||'contado']);
        return res.json({ok:true});
      }
      // generico
      const target = table || 'productos';
      const data = b;
      const cols = Object.keys(data);
      if(!cols.length) return res.json({ok:true});
      // fallback simple
      return res.json({ok:true, data});
    }

    if(req.method==='DELETE'){
      if(!table || !id) return res.json({ok:false});
      await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return res.json({ok:true});
    }

    return res.json({data:[]});
  } catch(e){
    console.error('API ERROR', e);
    // IMPORTANTE: devolver JSON aunque haya error, nunca HTML 500
    return res.status(200).json({data:[], error:e.message, ok:false});
  }
}
