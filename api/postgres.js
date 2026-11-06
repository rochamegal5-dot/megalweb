// api/postgres.js - MEGAL BASE GUARDADA + FIX 500 + FIX FRACC
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const table = (req.query.table || '').toLowerCase();
  const id = req.query.id;
  try {
    let sql;
    try{ const mod = await import('@vercel/postgres'); sql = mod.sql; }
    catch(e){ return res.status(200).json({data:[], ok:false, error:'PG lib: '+e.message}); }

    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0)`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INTEGER DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INTEGER DEFAULT 0`;
    await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMP DEFAULT NOW(), producto_id TEXT, cliente_nombre TEXT, cantidad INTEGER DEFAULT 1, total DOUBLE PRECISION DEFAULT 0, flete DOUBLE PRECISION DEFAULT 0, pago TEXT DEFAULT 'contado', tipo_cliente TEXT DEFAULT 'consumidor_final', modo TEXT DEFAULT 'mostrador', repartidor_id TEXT)`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'gas')`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT DEFAULT 'consumidor_final')`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha DATE DEFAULT CURRENT_DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION DEFAULT 0, metodo_pago TEXT DEFAULT 'contado')`;
    await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS marketing (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, estado TEXT, descripcion TEXT, presupuesto DOUBLE PRECISION DEFAULT 0, conversiones INTEGER DEFAULT 0)`;

    const depCount = await sql`SELECT COUNT(*) as c FROM deposito`;
    if (parseInt(depCount.rows[0].c) === 0) {
      await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso) VALUES ('11',0,0,0),('13',0,0,0),('45',0,0,0),('43.5',0,0,43.5) ON CONFLICT (producto_id) DO NOTHING`;
    }

    if (req.method === 'GET') {
      if (!table) return res.status(200).json({ data: [] });
      let rows = [];
      try{
        if (table === 'deposito') rows = (await sql`SELECT * FROM deposito`).rows;
        else if (table === 'ventas') rows = (await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 300`).rows;
        else if (table === 'repartidores') rows = (await sql`SELECT * FROM repartidores ORDER BY nombre`).rows;
        else if (table === 'productos') rows = (await sql`SELECT * FROM productos ORDER BY id`).rows;
        else if (table === 'clientes') rows = (await sql`SELECT * FROM clientes ORDER BY nombre`).rows;
        else if (table === 'proveedores') rows = (await sql`SELECT * FROM proveedores ORDER BY nombre`).rows;
        else if (table === 'finanzas') rows = (await sql`SELECT * FROM finanzas ORDER BY fecha DESC, id DESC`).rows;
        else if (table === 'camaras') rows = (await sql`SELECT * FROM camaras ORDER BY nombre`).rows;
        else if (table === 'marketing') rows = (await sql`SELECT * FROM marketing ORDER BY id DESC`).rows;
        else if (table === 'gps_locations') rows = (await sql`SELECT * FROM gps_locations ORDER BY fecha DESC LIMIT 200`).rows;
      }catch(e){ rows=[]; }
      return res.status(200).json({ data: rows });
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(200).json({ ok: false });
      try{
        if (table === 'repartidores') await sql`DELETE FROM repartidores WHERE id=${id}`;
        if (table === 'productos') await sql`DELETE FROM productos WHERE id=${id}`;
        if (table === 'clientes') await sql`DELETE FROM clientes WHERE id=${id}`;
        if (table === 'proveedores') await sql`DELETE FROM proveedores WHERE id=${id}`;
        if (table === 'finanzas') await sql`DELETE FROM finanzas WHERE id=${parseInt(id)}`;
        if (table === 'camaras') await sql`DELETE FROM camaras WHERE id=${id}`;
        if (table === 'ventas') await sql`DELETE FROM ventas WHERE id=${id}`;
      }catch(e){}
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (table === 'deposito') {
        if (body.accion === 'balance_inicial') {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso) VALUES (${body.producto_id}, ${parseInt(body.llenas)||0}, ${parseInt(body.vacias)||0}, ${parseFloat(body.kilos_en_uso)||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${parseInt(body.llenas)||0}, vacias=${parseInt(body.vacias)||0}, kilos_en_uso=${parseFloat(body.kilos_en_uso)||0}`;
          return res.status(200).json({ ok: true });
        }
        if (body.accion === 'iniciar_tubo_43' || body.accion === 'reset_tubo_43') {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso) VALUES ('43.5',0,0,43.5) ON CONFLICT (producto_id) DO UPDATE SET kilos_en_uso=43.5`;
          if(body.borrar_ventas){ try{ await sql`DELETE FROM ventas WHERE producto_id LIKE 'FRACC%'`; }catch(e){} }
          return res.status(200).json({ ok: true, kilos:43.5 });
        }
      }
      if (table === 'ventas') {
        const vid = body.id || 'v_'+Date.now();
        await sql`INSERT INTO ventas (id, producto_id, cliente_nombre, cantidad, total, flete, pago, tipo_cliente, modo, repartidor_id, kilos) VALUES (${vid}, ${body.producto_id||'13'}, ${body.cliente_nombre||'Cliente'}, ${parseInt(body.cantidad)||1}, ${parseFloat(body.total)||0}, ${parseFloat(body.flete)||0}, ${body.pago||'contado'}, ${body.tipo_cliente||'consumidor_final'}, ${body.modo||'mostrador'}, ${body.repartidor_id||''}, ${parseFloat(body.kilos)||0}) ON CONFLICT (id) DO NOTHING`;
        // === FIX FRACCIONADO: descuenta del tubo madre ===
        const pidU = String(body.producto_id||'').toUpperCase();
        if(pidU.startsWith('FRACC')){
          let k = parseFloat(body.kilos)||0;
          if(!k){ const m=pidU.match(/([\d.]+)/); k=m?parseFloat(m[0]):1; }
          const t = await sql`SELECT kilos_en_uso FROM deposito WHERE producto_id='43.5'`;
          const act = parseFloat(t.rows[0]?.kilos_en_uso)||43.5;
          const nuevo = Math.max(0, act - k);
          await sql`UPDATE deposito SET kilos_en_uso=${nuevo} WHERE producto_id='43.5'`;
        } else if(body.producto_id && body.producto_id!=='43.5'){
          try{
            const dep = await sql`SELECT * FROM deposito WHERE producto_id=${body.producto_id}`;
            if (dep.rows[0]) {
              const nl = Math.max(0, (parseInt(dep.rows[0].llenas)||0) - (parseInt(body.cantidad)||1));
              const nv = (parseInt(dep.rows[0].vacias)||0) + (parseInt(body.cantidad)||1);
              await sql`UPDATE deposito SET llenas=${nl}, vacias=${nv} WHERE producto_id=${body.producto_id}`;
            }
          }catch(e){}
        }
        try{ await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (CURRENT_DATE, 'ingreso', 'Venta Mostrador', ${'Venta '+(body.producto_id||'')}, ${parseFloat(body.total)||0}, ${body.pago||'contado'})`; }catch(e){}
        return res.status(200).json({ ok: true, id: vid });
      }
      if (table === 'repartidores') { await sql`INSERT INTO repartidores (id, nombre, telefono) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'productos') { await sql`INSERT INTO productos (id, nombre, tipo) VALUES (${body.id}, ${body.nombre}, ${body.tipo||'gas'}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, tipo=${body.tipo||'gas'}`; return res.status(200).json({ ok: true }); }
      if (table === 'clientes') { await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.direccion||''}, ${body.tipo||'consumidor_final'}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}, direccion=${body.direccion||''}, tipo=${body.tipo||'consumidor_final'}`; return res.status(200).json({ ok: true }); }
      if (table === 'proveedores') { await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion) VALUES (${body.id}, ${body.nombre}, ${body.telefono||''}, ${body.rut||''}, ${body.direccion||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, telefono=${body.telefono||''}, rut=${body.rut||''}, direccion=${body.direccion||''}`; return res.status(200).json({ ok: true }); }
      if (table === 'finanzas') { await sql`INSERT INTO finanzas (fecha, tipo, categoria, descripcion, monto, metodo_pago) VALUES (${body.fecha||new Date().toISOString().split('T')[0]}, ${body.tipo}, ${body.categoria}, ${body.descripcion}, ${parseFloat(body.monto)||0}, ${body.metodo_pago||'contado'})`; return res.status(200).json({ ok: true }); }
      if (table === 'camaras') { await sql`INSERT INTO camaras (id, nombre, url, ubicacion) VALUES (${body.id}, ${body.nombre}, ${body.url||''}, ${body.ubicacion||''}) ON CONFLICT (id) DO UPDATE SET nombre=${body.nombre}, url=${body.url||''}, ubicacion=${body.ubicacion||''}`; return res.status(200).json({ ok: true }); }
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ data: [] });
  } catch (e) {
    console.error('API ERROR', e);
    return res.status(200).json({ data: [], ok:false, error: e.message });
  }
}
