// api/postgres.js - MEGAL ERP FINAL COMPLETO - GUARDA TODAS LAS TABLAS
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  
  const table = (req.query.table || '').toString();
  const id = (req.query.id || '').toString();

  try {
    // CREAR TABLAS
    await sql.query(`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, repartidor_id TEXT, lat FLOAT, lng FLOAT, velocidad FLOAT, fecha TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS finanzas (id TEXT PRIMARY KEY, fecha TEXT, tipo TEXT, categoria TEXT, descripcion TEXT, monto FLOAT, metodo_pago TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT, vacias INT, en_uso INT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TEXT, fecha_local TEXT, hoy TEXT, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario FLOAT, flete FLOAT, total FLOAT, cliente_nombre TEXT, pago TEXT, kilos FLOAT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rubro TEXT, email TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, precio_compra FLOAT, precio_venta FLOAT, stock_minimo INT, proveedor_id TEXT, kg FLOAT, descripcion TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT, barrio TEXT, notas TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, estado TEXT, vehiculo TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`);
    await sql.query(`CREATE TABLE IF NOT EXISTS puntos_ref (id TEXT PRIMARY KEY, nombre TEXT, lat FLOAT, lng FLOAT, tipo TEXT)`);

    // GET - LEER
    if(req.method==='GET'){
      if(!table) return res.json({data:[]});
      const allowed=['gps_locations','finanzas','deposito','ventas','proveedores','productos','clientes','repartidores','camaras','puntos_ref'];
      if(!allowed.includes(table)) return res.json({data:[]});
      const orderCol = table==='deposito' ? 'producto_id' : table==='ventas' || table==='gps_locations' ? 'fecha DESC' : 'id';
      const {rows} = await sql.query(`SELECT * FROM ${table} ORDER BY ${orderCol} LIMIT 500`);
      return res.json({data:rows});
    }

    // POST - GUARDAR (GENÉRICO PARA TODAS LAS TABLAS)
    if(req.method==='POST'){
      const b = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{});
      if(!Object.keys(b).length) return res.json({ok:true});

      // DEPOSITO (clave es producto_id)
      if(table==='deposito' || b.accion==='balance_inicial' || (b.producto_id && (b.llenas!==undefined || b.vacias!==undefined))){
        const pid = String(b.producto_id||'');
        if(!pid) return res.json({ok:false, error:'sin producto_id'});
        await sql.query(`INSERT INTO deposito (producto_id, llenas, vacias, en_uso) VALUES ($1,$2,$3,$4) ON CONFLICT (producto_id) DO UPDATE SET llenas=EXCLUDED.llenas, vacias=EXCLUDED.vacias, en_uso=EXCLUDED.en_uso`,
        [pid, parseInt(b.llenas)||0, parseInt(b.vacias)||0, parseInt(b.en_uso)||0]);
        return res.json({ok:true});
      }

      // TABLA POR DEFECTO
      const target = table || b._table || (b.producto_id && b.cantidad ? 'ventas' : null) || 'productos';
      
      // Construir upsert genérico
      let data = {...b};
      delete data._table; delete data.accion;
      if(!data.id && target!=='deposito'){
        if(target==='ventas') data.id = data.id || 'V_'+Date.now();
        else if(target==='finanzas') data.id = data.id || 'FIN_'+Date.now();
        else if(target==='productos') data.id = data.id || 'PROD_'+Date.now();
        else if(target==='clientes') data.id = data.id || 'CLI_'+Date.now();
        else if(target==='proveedores') data.id = data.id || 'PROV_'+Date.now();
        else if(target==='repartidores') data.id = data.id || 'REP_'+Date.now();
        else data.id = data.id || target+'_'+Date.now();
      }

      // Limpiar campos no existentes en tabla productos/clientes/etc para evitar error
      // Usamos JSONB fallback si la tabla tiene columnas distintas: intentamos insertar solo las que existen
      try{
        const cols = Object.keys(data);
        const vals = Object.values(data);
        const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
        const updates = cols.filter(c=>c!=='id' && c!=='producto_id').map(c=>`${c}=EXCLUDED.${c}`).join(',');
        const pk = target==='deposito' ? 'producto_id' : 'id';
        const query = `INSERT INTO ${target} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (${pk}) DO UPDATE SET ${updates || `${pk}=EXCLUDED.${pk}`}`;
        await sql.query(query, vals);
        return res.json({ok:true, id:data.id||data.producto_id});
      }catch(err){
        // Si falla por columna inexistente, agregamos la columna automáticamente
        console.error('Upsert error, intentando agregar columnas', err.message);
        for(const col of Object.keys(data)){
          try{
            if(col==='id' || col==='producto_id') continue;
            await sql.query(`ALTER TABLE ${target} ADD COLUMN IF NOT EXISTS ${col} TEXT`);
          }catch(_){}
        }
        // Reintentar
        try{
          const cols = Object.keys(data);
          const vals = Object.values(data);
          const placeholders = cols.map((_,i)=>`$${i+1}`).join(',');
          const updates = cols.filter(c=>c!=='id' && c!=='producto_id').map(c=>`${c}=EXCLUDED.${c}`).join(',');
          const pk = target==='deposito' ? 'producto_id' : 'id';
          const query = `INSERT INTO ${target} (${cols.join(',')}) VALUES (${placeholders}) ON CONFLICT (${pk}) DO UPDATE SET ${updates || `${pk}=EXCLUDED.${pk}`}`;
          await sql.query(query, vals);
          return res.json({ok:true, id:data.id});
        }catch(err2){
          return res.status(200).json({ok:false, error:err2.message, data:[]});
        }
      }
    }

    // DELETE
    if(req.method==='DELETE'){
      if(!table || !id) return res.json({ok:false, error:'falta tabla o id'});
      const pk = table==='deposito' ? 'producto_id' : 'id';
      await sql.query(`DELETE FROM ${table} WHERE ${pk} = $1`, [id]);
      return res.json({ok:true});
    }

    return res.json({data:[]});
  } catch(e){
    console.error('API ERROR', e);
    return res.status(200).json({data:[], error:e.message, ok:false});
  }
}
