// api/locations.js - GPS Locations 100% POSTGRES - sin Turso
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
    return res.status(200).json([]);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (id SERIAL PRIMARY KEY, device_id TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION, speed DOUBLE PRECISION DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), latitud DOUBLE PRECISION, longitud DOUBLE PRECISION, velocidad DOUBLE PRECISION, recorded_at TIMESTAMP DEFAULT NOW())`;

    if (req.method === "POST") {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const device_id = String(b.device_id || 7);
      const lat = Number(b.lat || b.latitud);
      const lng = Number(b.lng || b.longitud);
      const speed = Number(b.speed || b.velocidad || 0);
      if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: "lat/lng invalidos" });

      // Antes insertaba en 2 tablas, ahora una sola en Postgres
      await sql`INSERT INTO gps_locations (device_id, lat, lng, speed, latitud, longitud, velocidad, recorded_at) VALUES (${device_id}, ${lat}, ${lng}, ${speed}, ${lat}, ${lng}, ${speed}, NOW())`;
      return res.status(200).json({ ok: true });
    }

    // GET
    const device_id = req.query.device_id;
    let rows = [];
    if (device_id && device_id !== "Todos") {
      rows = (await sql`SELECT device_id, lat, lng, speed, created_at as timestamp FROM gps_locations WHERE device_id=${String(device_id)} ORDER BY created_at DESC LIMIT 100`).rows;
    } else {
      // Últimas 6 horas - en Postgres es NOW() - INTERVAL
      rows = (await sql`SELECT device_id, lat, lng, speed, created_at as timestamp FROM gps_locations WHERE created_at > NOW() - INTERVAL '6 hours' ORDER BY created_at DESC LIMIT 200`).rows;
    }
    return res.status(200).json(rows);

  } catch (e) {
    console.error('LOCATIONS ERROR', e);
    return res.status(200).json([]);
  }
}
