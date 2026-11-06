// /api/gps.js - GPS 100% POSTGRES - sin Turso
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(200).end();

  let sql;
  try {
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'PG lib: ' + e.message });
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, device_id TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, speed DOUBLE PRECISION DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), latitud DOUBLE PRECISION, longitud DOUBLE PRECISION, velocidad DOUBLE PRECISION, recorded_at TIMESTAMP DEFAULT NOW())`;

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const device_id = String(b.device_id || b.repartidor_id || 7);
      const lat = Number(b.lat || b.latitud);
      const lng = Number(b.lng || b.longitud);
      const speed = Number(b.speed || b.velocidad || 0);
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: "lat/lng invalidos" });
      
      await sql`INSERT INTO gps_locations (device_id, lat, lng, speed, latitud, longitud, velocidad, recorded_at) VALUES (${device_id}, ${lat}, ${lng}, ${speed}, ${lat}, ${lng}, ${speed}, NOW())`;
      
      return res.status(200).json({ ok: true, device_id, lat, lng, speed });
    }

    // GET
    const { device_id, all } = req.query;
    let rows = [];
    try {
      if (device_id) {
        rows = (await sql`SELECT device_id, lat, lng, speed, created_at as recorded_at FROM gps_locations WHERE device_id=${String(device_id)} ORDER BY created_at DESC LIMIT 200`).rows;
      } else {
        rows = (await sql`SELECT device_id, lat, lng, speed, created_at as recorded_at FROM gps_locations ORDER BY created_at DESC LIMIT 300`).rows;
      }
    } catch (e) { rows = []; }

    // Tu front espera array directo, no {data:}
    return res.status(200).json(rows);

  } catch (e) {
    console.error('GPS ERROR', e);
    return res.status(200).json([]);
  }
}
