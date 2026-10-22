import { createClient } from "@libsql/client";
const getClient = () => createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  try {
    const client = getClient();
    const { all, device_id } = req.query;
    let sql = "SELECT device_id, lat, lng, speed, created_at as recorded_at FROM gps_locations ORDER BY created_at DESC LIMIT 200";
    let args = [];
    if (device_id) { sql = "SELECT device_id, lat, lng, speed, created_at as recorded_at FROM gps_locations WHERE device_id=? ORDER BY created_at DESC LIMIT 200"; args = [String(device_id)]; }
    else if (all) { sql = "SELECT device_id, lat, lng, speed, created_at as recorded_at FROM gps_locations WHERE created_at > datetime('now','-24 hours') ORDER BY created_at DESC LIMIT 500"; }
    const rs = await client.execute({ sql, args });
    return res.status(200).json(rs.rows);
  } catch(e) { console.error(e); return res.status(200).json([]); }
}
