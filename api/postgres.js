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
    await sql`CREATE TABLE IF NOT EXISTS cierres (id TEXT PRIMARY KEY, repartidor_id TEXT DEFAULT '', tipo TEXT DEFAULT 'parcial', monto DOUBLE PRECISION DEFAULT 0, detalle TEXT DEFAULT '', total_vendido DOUBLE PRECISION DEFAULT 0, fecha TIMESTAMP DEFAULT NOW())`;
await sql`CREATE TABLE IF NOT EXISTS jornadas (id TEXT PRIMARY KEY, repartidor_id TEXT DEFAULT '', fecha TEXT DEFAULT '', hora_salida TEXT DEFAULT '', hora_cierre TEXT DEFAULT '', km_inicio INTEGER DEFAULT 0, stock_11_inicial INTEGER DEFAULT 0, stock_13_inicial INTEGER DEFAULT 0, stock_45_inicial INTEGER DEFAULT 0, cambio_inicial DOUBLE PRECISION DEFAULT 0, estado TEXT DEFAULT 'abierta')`;
await sql`CREATE TABLE IF NOT EXISTS stock_camioneta (id TEXT PRIMARY KEY, repartidor_id TEXT DEFAULT '', producto_id TEXT DEFAULT '', llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0)`;
await sql`CREATE TABLE IF NOT EXISTS stock_deposito (id TEXT PRIMARY KEY, producto_id TEXT DEFAULT '', llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0)`;
await sql`CREATE TABLE IF NOT EXISTS movimientos_stock (id TEXT PRIMARY KEY, tipo_mov TEXT DEFAULT '', producto_id TEXT DEFAULT '', repartidor_id TEXT DEFAULT '', llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, defectuosas INTEGER DEFAULT 0, observaciones TEXT DEFAULT '', referencia_id TEXT DEFAULT '', fecha TIMESTAMP DEFAULT NOW())`;
await sql`CREATE TABLE IF NOT EXISTS puntos_ruta (id TEXT PRIMARY KEY, nombre TEXT DEFAULT '', telefono TEXT DEFAULT '', latitud DOUBLE PRECISION DEFAULT 0, longitud DOUBLE PRECISION DEFAULT 0, tipo TEXT DEFAULT '', categoria TEXT DEFAULT '', fecha TIMESTAMP DEFAULT NOW())`;
await sql`CREATE TABLE IF NOT EXISTS configuraciones (id TEXT PRIMARY KEY, clave TEXT DEFAULT '', valor TEXT DEFAULT '')`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'mostrador'`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_id TEXT DEFAULT ''`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cantidad_llenas INTEGER DEFAULT 0`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cantidad_vacias INTEGER DEFAULT 0`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cantidad_defectuosas INTEGER DEFAULT 0`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'efectivo'`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Cobrado'`;
await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS flete DOUBLE PRECISION DEFAULT 0`;
await sql`ALTER TABLE puntos_ref ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT ''`;
await sql`ALTER TABLE puntos_ref ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT ''`;
    
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
      else if (table === 'cierres') rows = (await sql`SELECT * FROM cierres ORDER BY fecha DESC LIMIT 200`).rows;
else if (table === 'jornadas') rows = (await sql`SELECT * FROM jornadas ORDER BY fecha DESC LIMIT 200`).rows;
else if (table === 'stock_camioneta') rows = (await sql`SELECT * FROM stock_camioneta`).rows;
else if (table === 'stock_deposito') rows = (await sql`SELECT * FROM stock_deposito`).rows;
else if (table === 'movimientos_stock') rows = (await sql`SELECT * FROM movimientos_stock ORDER BY fecha DESC LIMIT 500`).rows;
else if (table === 'puntos_ruta') rows = (await sql`SELECT * FROM puntos_ruta ORDER BY nombre`).rows;
else if (table === 'configuraciones') rows = (await sql`SELECT * FROM configuraciones`).rows;
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
        else if (table === 'cierres') await sql`DELETE FROM cierres WHERE id=${id}`;
else if (table === 'jornadas') await sql`DELETE FROM jornadas WHERE id=${id}`;
else if (table === 'movimientos_stock') await sql`DELETE FROM movimientos_stock WHERE id=${id}`;
else if (table === 'puntos_ruta') await sql`DELETE FROM puntos_ruta WHERE id=${id}`;
else if (table === 'stock_camioneta') await sql`DELETE FROM stock_camioneta WHERE id=${id}`;
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

      // === VENTAS ===
      if (table === 'ventas') {
        const vid = body.id || 'v_' + Date.now();
        const pidRaw = String(body.producto_id || '');
        const pidU = pidRaw.toUpperCase();
        const esFracc = pidU.includes('FRACC') || pidU === 'FRACCIONADO' || body.accion === 'venta_fraccionada';
        const esApp = body.origen === 'app' || body.canal === 'app';
        let kilosVend = parseFloat(body.kilos);
        if (isNaN(kilosVend) || kilosVend === 0) {
          const m = pidU.match(/([\d]+(?:\.[\d]+)?)/);
          kilosVend = (esFracc && m) ? parseFloat(m[0]) : 0;
          if (esFracc && (!kilosVend || kilosVend > 10)) kilosVend = 1;
        }
        if (esFracc && body.cantidad) kilosVend = kilosVend * 1;
        const fechaParaGuardar = body.fecha || body.fecha_hora || new Date().toISOString();
        const fechaLocalParaGuardar = body.fecha_local || '';
        const hoyParaGuardar = body.hoy || fechaParaGuardar.split('T')[0];
        const canalParaGuardar = body.canal || body.origen || body.modo || 'mostrador';
        const tipoParaGuardar = body.tipo || body.tipo_venta || 'solo_gas';
        const cantParaGuardar = parseInt(body.cantidad_llenas ?? body.cantidad) || 1;
        const pagoParaGuardar = body.metodo_pago || body.pago || 'contado';
        const clienteNombreParaGuardar = body.cliente_nombre || body.cliente || 'Cliente';

        await sql`INSERT INTO ventas (id, fecha, fecha_hora, fecha_local, hoy, canal, tipo, tipo_venta, producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo, repartidor_id, kilos, origen, cliente_id, cantidad_llenas, cantidad_vacias, cantidad_defectuosas, metodo_pago, estado) VALUES (${vid}, ${fechaParaGuardar}, ${fechaParaGuardar}, ${fechaLocalParaGuardar}, ${hoyParaGuardar}, ${canalParaGuardar}, ${tipoParaGuardar}, ${tipoParaGuardar}, ${pidRaw || '13'}, ${clienteNombreParaGuardar}, ${cantParaGuardar}, ${parseFloat(body.total) || 0}, ${parseFloat(body.flete) || 0}, ${pagoParaGuardar}, ${body.tipo_cliente || 'consumidor_final'}, ${body.modo || 'mostrador'}, ${body.repartidor_id || ''}, ${kilosVend || 0}, ${body.origen || 'mostrador'}, ${body.cliente_id || ''}, ${parseInt(body.cantidad_llenas ?? body.cantidad) || 1}, ${parseInt(body.cantidad_vacias) || 0}, ${parseInt(body.cantidad_defectuosas) || 0}, ${pagoParaGuardar}, ${body.estado || 'Cobrado'}) ON CONFLICT (id) DO UPDATE SET total=${parseFloat(body.total)||0}, estado=${body.estado||'Cobrado'}, metodo_pago=${pagoParaGuardar}, pago=${pagoParaGuardar}`;

        let restante = null;
        if (esFracc) {
          const dep = await sql`SELECT kilos_en_uso FROM deposito WHERE producto_id='43.5'`;
          let actual = parseFloat(dep.rows[0]?.kilos_en_uso);
          if (isNaN(actual)) actual = 43.5;
          restante = Math.max(0, actual - kilosVend);
          await sql`UPDATE deposito SET kilos_en_uso=${restante}, kilos_restantes=${restante} WHERE producto_id='43.5'`;
        } else if (!esApp && pidRaw && pidRaw !== '43.5') {
          // Solo Mostrador descuenta de deposito. La APP ya descontó de camioneta.
          const dep = await sql`SELECT * FROM deposito WHERE producto_id=${pidRaw}`;
          if (dep.rows[0]) {
            const nl = Math.max(0, (dep.rows[0].llenas || 0) - cantParaGuardar);
            const nv = (dep.rows[0].vacias || 0) + cantParaGuardar;
            await sql`UPDATE deposito SET llenas=${nl}, vacias=${nv} WHERE producto_id=${pidRaw}`;
          }
        }
        try { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE,'ingreso','Venta',${'Venta ' + pidRaw},${parseFloat(body.total) || 0},${pagoParaGuardar})`; } catch (e) {}
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
      // === APP GAS - ESTO FALTABA ===
      if (table === 'cierres') { await sql`INSERT INTO cierres (id, repartidor_id, tipo, monto, detalle, total_vendido, fecha) VALUES (${body.id}, ${body.repartidor_id||''}, ${body.tipo||'parcial'}, ${parseFloat(body.monto)||0}, ${body.detalle||''}, ${parseFloat(body.total_vendido)||0}, ${body.fecha||new Date().toISOString()}) ON CONFLICT (id) DO UPDATE SET monto=${parseFloat(body.monto)||0}, tipo=${body.tipo||'parcial'}`; return res.status(200).json({ ok: true }); }
      if (table === 'jornadas') { await sql`INSERT INTO jornadas (id, repartidor_id, fecha, hora_salida, hora_cierre, km_inicio, stock_11_inicial, stock_13_inicial, stock_45_inicial, cambio_inicial, estado) VALUES (${body.id}, ${body.repartidor_id||''}, ${body.fecha||''}, ${body.hora_salida||''}, ${body.hora_cierre||''}, ${parseInt(body.km_inicio)||0}, ${parseInt(body.stock_11_inicial)||0}, ${parseInt(body.stock_13_inicial)||0}, ${parseInt(body.stock_45_inicial)||0}, ${parseFloat(body.cambio_inicial)||0}, ${body.estado||'abierta'}) ON CONFLICT (id) DO UPDATE SET estado=${body.estado||'abierta'}, hora_cierre=${body.hora_cierre||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'stock_camioneta') { await sql`INSERT INTO stock_camioneta (id, repartidor_id, producto_id, llenas, vacias, defectuosas) VALUES (${body.id}, ${body.repartidor_id||''}, ${String(body.producto_id||'')}, ${parseInt(body.llenas)||0}, ${parseInt(body.vacias)||0}, ${parseInt(body.defectuosas)||0}) ON CONFLICT (id) DO UPDATE SET llenas=${parseInt(body.llenas)||0}, vacias=${parseInt(body.vacias)||0}, defectuosas=${parseInt(body.defectuosas)||0}`; return res.status(200).json({ ok: true }); }
      if (table === 'stock_deposito') { await sql`INSERT INTO stock_deposito (id, producto_id, llenas, vacias, defectuosas) VALUES (${body.id}, ${String(body.producto_id||'')}, ${parseInt(body.llenas)||0}, ${parseInt(body.vacias)||0}, ${parseInt(body.defectuosas)||0}) ON CONFLICT (id) DO UPDATE SET llenas=${parseInt(body.llenas)||0}, vacias=${parseInt(body.vacias)||0}, defectuosas=${parseInt(body.defectuosas)||0}`; return res.status(200).json({ ok: true }); }
      if (table === 'movimientos_stock') { await sql`INSERT INTO movimientos_stock (id, tipo_mov, producto_id, repartidor_id, llenas, vacias, defectuosas, observaciones, referencia_id, fecha) VALUES (${body.id}, ${body.tipo_mov||''}, ${String(body.producto_id||'')}, ${body.repartidor_id||''}, ${parseInt(body.llenas)||0}, ${parseInt(body.vacias)||0}, ${parseInt(body.defectuosas)||0}, ${body.observaciones||''}, ${body.referencia_id||''}, ${body.fecha||new Date().toISOString()}) ON CONFLICT (id) DO NOTHING`; return res.status(200).json({ ok: true }); }
      if (table === 'puntos_ruta') { await sql`INSERT INTO puntos_ruta (id, nombre, telefono, latitud, longitud, tipo, categoria, fecha) VALUES (${body.id}, ${body.nombre||''}, ${body.telefono||''}, ${parseFloat(body.latitud)||0}, ${parseFloat(body.longitud)||0}, ${body.tipo||''}, ${body.categoria||body.tipo||''}, ${body.fecha||new Date().toISOString()}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'configuraciones') { await sql`INSERT INTO configuraciones (id, clave, valor) VALUES (${body.id||body.clave}, ${body.clave||''}, ${String(body.valor||'')}) ON CONFLICT (id) DO UPDATE SET valor=${String(body.valor||'')}`; return res.status(200).json({ ok: true }); }
      return res.status(200).json({ ok: true });
    }
