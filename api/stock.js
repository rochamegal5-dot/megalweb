// /api/stock.js - STOCK 100% POSTGRES - sin @libsql/client - Reemplaza al viejo Turso
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let sql;
  try {
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'No postgres lib: ' + e.message });
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0, para_cambio INTEGER DEFAULT 0, en_uso INTEGER DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'gas', precio DOUBLE PRECISION DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS stock_camioneta (id SERIAL PRIMARY KEY, repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS movimientos_stock (id TEXT PRIMARY KEY, tipo TEXT, detalle TEXT, fecha_hora TIMESTAMP DEFAULT NOW(), producto_id TEXT, cantidad INTEGER DEFAULT 0, repartidor_id TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS ventas_fraccionadas (id TEXT PRIMARY KEY, kilos DOUBLE PRECISION, cliente_nombre TEXT, fecha_hora TIMESTAMP DEFAULT NOW())`;

    const c = await sql`SELECT COUNT(*) as c FROM deposito`;
    if (parseInt(c.rows[0].c) === 0) {
      await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes) VALUES ('11',5,3,0,0),('13',8,5,0,0),('45',2,1,0,0),('43.5',0,0,43.5,43.5) ON CONFLICT (producto_id) DO NOTHING`;
    }

    if (req.method === 'GET') {
      let productos = [], deposito = [], camionetas = [], movimientos = [], fracc = [];
      try { productos = (await sql`SELECT * FROM productos`).rows; } catch (e) {}
      try { deposito = (await sql`SELECT * FROM deposito`).rows; } catch (e) { deposito = []; }
      try { camionetas = (await sql`SELECT * FROM stock_camioneta`).rows; } catch (e) {}
      try { movimientos = (await sql`SELECT * FROM movimientos_stock ORDER BY fecha_hora DESC LIMIT 60`).rows; } catch (e) {}
      try { fracc = (await sql`SELECT * FROM ventas_fraccionadas ORDER BY fecha_hora DESC LIMIT 20`).rows; } catch (e) {}

      const prodMap = {};
      productos.forEach(p => { prodMap[String(p.id)] = p; });

      const depositoNorm = deposito.map(d => {
        const pid = String(d.producto_id).trim();
        const p = prodMap[pid] || {};
        return {
          producto_id: pid,
          nombre: p.nombre || pid + 'kg',
          llenas: d.llenas || 0,
          vacias: d.vacias || 0,
          cambio: d.para_cambio || 0,
          kilos_en_uso: parseFloat(d.kilos_en_uso || 0),
          kilos_restantes: parseFloat(d.kilos_restantes || d.kilos_en_uso || 0),
          permite_completo: 1,
          es_fraccionado: pid === '43.5' ? 1 : 0,
        };
      });

      return res.status(200).json({ ok: true, productos, deposito: depositoNorm, camionetas, movimientos, fraccionadas: fracc, _meta: { source: 'postgres' } });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { accion } = body;
      const now = new Date().toISOString();

      if (accion === 'balance_inicial') {
        for (const b of body.balances || []) {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, kilos_en_uso, kilos_restantes) VALUES (${b.producto_id}, ${b.llenas||0}, ${b.vacias||0}, ${b.cambio||0}, ${b.kilos_en_uso||0}, ${b.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${b.llenas||0}, vacias=${b.vacias||0}, para_cambio=${b.cambio||0}, kilos_en_uso=${b.kilos_en_uso||0}, kilos_restantes=${b.kilos_en_uso||0}`;
        }
        return res.status(200).json({ ok: true });
      }

      if (accion === 'crear_producto') {
        const p = body.producto;
        await sql`INSERT INTO productos (id, nombre, precio) VALUES (${p.producto_id}, ${p.nombre}, ${p.precio||0}) ON CONFLICT (id) DO UPDATE SET nombre=${p.nombre}, precio=${p.precio||0}`;
        await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, kilos_en_uso, kilos_restantes) VALUES (${p.producto_id}, ${p.llenas||0}, ${p.vacias||0}, ${p.cambio||0}, ${p.kilos_en_uso||0}, ${p.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${p.llenas||0}, vacias=${p.vacias||0}, para_cambio=${p.cambio||0}, kilos_en_uso=${p.kilos_en_uso||0}, kilos_restantes=${p.kilos_en_uso||0}`;
        return res.status(200).json({ ok: true });
      }

      if (accion === 'venta_fraccionada') {
        const kilos = parseFloat(body.kilos) || 1;
        const dep = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
        let actual = parseFloat(dep.rows[0]?.kilos_en_uso ?? 43.5);
        if (isNaN(actual)) actual = 43.5;
        let restante = Math.max(0, actual - kilos);
        
        if (restante < 0.5) {
          await sql`UPDATE deposito SET kilos_en_uso=0, kilos_restantes=0, llenas=llenas-1, vacias=vacias+1 WHERE producto_id='43.5'`;
          restante = 0;
        } else {
          await sql`UPDATE deposito SET kilos_en_uso=${restante}, kilos_restantes=${restante} WHERE producto_id='43.5'`;
        }
        await sql`INSERT INTO ventas_fraccionadas (id, kilos, cliente_nombre, fecha_hora) VALUES (${Date.now().toString(36)}, ${kilos}, ${body.cliente_nombre||'Cliente'}, ${now})`;
        await sql`INSERT INTO movimientos_stock (id, tipo, detalle, fecha_hora) VALUES (${Date.now().toString(36)+'m'}, 'fraccionada', ${kilos+'kg a '+(body.cliente_nombre||'')+' - queda '+restante.toFixed(1)+'kg'}, ${now})`;
        return res.status(200).json({ ok: true, restante });
      }

      if (accion === 'carga_camioneta') {
        const { repartidor_id, producto_id, cantidad } = body;
        const cant = parseInt(cantidad)||1;
        await sql`UPDATE deposito SET llenas = llenas - ${cant} WHERE producto_id=${producto_id}`;
        await sql`INSERT INTO stock_camioneta (repartidor_id, producto_id, llenas) VALUES (${repartidor_id}, ${producto_id}, ${cant}) ON CONFLICT (repartidor_id, producto_id) DO UPDATE SET llenas = stock_camioneta.llenas + ${cant}`;
        return res.status(200).json({ ok: true });
      }

      if (accion === 'descarga_camioneta') {
        const cams = await sql`SELECT * FROM stock_camioneta WHERE repartidor_id=${body.repartidor_id}`;
        for (const c of cams.rows) {
          await sql`UPDATE deposito SET llenas = llenas + ${c.llenas} WHERE producto_id=${c.producto_id}`;
        }
        await sql`DELETE FROM stock_camioneta WHERE repartidor_id=${body.repartidor_id}`;
        return res.status(200).json({ ok: true });
      }

      if (accion === 'proveedor') {
        const cant = parseInt(body.cantidad)||1;
        if (body.tipo === 'canje_vacio') await sql`UPDATE deposito SET vacias = vacias - ${cant}, llenas = llenas + ${cant} WHERE producto_id=${body.producto_id}`;
        else if (body.tipo === 'canje_cambio') await sql`UPDATE deposito SET para_cambio = para_cambio - ${cant}, llenas = llenas + ${cant} WHERE producto_id=${body.producto_id}`;
        else await sql`UPDATE deposito SET llenas = llenas + ${cant} WHERE producto_id=${body.producto_id}`;
        return res.status(200).json({ ok: true });
      }

      return res.status(200).json({ ok: false, error: 'Accion no conocida: ' + accion });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('STOCK ERROR', e);
    return res.status(200).json({ ok: false, error: e.message });
  }
}
