// api/postgres.js - MEGAL ERP FINAL - Postgres Only - FIX 500 + TUBO 43.5
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const table = (req.query.table || '').toLowerCase();
  const id = req.query.id;

  let sql;
  try {
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
  } catch (e) {
    return res.status(200).json({ data: [], ok: false, error: 'PG lib: ' + e.message });
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0, para_cambio INTEGER DEFAULT 0, en_uso INTEGER DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMP DEFAULT NOW(), producto_id TEXT, cliente_nombre TEXT, cantidad INTEGER DEFAULT 1, total DOUBLE PRECISION DEFAULT 0, flete DOUBLE PRECISION DEFAULT 0, pago TEXT DEFAULT 'contado', tipo_cliente TEXT DEFAULT 'consumidor_final', modo TEXT DEFAULT 'mostrador', repartidor_id TEXT, kilos DOUBLE PRECISION DEFAULT 0, fecha_hora TIMESTAMP DEFAULT NOW(), tipo_venta TEXT DEFAULT 'mostrador')`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'gas', precio DOUBLE PRECISION DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT DEFAULT 'consumidor_final')`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha DATE DEFAULT CURRENT_DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION DEFAULT 0, metodo_pago TEXT DEFAULT 'contado')`;
    await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS marketing (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, estado TEXT, descripcion TEXT, presupuesto DOUBLE PRECISION DEFAULT 0, conversiones INTEGER DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMP DEFAULT NOW(), device_id TEXT, velocidad DOUBLE PRECISION DEFAULT 0, recorded_at TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS puntos_ref (id TEXT PRIMARY KEY, nombre TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, latitud DOUBLE PRECISION, longitud DOUBLE PRECISION)`;
    await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, vehiculo TEXT, patente TEXT, color TEXT, device_id TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS stock_camioneta (id SERIAL PRIMARY KEY, repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS movimientos_stock (id TEXT PRIMARY KEY, tipo TEXT, detalle TEXT, fecha_hora TIMESTAMP DEFAULT NOW())`;

    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INTEGER DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INTEGER DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMP DEFAULT NOW()`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_venta TEXT DEFAULT 'mostrador'`;

    const depCount = await sql`SELECT COUNT(*) as c FROM deposito`;
    if (parseInt(depCount.rows[0].c) === 0) {
      await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes) VALUES ('11',5,3,0,0),('13',8,5,0,0),('45',2,1,0,0),('43.5',0,0,43.5,43.5) ON CONFLICT (producto_id) DO NOTHING`;
    }

    if (req.method === 'GET') {
      if (!table) return res.status(200).json({ data: [] });
      let rows = [];
      try {
        if (table === 'deposito' || table === 'stock_deposito') rows = (await sql`SELECT * FROM deposito`).rows;
        else if (table === 'ventas') rows = (await sql`SELECT * FROM ventas ORDER BY fecha DESC, fecha_hora DESC LIMIT 500`).rows;
        else if (table === 'productos') rows = (await sql`SELECT * FROM productos ORDER BY id`).rows;
        else if (table === 'clientes') rows = (await sql`SELECT * FROM clientes ORDER BY nombre`).rows;
        else if (table === 'proveedores') rows = (await sql`SELECT * FROM proveedores ORDER BY nombre`).rows;
        else if (table === 'finanzas') rows = (await sql`SELECT * FROM finanzas ORDER BY fecha DESC, id DESC`).rows;
        else if (table === 'camaras') rows = (await sql`SELECT * FROM camaras ORDER BY nombre`).rows;
        else if (table === 'marketing') rows = (await sql`SELECT * FROM marketing ORDER BY id DESC`).rows;
        else if (table === 'gps_locations' || table === 'gps') rows = (await sql`SELECT * FROM gps_locations ORDER BY fecha DESC LIMIT 300`).rows;
        else if (table === 'puntos_ref' || table === 'puntos_referencia') rows = (await sql`SELECT * FROM puntos_ref`).rows;
        else if (table === 'repartidores') rows = (await sql`SELECT * FROM repartidores ORDER BY nombre`).rows;
        else if (table === 'stock_camioneta' || table === 'camionetas') rows = (await sql`SELECT * FROM stock_camioneta`).rows;
        else if (table === 'movimientos_stock' || table === 'movimientos') rows = (await sql`SELECT * FROM movimientos_stock ORDER BY fecha_hora DESC LIMIT 100`).rows;
      } catch (e) { rows = []; }
      return res.status(200).json({ data: rows, ok: true });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(200).json({ ok: false, error: 'falta id' });
      try {
        if (table === 'productos') await sql`DELETE FROM productos WHERE id=${id}`;
        else if (table === 'clientes') await sql`DELETE FROM clientes WHERE id=${id}`;
        else if (table === 'proveedores') await sql`DELETE FROM proveedores WHERE id=${id}`;
        else if (table === 'finanzas') await sql`DELETE FROM finanzas WHERE id=${parseInt(id)}`;
        else if (table === 'camaras') await sql`DELETE FROM camaras WHERE id=${id}`;
        else if (table === 'marketing') await sql`DELETE FROM marketing WHERE id=${id}`;
        else if (table === 'ventas') await sql`DELETE FROM ventas WHERE id=${id}`;
        else if (table === 'repartidores') await sql`DELETE FROM repartidores WHERE id=${id}`;
        else if (table === 'puntos_ref') await sql`DELETE FROM puntos_ref WHERE id=${id}`;
      } catch (e) {}
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      if (table === 'deposito') {
        if (body.accion === 'balance_inicial') {
          const balances = body.balances || [{ producto_id: body.producto_id, llenas: body.llenas, vacias: body.vacias, kilos_en_uso: body.kilos_en_uso }];
          for (const b of balances) {
            await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, kilos_en_uso, kilos_restantes) VALUES (${b.producto_id}, ${b.llenas||0}, ${b.vacias||0}, ${b.cambio||0}, ${b.kilos_en_uso||0}, ${b.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${b.llenas||0}, vacias=${b.vacias||0}, para_cambio=${b.cambio||0}, kilos_en_uso=${b.kilos_en_uso||0}, kilos_restantes=${b.kilos_en_uso||0}`;
          }
          return res.status(200).json({ ok: true });
        }
        if (body.accion === 'reset_tubo_43' || body.accion === 'iniciar_tubo_43') {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes) VALUES ('43.5',0,0,43.5,43.5) ON CONFLICT (producto_id) DO UPDATE SET kilos_en_uso=43.5, kilos_restantes=43.5`;
          if (body.borrar_ventas) { try { await sql`DELETE FROM ventas WHERE producto_id LIKE 'FRACC%' OR producto_id='fraccionado'`; } catch (e) {} }
          return res.status(200).json({ ok: true, kilos: 43.5 });
        }
        if (body.accion === 'venta_fraccionada') {
          const k = parseFloat(body.kilos) || 1;
          const dep = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
          let actual = parseFloat(dep.rows[0]?.kilos_en_uso ?? 43.5);
          if (isNaN(actual)) actual = 43.5;
          const nuevo = Math.max(0, actual - k);
          if (nuevo < 0.5) await sql`UPDATE deposito SET kilos_en_uso=0, kilos_restantes=0, llenas=llenas-1, vacias=vacias+1 WHERE producto_id='43.5'`;
          else await sql`UPDATE deposito SET kilos_en_uso=${nuevo}, kilos_restantes=${nuevo} WHERE producto_id='43.5'`;
          return res.status(200).json({ ok: true, restante: nuevo });
        }
      }

      if (table === 'ventas') {
        const vid = body.id || 'v_' + Date.now();
        const pidU = String(body.producto_id || '').toUpperCase();
        let kilosVend = parseFloat(body.kilos) || 0;
        if (!kilosVend && pidU.startsWith('FRACC')) { const m = pidU.match(/([\d.]+)/); kilosVend = m ? parseFloat(m[0]) : 1; }
        if (!kilosVend && body.producto_id === 'fraccionado') kilosVend = parseFloat(body.kilos) || 1;

        await sql`INSERT INTO ventas (id, producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo, repartidor_id, kilos, tipo_venta, fecha_hora) VALUES (${vid}, ${body.producto_id||'13'}, ${body.cliente_nombre||'Cliente'}, ${parseInt(body.cantidad)||1}, ${parseFloat(body.total)||0}, ${parseFloat(body.flete)||0}, ${body.pago||'contado'}, ${body.tipo_cliente||'consumidor_final'}, ${body.modo||'mostrador'}, ${body.repartidor_id||''}, ${kilosVend}, ${body.tipo_venta||'mostrador'}, ${body.fecha_hora||new Date().toISOString()}) ON CONFLICT (id) DO NOTHING`;

        if (pidU.startsWith('FRACC') || body.producto_id === 'fraccionado') {
          try {
            const dep = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
            let actual = parseFloat(dep.rows[0]?.kilos_en_uso ?? 43.5);
            if (isNaN(actual)) actual = 43.5;
            const nuevo = Math.max(0, actual - kilosVend);
            if (dep.rows.length === 0) await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes) VALUES ('43.5',0,0,${nuevo},${nuevo}) ON CONFLICT (producto_id) DO UPDATE SET kilos_en_uso=${nuevo}, kilos_restantes=${nuevo}`;
            else if (nuevo < 0.5) await sql`UPDATE deposito SET kilos_en_uso=0, kilos_restantes=0, llenas=llenas-1, vacias=vacias+1 WHERE producto_id='43.5'`;
            else await sql`UPDATE deposito SET kilos_en_uso=${nuevo}, kilos_restantes=${nuevo} WHERE producto_id='43.5'`;
          } catch (e) { console.log('FRACC update error', e.message); }
        } else if (body.producto_id && body.producto_id !== '43.5' && !pidU.startsWith('FRACC')) {
          try {
            const dep = await sql`SELECT * FROM deposito WHERE producto_id=${body.producto_id}`;
            if (dep.rows[0]) {
              const nl = Math.max(0, (parseInt(dep.rows[0].llenas)||0) - (parseInt(body.cantidad)||1));
              const nv = (parseInt(dep.rows[0].vacias)||0) + (parseInt(body.cantidad)||1);
              await sql`UPDATE deposito SET llenas=${nl}, vacias=${nv} WHERE producto_id=${body.producto_id}`;
            }
          } catch (e) {}
        }
        try { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE, 'ingreso', 'Venta Mostrador', ${'Venta '+(body.producto_id||'')+' '+(body.cliente_nombre||'')}, ${parseFloat(body.total)||0}, ${body.pago||'contado'})`; } catch (e) {}
        return res.status(200).json({ ok: true, id: vid, fracc: pidU.startsWith('FRACC'), kilos: kilosVend });
      }

      if (table === 'productos') { await sql`INSERT INTO productos (id, nombre, tipo, precio) VALUES (${body.id}, ${body.nombre}, ${body.tipo||'gas'}, ${parseFloat(body.precio)||0}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, tipo=${body.tipo||'gas'}, precio=${parseFloat(body.precio)||0}`; return res.status(200).json({ ok: true }); }
      if (table === 'clientes') { await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.direccion||''}, ${body.tipo||'consumidor_final'}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}, direccion=${body.direccion||''}, tipo=${body.tipo||'consumidor_final'}`; return res.status(200).json({ ok: true }); }
      if (table === 'proveedores') { await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.rut||''}, ${body.direccion||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}, rut=${body.rut||''}, direccion=${body.direccion||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'repartidores') { await sql`INSERT INTO repartidores (id, nombre, telefono, vehiculo, patente, color, device_id) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.vehiculo||''}, ${body.patente||''}, ${body.color||'#3b82f6'}, ${body.device_id||body.id}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'puntos_ref') { await sql`INSERT INTO puntos_ref (id, nombre, lat, lng, latitud, longitud) VALUES (${body.id}, ${body.nombre}, ${parseFloat(body.lat)||0}, ${parseFloat(body.lng)||0}, ${parseFloat(body.latitud||body.lat)||0}, ${parseFloat(body.longitud||body.lng)||0}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}`; return res.status(200).json({ ok: true }); }
      if (table === 'finanzas') { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (${body.fecha||new Date().toISOString().split('T')[0]}, ${body.tipo}, ${body.categoria}, ${body.descripcion}, ${parseFloat(body.monto)||0}, ${body.metodo_pago||'contado'})`; return res.status(200).json({ ok: true }); }
      if (table === 'camaras') { await sql`INSERT INTO camaras (id, nombre, url, ubicacion) VALUES (${body.id}, ${body.nombre}, ${body.url||''}, ${body.ubicacion||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, url=${body.url||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'marketing') { await sql`INSERT INTO marketing (id, nombre, tipo, estado, descripcion, presupuesto, conversiones) VALUES (${body.id}, ${body.nombre}, ${body.tipo||'whatsapp'}, ${body.estado||'activa'}, ${body.descripcion||''}, ${parseFloat(body.presupuesto)||0}, ${parseInt(body.conversiones)||0}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}`; return res.status(200).json({ ok: true }); }

      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ data: [], ok: true });
  } catch (e) {
    console.error('API ERROR', e);
    return res.status(200).json({ data: [], ok: false, error: e.message });
  }
}
