// api/postgres.js - UNICO BACKEND - POSTGRES ONLY
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const table = (req.query.table || '').toLowerCase();
  const id = req.query.id;
  let sql;
  try { const m = await import('@vercel/postgres'); sql = m.sql; }
  catch (e) { return res.status(200).json({ data: [], ok: false, error: e.message }); }

  try {
    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0, para_cambio INTEGER DEFAULT 0, en_uso INTEGER DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMP DEFAULT NOW(), producto_id TEXT, cliente_nombre TEXT, cantidad INTEGER DEFAULT 1, total DOUBLE PRECISION DEFAULT 0, flete DOUBLE PRECISION DEFAULT 0, pago TEXT DEFAULT 'contado', tipo_cliente TEXT DEFAULT 'consumidor_final', modo TEXT DEFAULT 'mostrador', repartidor_id TEXT, kilos DOUBLE PRECISION DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'gas', precio DOUBLE PRECISION DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT DEFAULT 'consumidor_final')`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
   await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
await sql`ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS nombre TEXT DEFAULT ''`;
await sql`ALTER TABLE repartidores ADD COLUMN IF NOT EXISTS telefono TEXT DEFAULT ''`;
await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_venta DOUBLE PRECISION DEFAULT 0`;
await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_compra DOUBLE PRECISION DEFAULT 0`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha DATE DEFAULT CURRENT_DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION DEFAULT 0, metodo_pago TEXT DEFAULT 'contado')`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    // FIX: tu tabla ventas ya existe pero le faltan columnas, hay que agregarlas
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS repartidor_id TEXT DEFAULT ''`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_cliente TEXT DEFAULT 'consumidor_final'`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS modo TEXT DEFAULT 'mostrador'`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS pago TEXT DEFAULT 'contado'`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS flete DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS total DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cantidad INTEGER DEFAULT 1`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_nombre TEXT DEFAULT 'Cliente'`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS producto_id TEXT DEFAULT '13'`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_hora TIMESTAMP DEFAULT NOW()`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_venta TEXT DEFAULT 'mostrador'`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_en_uso DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INTEGER DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_local TEXT DEFAULT ''`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS hoy TEXT DEFAULT ''`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'mostrador'`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'solo_gas'`;
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, repartidor_id TEXT, device_id TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, velocidad DOUBLE PRECISION, speed DOUBLE PRECISION, bateria DOUBLE PRECISION, battery DOUBLE PRECISION, fecha_local TEXT, hoy TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS puntos_ref (id TEXT PRIMARY KEY, nombre TEXT, direccion TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, latitud DOUBLE PRECISION, longitud DOUBLE PRECISION)`;

    const c = await sql`SELECT COUNT(*) as c FROM deposito`;
    if (parseInt(c.rows[0].c) === 0) {
      await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes) VALUES ('11',5,3,0,0),('13',8,5,0,0),('45',2,1,0,0),('43.5',0,0,43.5,43.5) ON CONFLICT (producto_id) DO NOTHING`;
    }

    if (req.method === 'GET') {
      let rows = [];
      if (table === 'deposito') rows = (await sql`SELECT * FROM deposito`).rows;
      else if (table === 'ventas') rows = (await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 500`).rows;
      else if (table === 'productos') rows = (await sql`SELECT * FROM productos ORDER BY id`).rows;
      else if (table === 'clientes') rows = (await sql`SELECT * FROM clientes ORDER BY nombre`).rows;
      else if (table === 'proveedores') rows = (await sql`SELECT * FROM proveedores ORDER BY nombre`).rows;
      else if (table === 'repartidores') rows = (await sql`SELECT * FROM repartidores ORDER BY nombre`).rows;
      else if (table === 'gps_locations') rows = (await sql`SELECT * FROM gps_locations ORDER BY created_at DESC LIMIT 5000`).rows;
      else if (table === 'puntos_ref') rows = (await sql`SELECT * FROM puntos_ref ORDER BY nombre`).rows;  
      else if (table === 'finanzas') rows = (await sql`SELECT * FROM finanzas ORDER BY fecha DESC LIMIT 200`).rows;
      return res.status(200).json({ data: rows, ok: true });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(200).json({ ok: false, error: 'falta id' });
      try {
        if (table === 'ventas') await sql`DELETE FROM ventas WHERE id=${id}`;
        else if (table === 'productos') await sql`DELETE FROM productos WHERE id=${id}`;
        else if (table === 'clientes') await sql`DELETE FROM clientes WHERE id=${id}`;
        else if (table === 'proveedores') await sql`DELETE FROM proveedores WHERE id=${id}`;
        else if (table === 'repartidores') await sql`DELETE FROM repartidores WHERE id=${id}`;
        else if (table === 'finanzas') await sql`DELETE FROM finanzas WHERE id=${parseInt(id)}`;
         else if (table === 'puntos_ref') await sql`DELETE FROM puntos_ref WHERE id=${id}`;
      } catch (e) {}
      return res.status(200).json({ ok: true });
    }
 


    
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

      // === TUBO: reset / venta directa desde Stock ===
      if (table === 'deposito') {
        if (body.accion === 'reset_tubo_43' || body.accion === 'iniciar_tubo_43') {
          await sql`UPDATE deposito SET kilos_en_uso=43.5, kilos_restantes=43.5 WHERE producto_id='43.5'`;
          if (body.borrar_ventas) {
            await sql`DELETE FROM ventas WHERE producto_id LIKE 'FRACC%' OR producto_id='fraccionado' OR cliente_nombre='PRUEBA'`;
            await sql`DELETE FROM finanzas WHERE categoria='Venta' AND fecha = CURRENT_DATE`;
          }
          return res.status(200).json({ ok: true, kilos: 43.5, restante: 43.5 });
        }
        if (body.accion === 'venta_fraccionada') {
          const k = parseFloat(body.kilos) || 1;
          const dep = await sql`SELECT kilos_en_uso FROM deposito WHERE producto_id='43.5'`;
          let actual = parseFloat(dep.rows[0]?.kilos_en_uso);
          if (isNaN(actual)) actual = 43.5;
          const nuevo = Math.max(0, actual - k);
          await sql`UPDATE deposito SET kilos_en_uso=${nuevo}, kilos_restantes=${nuevo} WHERE producto_id='43.5'`;
          return res.status(200).json({ ok: true, restante: nuevo, fracc: true });
        }
      }

      // === VENTAS - ACÁ ESTABA EL BUG ===
      if (table === 'ventas') {
        const vid = body.id || 'v_' + Date.now();
        const pidRaw = String(body.producto_id || '');
        const pidU = pidRaw.toUpperCase();

        // Detecta fraccionado de CUALQUIER forma que lo mande tu front
        const esFracc = pidU.includes('FRACC') || pidU === 'FRACCIONADO' || body.accion === 'venta_fraccionada';

        // Kilos: prioridad 1) body.kilos 2) número en FRACC_1.5 3) 1 por defecto
        let kilosVend = parseFloat(body.kilos);
        if (isNaN(kilosVend) || kilosVend === 0) {
          const m = pidU.match(/([\d]+(?:\.[\d]+)?)/);
          // FRACC_1 -> 1, FRACC_1.5 -> 1.5, pero 13/11 NO son fracc, no entra acá
          kilosVend = (esFracc && m) ? parseFloat(m[0]) : 0;
          if (esFracc && (!kilosVend || kilosVend > 10)) kilosVend = 1; // si agarró 43.5, corrige a 1
        }
        // Si es fraccionado y viene cantidad >1 (ej 2 x 1kg) multiplica
        if (esFracc && body.cantidad) kilosVend = kilosVend * 1; // ya viene kilos totales desde front, no multiplicar

        const fechaParaGuardar = body.fecha || body.fecha_hora || new Date().toISOString();
        const fechaLocalParaGuardar = body.fecha_local || '';
        const hoyParaGuardar = body.hoy || fechaParaGuardar.split('T')[0];
        const canalParaGuardar = body.canal || body.modo || 'mostrador';
        const tipoParaGuardar = body.tipo || body.tipo_venta || 'solo_gas';

        await sql`INSERT INTO ventas (id, fecha, fecha_hora, fecha_local, hoy, canal, tipo, tipo_venta, producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo, repartidor_id, kilos) VALUES (${vid}, ${fechaParaGuardar}, ${fechaParaGuardar}, ${fechaLocalParaGuardar}, ${hoyParaGuardar}, ${canalParaGuardar}, ${tipoParaGuardar}, ${tipoParaGuardar}, ${pidRaw || '13'}, ${body.cliente_nombre || 'Cliente'}, ${parseInt(body.cantidad) || 1}, ${parseFloat(body.total) || 0}, ${parseFloat(body.flete) || 0}, ${body.pago || 'contado'}, ${body.tipo_cliente || 'consumidor_final'}, ${body.modo || 'mostrador'}, ${body.repartidor_id || ''}, ${kilosVend || 0}) ON CONFLICT (id) DO NOTHING`;

        let restante = null;
        if (esFracc) {
          const dep = await sql`SELECT kilos_en_uso FROM deposito WHERE producto_id='43.5'`;
          let actual = parseFloat(dep.rows[0]?.kilos_en_uso);
          if (isNaN(actual)) actual = 43.5;
          restante = Math.max(0, actual - kilosVend);
          // UPDATE SIN try/catch mudo - si falla, que lo veas
          await sql`UPDATE deposito SET kilos_en_uso=${restante}, kilos_restantes=${restante} WHERE producto_id='43.5'`;
        } else if (pidRaw && pidRaw !== '43.5') {
          const dep = await sql`SELECT * FROM deposito WHERE producto_id=${pidRaw}`;
          if (dep.rows[0]) {
            const nl = Math.max(0, (dep.rows[0].llenas || 0) - (parseInt(body.cantidad) || 1));
            const nv = (dep.rows[0].vacias || 0) + (parseInt(body.cantidad) || 1);
            await sql`UPDATE deposito SET llenas=${nl}, vacias=${nv} WHERE producto_id=${pidRaw}`;
          }
        }
        try { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE,'ingreso','Venta',${'Venta ' + pidRaw},${parseFloat(body.total) || 0},${body.pago || 'contado'})`; } catch (e) {}
        return res.status(200).json({ ok: true, id: vid, fracc: esFracc, kilos: kilosVend, restante });
      }

     if (table === 'productos') { const pv = parseFloat(body.precio_venta ?? body.precio ?? body.venta ?? 0) || 0; const pc = parseFloat(body.precio_compra ?? body.compra ?? 0) || 0; await sql`INSERT INTO productos (id, nombre, tipo, precio, precio_venta, precio_compra) VALUES (${body.id}, ${body.nombre}, ${body.tipo || 'gas'}, ${pv}, ${pv}, ${pc}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, tipo=${body.tipo || 'gas'}, precio=${pv}, precio_venta=${pv}, precio_compra=${pc}`; return res.status(200).json({ ok: true }); }
      if (table === 'clientes') { await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo) VALUES (${body.id}, ${body.nombre}, ${body.telefono || ''}, ${body.direccion || ''}, ${body.tipo || 'consumidor_final'}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}`; return res.status(200).json({ ok: true }); }
      if (table === 'proveedores') { await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion) VALUES (${body.id}, ${body.nombre}, ${body.telefono || ''}, ${body.rut || ''}, ${body.direccion || ''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}`; return res.status(200).json({ ok: true }); }
     if (table === 'repartidores') { await sql`INSERT INTO repartidores (id, nombre, telefono) VALUES (${body.id}, ${body.nombre}, ${body.telefono || ''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono || ''}`; return res.status(200).json({ ok: true }); }
     if (table === 'gps_locations') {
  const lat = parseFloat(body.lat ?? body.latitude ?? 0) || 0;
  const lng = parseFloat(body.lng ?? body.longitude ?? 0) || 0;
  const vel = parseFloat(body.velocidad ?? body.speed ?? 0) || 0;
  const bat = parseFloat(body.bateria ?? body.battery ?? 0) || 0;
  const repId = String(body.repartidor_id || body.device_id || body.repartidor || '');
  const fechaLocal = body.fecha_local || body.hoy || new Date().toLocaleDateString('en-CA',{timeZone:'America/Montevideo'});
  await sql`INSERT INTO gps_locations (repartidor_id, device_id, lat, lng, latitude, longitude, velocidad, speed, bateria, battery, fecha_local, hoy) VALUES (${repId}, ${repId}, ${lat}, ${lng}, ${lat}, ${lng}, ${vel}, ${vel}, ${bat}, ${bat}, ${fechaLocal}, ${fechaLocal})`;
  return res.status(200).json({ ok: true });
}
if (table === 'puntos_ref') { await sql`INSERT INTO puntos_ref (id, nombre, direccion, lat, lng, latitud, longitud) VALUES (${body.id}, ${body.nombre}, ${body.direccion||''}, ${parseFloat(body.lat||body.latitud)||0}, ${parseFloat(body.lng||body.longitud)||0}, ${parseFloat(body.lat||body.latitud)||0}, ${parseFloat(body.lng||body.longitud)||0}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, direccion=${body.direccion||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'finanzas') { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (${body.fecha || new Date().toISOString().split('T')[0]}, ${body.tipo}, ${body.categoria}, ${body.descripcion}, ${parseFloat(body.monto) || 0}, ${body.metodo_pago || 'contado'})`; return res.status(200).json({ ok: true }); }
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ data: [], ok: true });
  } catch (e) {
    console.error('API ERROR', e);
    return res.status(200).json({ data: [], ok: false, error: e.message });
  }
}
