// api/postgres.js - MEGAL ERP FINAL - Vercel + Neon - FIX 500 + FRACC
let sql;
async function getSql(){
  if(sql) return sql;
  try{
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
    return sql;
  }catch(e){
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const table = (req.query.table || '').toLowerCase();
  const id = req.query.id;

  try {
    const sqlClient = await getSql();
    if(!sqlClient){
      return res.status(200).json({ data: [], ok:false, error:'Sin conexión Postgres - revisa env vars en Vercel' });
    }
    const sql = sqlClient;

    // ===== CREAR TABLAS SI NO EXISTEN =====
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id TEXT PRIMARY KEY, lat DOUBLE PRECISION, lng DOUBLE PRECISION, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, repartidor TEXT, fecha TIMESTAMP DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS puntos_ref (id TEXT PRIMARY KEY, nombre TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION)`;
    await sql`CREATE TABLE IF NOT EXISTS repartidores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS productos (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT DEFAULT 'gas')`;
    await sql`CREATE TABLE IF NOT EXISTS clientes (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, direccion TEXT, tipo TEXT DEFAULT 'consumidor_final')`;
    await sql`CREATE TABLE IF NOT EXISTS proveedores (id TEXT PRIMARY KEY, nombre TEXT, telefono TEXT, rut TEXT, direccion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INTEGER DEFAULT 0, vacias INTEGER DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0)`;
    await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TIMESTAMP DEFAULT NOW(), producto_id TEXT, cliente_nombre TEXT, cantidad INTEGER DEFAULT 1, total DOUBLE PRECISION DEFAULT 0, flete DOUBLE PRECISION DEFAULT 0, pago TEXT DEFAULT 'contado', tipo_cliente TEXT DEFAULT 'consumidor_final', modo TEXT DEFAULT 'mostrador', repartidor_id TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS finanzas (id SERIAL PRIMARY KEY, fecha DATE DEFAULT CURRENT_DATE, tipo TEXT, categoria TEXT, descripcion TEXT, monto DOUBLE PRECISION DEFAULT 0, metodo_pago TEXT DEFAULT 'contado')`;
    await sql`CREATE TABLE IF NOT EXISTS camaras (id TEXT PRIMARY KEY, nombre TEXT, url TEXT, ubicacion TEXT)`;
    await sql`CREATE TABLE IF NOT EXISTS marketing (id TEXT PRIMARY KEY, nombre TEXT, tipo TEXT, estado TEXT, descripcion TEXT, presupuesto DOUBLE PRECISION DEFAULT 0, conversiones INTEGER DEFAULT 0)`;

    // Columnas nuevas para tubo (sin romper lo existente)
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INTEGER DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INTEGER DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;

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
      return res.status(200).json({ data: rows, ok:true });
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
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes, en_uso, para_cambio) VALUES (${body.producto_id}, ${parseInt(body.llenas)||0}, ${parseInt(body.vacias)||0}, ${parseFloat(body.kilos_en_uso)||0}, ${parseFloat(body.kilos_en_uso)||0}, ${parseInt(body.en_uso)||0}, ${parseInt(body.para_cambio)||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas=${parseInt(body.llenas)||0}, vacias=${parseInt(body.vacias)||0}, kilos_en_uso=${parseFloat(body.kilos_en_uso)||0}, kilos_restantes=${parseFloat(body.kilos_en_uso)||0}, en_uso=${parseInt(body.en_uso)||0}, para_cambio=${parseInt(body.para_cambio)||0}`;
          return res.status(200).json({ ok: true });
        }
        if (body.accion === 'iniciar_tubo_43' || body.accion === 'reset_tubo_43') {
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, kilos_en_uso, kilos_restantes, en_uso) VALUES ('43.5',0,0,
