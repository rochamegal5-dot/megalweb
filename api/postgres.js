// api/postgres.js - MEGAL ERP FINAL - Vercel + Neon
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const table = (req.query.table || '').toLowerCase();
  const id = req.query.id;

  try {
    // ===== CREAR TABLAS SI NO EXISTEN =====
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS puntos_ref (id TEXT PRIMARY KEY, nombre TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION)`;
    await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'gas', precio_compra DOUBLE PRECISION DEFAULT 0, precio_venta DOUBLE PRECISION DEFAULT 0, proveedor_id TEXT, stock_minimo INTEGER DEFAULT 2)`;
    await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_compra DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_venta DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS proveedor_id TEXT`;
    await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT 2`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT DEFAULT 'consumidor_final')`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMP DEFAULT NOW(), producto_id TEXT, cliente_nombre TEXT, cantidad INTEGER DEFAULT 1, total DOUBLE PRECISION DEFAULT 0, flete DOUBLE PRECISION DEFAULT 0, pago TEXT DEFAULT 'contado', tipo_cliente TEXT DEFAULT 'consumidor_final', modo TEXT DEFAULT 'mostrador', repartidor_id TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha DATE DEFAULT CURRENT_DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION DEFAULT 0, metodo_pago TEXT DEFAULT 'contado')`;
    await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS marketing (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, estado TEXT, descripcion TEXT, presupuesto DOUBLE PRECISION DEFAULT 0, conversiones INTEGER DEFAULT 0)`;

    // Inicializar deposito base si vacio
    const depCount = await sql`SELECT COUNT(*) as c FROM deposito`;
    if (parseInt(depCount.rows[0].c) === 0) {
      await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso) VALUES ('11',0,0,0),('13',0,0,0),('45',0,0,0),('43.5',0,0,43.5) ON CONFLICT (producto_id) DO NOTHING`;
    }

    // ===== GET =====
    if (req.method === 'GET') {
      if (!table) return res.status(200).json({ data: [] });
      let rows = [];
      if (table === 'gps_locations') rows = (await sql`SELECT * FROM gps_locations ORDER BY fecha DESC LIMIT 200`).rows;
      else if (table === 'puntos_ref') rows = (await sql`SELECT * FROM puntos_ref`).rows;
      else if (table === 'repartidores') rows = (await sql`SELECT * FROM repartidores ORDER BY nombre`).rows;
      else if (table === 'productos') rows = (await sql`SELECT * FROM productos ORDER BY id`).rows;
      else if (table === 'clientes') rows = (await sql`SELECT * FROM clientes ORDER BY nombre`).rows;
      else if (table === 'proveedores') rows = (await sql`SELECT * FROM proveedores ORDER BY nombre`).rows;
      else if (table === 'deposito') rows = (await sql`SELECT * FROM deposito`).rows;
      else if (table === 'ventas') rows = (await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 300`).rows;
      else if (table === 'finanzas') rows = (await sql`SELECT * FROM finanzas ORDER BY fecha DESC, id DESC`).rows;
      else if (table === 'camaras') rows = (await sql`SELECT * FROM camaras ORDER BY nombre`).rows;
      else if (table === 'marketing') rows = (await sql`SELECT * FROM marketing ORDER BY id DESC`).rows;
      else rows = [];
      return res.status(200).json({ data: rows });
    }

    // ===== DELETE =====
    if (req.method === 'DELETE') {
      if (!id) return res.status(200).json({ ok: false, error: 'falta id' });
      if (table === 'repartidores') await sql`DELETE FROM repartidores WHERE id=${id}`;
      if (table === 'productos') await sql`DELETE FROM productos WHERE id=${id}`;
      if (table === 'clientes') await sql`DELETE FROM clientes WHERE id=${id}`;
      if (table === 'proveedores') await sql`DELETE FROM proveedores WHERE id=${id}`;
      if (table === 'finanzas') await sql`DELETE FROM finanzas WHERE id=${parseInt(id)}`;
      if (table === 'camaras') await sql`DELETE FROM camaras WHERE id=${id}`;
      if (table === 'marketing') await sql`DELETE FROM marketing WHERE id=${id}`;
      if (table === 'ventas') await sql`DELETE FROM ventas WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }

    // ===== POST =====
    if (req.method === 'POST') {
      const body = req.body || {};

      // DEPOSITO ACCIONES
      if (table === 'deposito') {
        if (body.accion === 'balance_inicial') {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso) VALUES (${body.producto_id}, ${parseInt(body.llenas)||0}, ${parseInt(body.vacias)||0}, ${parseFloat(body.kilos_en_uso)||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${parseInt(body.llenas)||0}, vacias=${parseInt(body.vacias)||0}, kilos_en_uso=${parseFloat(body.kilos_en_uso)||0}`;
          return res.status(200).json({ ok: true });
        }
        if (body.accion === 'ingreso_gas') {
          const ex = await sql`SELECT * FROM deposito WHERE producto_id=${body.producto_id}`;
          let llenas = parseInt(body.llenas)||0; let vacias = parseInt(body.vacias)||0;
          if (ex.rows[0]) { llenas += parseInt(ex.rows[0].llenas)||0; vacias += parseInt(ex.rows[0].vacias)||0; }
          await sql`INSERT INTO deposito (producto_id, llenas, vacias) VALUES (${body.producto_id}, ${llenas}, ${vacias}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${llenas}, vacias=${vacias}`;
          // Egreso automático en finanzas por compra
          if (body.producto_id && (parseInt(body.llenas)||0)>0) {
            await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE, 'egreso', 'Compra Gas', ${'Ingreso ' + body.producto_id + ' x' + (parseInt(body.llenas)||0)}, ${0}, 'contado')`;
          }
          return res.status(200).json({ ok: true });
        }
        if (body.accion === 'iniciar_tubo_43') {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso) VALUES ('43.5',0,0,43.5) ON CONFLICT (producto_id) DO UPDATE SET kilos_en_uso=43.5`;
          return res.status(200).json({ ok: true });
        }
        if (body.accion === 'venta_fraccionada') {
          const ex = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
          let kilos = parseFloat(ex.rows[0]?.kilos_en_uso)||43.5;
          const venta = parseFloat(body.kilos)||1;
          if (kilos < venta) return res.status(200).json({ error: 'No hay kilos suficientes', restante: kilos });
          kilos -= venta;
          await sql`UPDATE deposito SET kilos_en_uso=${kilos} WHERE producto_id='43.5'`;
          // Venta fraccionada como ingreso en finanzas
          await sql`INSERT INTO ventas (id, producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo) VALUES (${'v_'+Date.now()}, '43.5', ${body.cliente_nombre||'Fraccionado'}, ${venta}, ${venta*100}, 0, 'contado', 'consumidor_final', 'mostrador')`;
          await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE, 'ingreso', 'Venta Fraccionado', ${'Fracc ' + venta + 'kg - ' + (body.cliente_nombre||'')}, ${venta*100}, 'contado')`;
          return res.status(200).json({ ok: true, restante: kilos });
        }
      }

      // VENTAS
      if (table === 'ventas') {
        const vid = body.id || 'v_'+Date.now();
        await sql`INSERT INTO ventas (id, producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo, repartidor_id) VALUES (${vid}, ${body.producto_id||'13'}, ${body.cliente_nombre||'Cliente'}, ${parseInt(body.cantidad)||1}, ${parseFloat(body.total)||0}, ${parseFloat(body.flete)||0}, ${body.pago||'contado'}, ${body.tipo_cliente||'consumidor_final'}, ${body.modo||'mostrador'}, ${body.repartidor_id||''})`;
        // Descontar stock
        if (body.producto_id && body.producto_id !== '43.5') {
          const dep = await sql`SELECT * FROM deposito WHERE producto_id=${body.producto_id}`;
          if (dep.rows[0]) {
            const nl = Math.max(0, (parseInt(dep.rows[0].llenas)||0) - (parseInt(body.cantidad)||1));
            const nv = (parseInt(dep.rows[0].vacias)||0) + (parseInt(body.cantidad)||1);
            await sql`UPDATE deposito SET llenas=${nl}, vacias=${nv} WHERE producto_id=${body.producto_id}`;
          }
        }
        // Auto ingreso en finanzas
        await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE, 'ingreso', 'Venta Mostrador', ${'Venta ' + (body.producto_id||'') + ' - ' + (body.cliente_nombre||'')}, ${parseFloat(body.total)||0}, ${body.pago||'contado'})`;
        if ((parseFloat(body.flete)||0) > 0) {
          await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE, 'ingreso', 'Venta Mostrador', ${'Flete - ' + (body.cliente_nombre||'')}, ${parseFloat(body.flete)||0}, ${body.pago||'contado'})`;
        }
        return res.status(200).json({ ok: true, id: vid });
      }

      // TABLAS GENERICAS
      if (table === 'repartidores') { await sql`INSERT INTO repartidores (id, nombre, telefono) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'productos') { await sql`INSERT INTO productos (id, nombre, tipo) VALUES (${body.id}, ${body.nombre}, ${body.tipo||'gas'}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, tipo=${body.tipo||'gas'}`; return res.status(200).json({ ok: true }); }
      if (table === 'clientes') { await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.direccion||''}, ${body.tipo||'consumidor_final'}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}, direccion=${body.direccion||''}, tipo=${body.tipo||'consumidor_final'}`; return res.status(200).json({ ok: true }); }
      if (table === 'proveedores') { await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.rut||''}, ${body.direccion||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}, rut=${body.rut||''}, direccion=${body.direccion||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'finanzas') { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (${body.fecha||new Date().toISOString().split('T')[0]}, ${body.tipo}, ${body.categoria}, ${body.descripcion}, ${parseFloat(body.monto)||0}, ${body.metodo_pago||'contado'})`; return res.status(200).json({ ok: true }); }
      if (table === 'camaras') { await sql`INSERT INTO camaras (id, nombre, url, ubicacion) VALUES (${body.id}, ${body.nombre}, ${body.url||''}, ${body.ubicacion||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, url=${body.url||''}, ubicacion=${body.ubicacion||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'marketing') { await sql`INSERT INTO marketing (id, nombre, tipo, estado, descripcion, presupuesto, conversiones) VALUES (${body.id}, ${body.nombre}, ${body.tipo||'whatsapp'}, ${body.estado||'activa'}, ${body.descripcion||''}, ${parseFloat(body.presupuesto)||0}, ${parseInt(body.conversiones)||0}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, tipo=${body.tipo||'whatsapp'}, estado=${body.estado||'activa'}, descripcion=${body.descripcion||''}, presupuesto=${parseFloat(body.presupuesto)||0}`; return res.status(200).json({ ok: true }); }
      if (table === 'puntos_ref') { await sql`INSERT INTO puntos_ref (id, nombre, lat, lng) VALUES (${body.id}, ${body.nombre}, ${parseFloat(body.lat)||0}, ${parseFloat(body.lng)||0}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, lat=${parseFloat(body.lat)||0}, lng=${parseFloat(body.lng)||0}`; return res.status(200).json({ ok: true }); }
      if (table === 'gps_locations') { await sql`INSERT INTO gps_locations (id, lat, lng, repartidor, fecha) VALUES (${'gps_'+Date.now()}, ${parseFloat(body.lat)||0}, ${parseFloat(body.lng)||0}, ${body.repartidor||''}, NOW())`; return res.status(200).json({ ok: true }); }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ data: [] });
  } catch (e) {
    console.error('API ERROR', e);
    // Nunca devolver HTML 500, siempre JSON 200 para que el front no rompa
    return res.status(200).json({ data: [], error: e.message, ok: false });
  }
}
