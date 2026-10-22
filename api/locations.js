import { createClient } from "@libsql/client";

const getClient = () => createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const client = getClient();

  if (req.method === "POST") {
    try {
      // La app manda device_id como string "7"
      const { device_id, lat, lng, speed, accuracy } = req.body;
      console.log("INGEST:", req.body); // Para ver en Logs de Vercel
      if (!device_id || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: "faltan device_id/lat/lng", body: req.body });
      }
      await client.execute({
        sql: "INSERT INTO locations (device_id, lat, lng, speed, accuracy, timestamp) VALUES (?,?,?,?,?, datetime('now'))",
        args: [String(device_id), Number(lat), Number(lng), Number(speed||0), Number(accuracy||0)],
      });
      return res.json({ ok: true, saved: { device_id, lat, lng } });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  // GET
  try {
    const device_id = req.query.device_id;
    if (device_id) {
      const rs = await client.execute({
        sql: "SELECT device_id, lat, lng, speed, accuracy, timestamp FROM locations WHERE device_id=? ORDER BY timestamp DESC LIMIT 200",
        args: [String(device_id)],
      });
      return res.json(rs.rows);
    } else {
      // Para el mapa "Todos"
      const rs = await client.execute("SELECT device_id, lat, lng, speed, timestamp FROM locations WHERE timestamp > datetime('now','-2 hours') ORDER BY timestamp DESC");
      return res.json(rs.rows);
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
