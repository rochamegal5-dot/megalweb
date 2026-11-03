import { neon } from '@neondatabase/serverless';

export default async function handler(req, res){
  try{
    // Busca cualquiera de las variables que tenés en Vercel
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
    
    if(!dbUrl){
      return res.status(200).json({data:[], error:'No DATABASE_URL ni POSTGRES_URL - revisa env vars'});
    }

    const sql = neon(dbUrl);
    const { table, id } = req.query;
    const permitidas = ['gps_locations','finanzas','deposito','ventas','proveedores','productos','clientes','repartidores'];

    if(req.method==='GET'){
      if(!table || !permitidas.includes(table)) return res.json({data:[STRIPPED]
      try{
        const data = await sql.unsafe(`SELECT * FROM ${table} ORDER BY fecha DESC LIMIT 500`);
        return res.json({data});
      }catch(e){
        // Si la tabla no existe, la crea automáticamente
        try{
          if(table==='gps_locations') await sql`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMP DEFAULT NOW())`;
          if(table==='finanzas') await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, tipo TEXT, categoria TEXT, descripcion TEXT, monto NUMERIC, metodo_pago TEXT, fecha TIMESTAMP DEFAULT NOW())`;
          if(table==='deposito') await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, nombre TEXT, llenas INT DEFAULT 0, vacias INT DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0)`;
          if(table==='ventas') await sql`CREATE TABLE IF NOT EXISTS ventas (id SERIAL PRIMARY KEY, producto_id TEXT, cliente_nombre TEXT, cantidad INT, total NUMERIC, flete NUMERIC, pago TEXT, tipo_cliente TEXT, modo TEXT, fecha TIMESTAMP DEFAULT NOW())`;
          if(table==='proveedores') await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
          if(table==='productos') await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT)`;
          if(table==='clientes') await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT)`;
          if(table==='repartidores') await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
        }catch(e2){}
        return res.json({data:[STRIPPED]
      }
    }

    if(req.method==='POST'){
      const body = req.body;
      if(table==='deposito' && body.accion==='ingreso_gas'){
        const ex = await sql`SELECT * FROM deposito WHERE producto_id=${body.producto_id}`;
        if(ex.length>0){ await sql`UPDATE deposito SET llenas=llenas+${body.llenas||0}, vacias=vacias+${body.vacias||0} WHERE producto_id=${body.producto_id}`; }
        else{ await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, kilos_en_uso) VALUES (${body.producto_id}, ${body.producto_id}, ${body.llenas||0}, ${body.vacias||0}, ${body.kilos_en_uso||0})`; }
        return res.json({ok:true});
      }
      if(table==='deposito' && body.accion==='iniciar_tubo_43'){ await sql`UPDATE deposito SET kilos_en_uso=43.5, llenas=1 WHERE producto_id='43.5'`; return res.json({ok:true}); }
      if(table==='deposito' && body.accion==='actualizar_stock'){ await sql`UPDATE deposito SET llenas=${body.llenas}, vacias=${body.vacias}, kilos_en_uso=${body.kilos_en_uso||0} WHERE producto_id=${body.producto_id}`; return res.json({ok:true}); }
      if(table==='deposito' && body.accion==='balance_inicial'){ await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, kilos_en_uso) VALUES (${body.producto_id}, ${body.producto_id}, ${body.llenas}, ${body.vacias}, ${body.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${body.llenas}, vacias=${body.vacias}, kilos_en_uso=${body.kilos_en_uso||0}`; return res.json({ok:true}); }
      if(table==='deposito' && body.accion==='venta_fraccionada'){
        const ex = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
        const actual = parseFloat(ex[0]?.kilos_en_uso||0);
        if(actual < body.kilos) return res.json({error:'No hay kilos. Quedan '+actual});
        const restante = actual - body.kilos;
        await sql`UPDATE deposito SET kilos_en_uso=${restante} WHERE producto_id='43.5'`;
        await sql`INSERT INTO ventas (producto_id, cliente_nombre, cantidad, total, flete, pago, fecha) VALUES ('fraccionado', ${body.cliente_nombre}, ${body.kilos}, ${body.kilos*150}, 0, 'contado', NOW())`;
        return res.json({ok:true, restante});
      }
      if(table==='finanzas'){ await sql`INSERT INTO finanzas (tipo, categoria, descripcion, monto, metodo_pago, fecha) VALUES (${body.tipo}, ${body.categoria}, ${body.descripcion}, ${body.monto}, ${body.metodo_pago}, NOW())`; return res.json({ok:true}); }
      if(table==='ventas'){ await sql`INSERT INTO ventas (producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo, fecha) VALUES (${body.producto_id}, ${body.cliente_nombre}, ${body.cantidad||1}, ${body.total}, ${body.flete||0}, ${body.pago}, ${body.tipo_cliente}, ${body.modo}, NOW())`; try{ await sql`UPDATE deposito SET llenas=GREATEST(0,llenas-1), vacias=vacias+1 WHERE producto_id=${body.producto_id}`; }catch(e){} return res.json({ok:true}); }
      if(table==='proveedores'){ await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion) VALUES (${body.id}, ${body.nombre}, ${body.telefono}, ${body.rut}, ${body.direccion}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono}, rut=${body.rut}, direccion=${body.direccion}`; return res.json({ok:true}); }
      if(table==='productos'){ await sql`INSERT INTO productos (id, nombre, tipo) VALUES (${body.id}, ${body.nombre}, ${body.tipo}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, tipo=${body.tipo}`; return res.json({ok:true}); }
      if(table==='clientes'){ await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo) VALUES (${body.id}, ${body.nombre}, ${body.telefono}, ${body.direccion}, ${body.tipo}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono}, direccion=${body.direccion}, tipo=${body.tipo}`; return res.json({ok:true}); }
      if(table==='repartidores'){ await sql`INSERT INTO repartidores (id, nombre, telefono) VALUES (${body.id}, ${body.nombre}, ${body.telefono}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono}`; return res.json({ok:true}); }
      return res.json({ok:true});
    }

    if(req.method==='DELETE' && permitidas.includes(table)){
      await sql.unsafe(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return res.json({ok:true});
    }

    return res.json({data:[STRIPPED]
  }catch(e){
    console.error(e);
    return res.status(200).json({data:[], error:e.message});
  }
}
