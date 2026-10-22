import { createClient } from "@libsql/client";
const getClient = () => createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const client = getClient();
    if (req.method === "POST") {
      const b = req.body || {};
      const device_id = String(b.device_id || 7);
      const lat = Number(b.lat || b.latitud);
      const lng = Number(b.lng || b.longitud);
      const speed = Number(b.speed || b.velocidad || 0);
      const args = [device_id, lat, lng, speed];
      await client.execute({ sql: "INSERT INTO locations (device_id, lat, lng, speed) VALUES (?,?,?,?)", args });
      await client.execute({ sql: "INSERT INTO gps_locations (device_id, lat, lng, speed) VALUES (?,?,?,?)", args });
      return res.status(200).json({ ok: true });
    }
    const device_id = req.query.device_id;
    const sql = device_id && device_id !== "Todos" ? "SELECT device_id, lat, lng, speed, created_at as timestamp FROM gps_locations WHERE device_id=? ORDER BY created_at DESC LIMIT 100" : "SELECT device_id, lat, lng, speed, created_at as timestamp FROM gps_locations WHERE created_at > datetime('now','-6 hours') ORDER BY created_at DESC LIMIT 200";
    const args = device_id && device_id !== "Todos" ? [String(device_id)] : [];
    const rs = await client.execute({ sql, args });
    return res.status(200).json(rs.rows);
  } catch(e) { return res.status(200).json([]); }
}
