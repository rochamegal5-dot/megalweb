import { sql } from '@vercel/postgres';

export default async function handler(req, res){
  res.setHeader('Content-Type','application/json');
  try{
    const { table, id } = req.query;
    const permitidas = ['gps_locations','finanzas','deposito','ventas','proveedores','productos','clientes','repartidores'];
    
    if(req.method === 'GET'){
      if(!table || !permitidas.includes(table)) return res.status(200).json({data:[STRIPPED]
      try{
        const { rows } = await sql.query(`SELECT * FROM ${table} ORDER BY fecha DESC LIMIT 500`);
        return res.status(200).json({data: rows});
      }catch(e){
        // Tabla no existe -> crearla
        try{
          if(table==='gps_locations') await sql`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, repartidor TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, fecha TIMESTAMPTZ DEFAULT NOW())`;
          if(table==='finanzas') await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, tipo TEXT, categoria TEXT, descripcion TEXT, monto NUMERIC, metodo_pago TEXT, fecha TIMESTAMPTZ DEFAULT NOW())`;
          if(table==='deposito') await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, nombre TEXT, llenas INT DEFAULT 0, vacias INT DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0)`;
          if(table==='ventas') await sql`CREATE TABLE IF NOT EXISTS ventas (id SERIAL PRIMARY KEY, producto_id TEXT, cliente_nombre TEXT, cantidad INT, total NUMERIC, flete NUMERIC, pago TEXT, tipo_cliente TEXT, modo TEXT, fecha TIMESTAMPTZ DEFAULT NOW())`;
          if(table==='proveedores') await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
          if(table==='productos') await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT)`;
          if(table==='clientes') await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT)`;
          if(table==='repartidores') await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
        }catch(_){}
        return res.status(200).json({data:[STRIPPED]
      }
    }

    if(req.method === 'POST'){
      const b = req.body;
      if(table==='deposito'){
        if(b.accion==='ingreso_gas'){ await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, kilos_en_uso) VALUES (${b.producto_id}, ${b.producto_id}, ${b.llenas||0}, ${b.vacias||0}, ${b.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas = deposito.llenas + ${b.llenas||0}, vacias = deposito.vacias + ${b.vacias||0}`; return res.json({ok:true}); }
        if(b.accion==='balance_inicial'){ await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, kilos_en_uso) VALUES (${b.producto_id}, ${b.producto_id}, ${b.llenas}, ${b.vacias}, ${b.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${b.llenas}, vacias=${b.vacias}, kilos_en_uso=${b.kilos_en_uso||0}`; return res.json({ok:true}); }
        if(b.accion==='actualizar_stock'){ await sql`UPDATE deposito SET llenas=${b.llenas}, vacias=${b.vacias}, kilos_en_uso=${b.kilos_en_uso||0} WHERE producto_id=${b.producto_id}`; return res.json({ok:true}); }
        if(b.accion==='iniciar_tubo_43'){ await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, kilos_en_uso) VALUES ('43.5','43.5',1,0,43.5) ON CONFLICT (producto_id) DO UPDATE SET kilos_en_uso=43.5, llenas=1`; return res.json({ok:true}); }
      }
      if(table==='ventas'){ await sql`INSERT INTO ventas (producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo) VALUES (${b.producto_id}, ${b.cliente_nombre}, ${b.cantidad||1}, ${b.total}, ${b.flete||0}, ${b.pago}, ${b.tipo_cliente}, ${b.modo})`; try{ await sql`UPDATE deposito SET llenas=GREATEST(0,llenas-1), vacias=vacias+1 WHERE producto_id=${b.producto_id}`; }catch(_){} return res.json({ok:true}); }
      if(table==='finanzas'){ await sql`INSERT INTO finanzas (tipo, categoria, descripcion, monto, metodo_pago) VALUES (${b.tipo}, ${b.categoria}, ${b.descripcion}, ${b.monto}, ${b.metodo_pago})`; return res.json({ok:true}); }
      if(table==='proveedores'){ await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion) VALUES (${b.id}, ${b.nombre}, ${b.telefono}, ${b.rut}, ${b.direccion}) ON CONFLICT (id) DO UPDATE SET nombre=${b.nombre}, telefono=${b.telefono}`; return res.json({ok:true}); }
      if(table==='productos'){ await sql`INSERT INTO productos (id, nombre, tipo) VALUES (${b.id}, ${b.nombre}, ${b.tipo}) ON CONFLICT (id) DO UPDATE SET nombre=${b.nombre}`; return res.json({ok:true}); }
      if(table==='clientes'){ await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo) VALUES (${b.id}, ${b.nombre}, ${b.telefono}, ${b.direccion}, ${b.tipo}) ON CONFLICT (id) DO UPDATE SET nombre=${b.nombre}`; return res.json({ok:true}); }
      if(table==='repartidores'){ await sql`INSERT INTO repartidores (id, nombre, telefono) VALUES (${b.id}, ${b.nombre}, ${b.telefono}) ON CONFLICT (id) DO UPDATE SET nombre=${b.nombre}`; return res.json({ok:true}); }
      return res.json({ok:true});
    }

    if(req.method==='DELETE'){ if(permitidas.includes(table) && id){ await sql.query(`DELETE FROM ${table} WHERE id = $1`, [id]); } return res.json({ok:true}); }
    
    return res.json({data:[STRIPPED]
  }catch(err){
    console.error(err);
    return res.status(200).json({data:[], error: err.message});
  }
}
