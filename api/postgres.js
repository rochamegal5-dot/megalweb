import { sql } from '@vercel/postgres';
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) { process.env.POSTGRES_URL = process.env.DATABASE_URL; }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { table, hoy, fecha } = req.query;
  try {
    if (req.method === 'GET') {
      if (!table) { const { rows } = await sql`SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 100`; return res.json({ data: rows }); }
      if (table === 'productos') { const { rows } = await sql`SELECT * FROM productos ORDER BY id`; return res.json({ data: rows }); }
      if (table === 'deposito') { const { rows } = await sql`SELECT * FROM deposito ORDER BY producto_id`; return res.json({ data: rows }); }
      if (table === 'movimientos_stock') { const { rows } = await sql`SELECT * FROM movimientos_stock ORDER BY fecha DESC LIMIT 200`; return res.json({ data: rows }); }
      if (table === 'clientes') { const { rows } = await sql`SELECT * FROM clientes ORDER BY nombre`; return res.json({ data: rows }); }
      if (table === 'proveedores') { const { rows } = await sql`SELECT * FROM proveedores ORDER BY nombre`; return res.json({ data: rows }); }
      if (table === 'repartidores') { const { rows } = await sql`SELECT * FROM repartidores ORDER BY nombre`; return res.json({ data: rows }); }
      if (table === 'gps_locations') { const { rows } = await sql`SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 200`; return res.json({ data: rows }); }
      if (table === 'puntos_referencia') { const { rows } = await sql`SELECT * FROM puntos_referencia ORDER BY nombre`; return res.json({ data: rows }); }
      if (table === 'ventas') {
        if (hoy === '1') { const { rows } = await sql`SELECT * FROM ventas WHERE fecha >= CURRENT_DATE ORDER BY fecha DESC`; return res.json({ data: rows }); }
        const { rows } = await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 500`; return res.json({ data: rows });
      }
      if (table === 'finanzas') {
        await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha TIMESTAMPTZ DEFAULT NOW(), tipo TEXT, categoria TEXT, descripcion TEXT, monto NUMERIC, metodo_pago TEXT, repartidor_id TEXT)`;
        if (fecha) {
          const { rows } = await sql`SELECT * FROM finanzas WHERE fecha::date = ${fecha}::date ORDER BY fecha DESC`;
          return res.json({ data: rows });
        }
        const { rows } = await sql`SELECT * FROM finanzas ORDER BY fecha DESC LIMIT 500`;
        return res.json({ data: rows });
      }
      return res.status(400).json({ error: 'Tabla no permitida: '+table, data: [] });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!table) return res.status(400).json({ error: 'Falta table' });

      if (table === 'productos') {
        const { id, nombre, tipo, costo_proveedor, precio_venta } = body;
        await sql`INSERT INTO productos (id, nombre, tipo, costo_proveedor, precio_venta) VALUES (${id}, ${nombre}, ${tipo||'otro'}, ${costo_proveedor||0}, ${precio_venta||0}) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, costo_proveedor = EXCLUDED.costo_proveedor, precio_venta = EXCLUDED.precio_venta`;
        const { rows } = await sql`SELECT * FROM productos WHERE id = ${id}`; return res.json({ data: rows });
      }

      if (table === 'clientes') {
        const { id, nombre, telefono, direccion, tipo, latitud, longitud } = body;
        await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT, latitud NUMERIC, longitud NUMERIC)`;
        await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo, latitud, longitud) VALUES (${id}, ${nombre}, ${telefono||''}, ${direccion||''}, ${tipo||'particular'}, ${latitud||0}, ${longitud||0}) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, telefono=EXCLUDED.telefono, direccion=EXCLUDED.direccion, tipo=EXCLUDED.tipo`;
        return res.json({ ok:true });
      }

      if (table === 'proveedores') {
        const { id, nombre, telefono } = body;
        await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
        await sql`INSERT INTO proveedores (id, nombre, telefono) VALUES (${id}, ${nombre}, ${telefono||''}) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, telefono=EXCLUDED.telefono`;
        return res.json({ ok:true });
      }

      if (table === 'repartidores') {
        const { id, nombre, telefono } = body;
        await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
        await sql`INSERT INTO repartidores (id, nombre, telefono) VALUES (${id}, ${nombre}, ${telefono||''}) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, telefono=EXCLUDED.telefono`;
        return res.json({ ok:true });
      }

      if (table === 'finanzas') {
        await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha TIMESTAMPTZ DEFAULT NOW(), tipo TEXT, categoria TEXT, descripcion TEXT, monto NUMERIC, metodo_pago TEXT, repartidor_id TEXT)`;
        const { tipo, categoria, descripcion, monto, metodo_pago, repartidor_id } = body;
        if (body.fecha) {
          await sql`INSERT INTO finanzas (tipo,categoria,descripcion,monto,metodo_pago,repartidor_id,fecha) VALUES (${tipo},${categoria},${descripcion||categoria},${monto},${metodo_pago||'contado'},${repartidor_id||''}, ${body.fecha}::timestamptz)`;
        } else {
          await sql`INSERT INTO finanzas (tipo,categoria,descripcion,monto,metodo_pago,repartidor_id) VALUES (${tipo},${categoria},${descripcion||categoria},${monto},${metodo_pago||'contado'},${repartidor_id||''})`;
        }
        return res.json({ ok:true });
      }

      if (table === 'deposito' || table === 'stock' || table === 'movimientos_stock') {
        const { accion } = body;
        await sql`CREATE TABLE IF NOT EXISTS movimientos_stock (id SERIAL PRIMARY KEY, fecha TIMESTAMPTZ DEFAULT NOW(), tipo TEXT, proveedor TEXT, remito TEXT, factura TEXT, detalles JSONB, observaciones TEXT)`;

        if (accion === 'balance_inicial' && body.balances) {
          for (const b of body.balances) {
            await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, cambio, kilos_en_uso) VALUES (${b.producto_id}, ${b.nombre||b.producto_id}, ${b.llenas||0}, ${b.vacias||0}, ${b.cambio||0}, ${b.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET nombre = EXCLUDED.nombre, llenas = EXCLUDED.llenas, vacias = EXCLUDED.vacias, cambio = EXCLUDED.cambio, kilos_en_uso = EXCLUDED.kilos_en_uso`;
          }
          const { rows } = await sql`SELECT * FROM deposito ORDER BY producto_id`; return res.json({ data: rows });
        }

        if (accion === 'actualizar_stock') {
          const { producto_id, nombre, llenas, vacias, cambio, kilos_en_uso } = body;
          await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, cambio, kilos_en_uso) VALUES (${producto_id}, ${nombre||producto_id}, ${llenas||0}, ${vacias||0}, ${cambio||0}, ${kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas = EXCLUDED.llenas, vacias = EXCLUDED.vacias, cambio = EXCLUDED.cambio, kilos_en_uso = EXCLUDED.kilos_en_uso, nombre = EXCLUDED.nombre`;
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id = ${producto_id}`; return res.json({ data: rows });
        }

        if (accion === 'crear_producto') {
          const { producto } = body;
          await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, cambio, kilos_en_uso) VALUES (${producto.producto_id}, ${producto.nombre}, ${producto.llenas||0}, ${producto.vacias||0}, ${producto.cambio||0}, ${producto.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET nombre=EXCLUDED.nombre, llenas=EXCLUDED.llenas`;
          return res.json({ ok:true });
        }

        if (accion === 'venta_fraccionada') {
          const { kilos } = body;
          const kg = parseFloat(kilos)||0;
          if(kg<0.5 || kg>3) return res.status(400).json({ error: 'Solo 1 a 3kg permitido' });
          const { rows: depRows } = await sql`SELECT * FROM deposito WHERE producto_id = '43.5'`;
          if(depRows.length===0) return res.status(400).json({ error: 'No hay tubo 43.5' });
          let dep = depRows[0]; let llenas = dep.llenas||0; let vacias = dep.vacias||0; let kilos_en_uso = parseFloat(dep.kilos_en_uso)||0;
          if(kilos_en_uso<=0){ if(llenas<=0) return res.status(400).json({ error: 'No hay tubos 43.5 llenos' }); llenas--; kilos_en_uso=43.5; }
          if(kilos_en_uso < kg){ if(llenas<=0) return res.status(400).json({ error: 'Tubo con '+kilos_en_uso.toFixed(1)+'kg, necesita '+kg+'kg y no hay llenos' }); vacias++; llenas--; kilos_en_uso=43.5-(kg-kilos_en_uso); } else { kilos_en_uso-=kg; }
          if(kilos_en_uso<=0.1){ vacias++; kilos_en_uso=0; }
          await sql`UPDATE deposito SET llenas=${llenas}, vacias=${vacias}, kilos_en_uso=${kilos_en_uso} WHERE producto_id='43.5'`;
          const ventaId=Date.now().toString(36);
          await sql`INSERT INTO ventas (id, cliente_nombre, producto_id, cantidad, precio_unitario, flete, total, pago, tipo_cliente, modo, tipo_venta) VALUES (${ventaId}, ${body.cliente_nombre||'Fraccionado'}, 'fraccionado', ${kg}, 150, 0, ${kg*150}, 'contado', 'consumidor_final', 'fraccionado', 'mostrador')`;
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`; return res.json({ data: rows, restante:kilos_en_uso });
        }

        if (accion === 'iniciar_tubo_43') {
          const { rows: depRows } = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
          let dep=depRows[0]||{llenas:0,vacias:0,kilos_en_uso:0}; if((dep.llenas||0)<=0) return res.status(400).json({ error:'No hay tubos llenos' });
          let llenas=(dep.llenas||0)-1; let vacias=dep.vacias||0; if((dep.kilos_en_uso||0)>0.1) vacias++;
          await sql`UPDATE deposito SET llenas=${llenas}, vacias=${vacias}, kilos_en_uso=43.5 WHERE producto_id='43.5'`; const { rows }=await sql`SELECT * FROM deposito WHERE producto_id='43.5'`; return res.json({ data: rows });
        }

        return res.status(400).json({ error:'Accion no reconocida: '+accion });
      }

      if (table === 'ventas') {
        const { id, cliente_nombre, producto_id, cantidad, flete, total, pago, tipo_cliente, modo } = body;
        const vid=id||Date.now().toString(36);
        await sql`INSERT INTO ventas (id, cliente_nombre, producto_id, cantidad, flete, total, pago, tipo_cliente, modo, tipo_venta, fecha) VALUES (${vid}, ${cliente_nombre||'Cliente'}, ${producto_id||'13'}, ${cantidad||1}, ${flete||0}, ${total||0}, ${pago||'contado'}, ${tipo_cliente||'consumidor_final'}, ${modo||'retira'}, 'mostrador', NOW())`;
        if(producto_id!=='43.5' && producto_id!=='fraccionado'){
          if(modo==='venta_completa'){ await sql`UPDATE deposito SET llenas=GREATEST(0,COALESCE(llenas,0)-${cantidad||1}) WHERE producto_id=${producto_id}`; }
          else { await sql`UPDATE deposito SET llenas=GREATEST(0,COALESCE(llenas,0)-${cantidad||1}), vacias=COALESCE(vacias,0)+${cantidad||1} WHERE producto_id=${producto_id}`; }
        }
        const { rows }=await sql`SELECT * FROM ventas WHERE id=${vid}`; return res.json({ data: rows });
      }

      return res.json({ data:[body] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if(table==='productos') await sql`DELETE FROM productos WHERE id=${id}`;
      if(table==='clientes') await sql`DELETE FROM clientes WHERE id=${id}`;
      if(table==='proveedores') await sql`DELETE FROM proveedores WHERE id=${id}`;
      if(table==='repartidores') await sql`DELETE FROM repartidores WHERE id=${id}`;
      return res.json({ ok:true });
    }

    return res.status(405).json({ error:'Metodo no permitido' });
  } catch (e) {
    console.error('PG ERROR:', e);
    return res.status(500).json({ error:e.message, data:[] });
  }
}
