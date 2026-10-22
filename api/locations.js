import { createClient } from "@libsql/client";
const getClient = () => createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  import { createClient } from "@libsql/client";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  try {
    const client = createClient({ 
      url: process.env.TURSO_DATABASE_URL, 
      authToken: process.env.TURSO_AUTH_TOKEN 
    });
    const rs = await client.execute("SELECT device_id, nombre FROM repartidores WHERE activo=1 ORDER BY device_id");
    return res.status(200).json(rs.rows);
  } catch(e) {
    console.error("TURSO ERROR repartidores:", e);
    // Si Turso falla por migrations, devuelve lista hardcodeada para no romper el frontend
    return res.status(200).json([
      { device_id: 7, nombre: "Antonio - Equipo 7" },
      { device_id: 8, nombre: "Jose - Equipo 8" }
    ]);
  }
}
  if (req.method === "OPTIONS") return res.status(200).end();

  const client = getClient();

  if (req.method === "POST") {
    try {
      const { device_id, lat, lng, speed, accuracy } = req.body;
      if (!device_id || lat === undefined || lng === undefined) return res.status(400).json({ error: "faltan datos" });
      
      // ESCRIBE EN LAS 2 TABLAS PARA QUE NO HAYA CONFLICTO
      const args = [String(device_id), Number(lat), Number(lng), Number(speed||0), Number(accuracy||0)];
      await client.execute({ sql: "INSERT INTO locations (device_id, lat, lng, speed, accuracy) VALUES (?,?,?,?,?)", args });
      await client.execute({ sql: "INSERT INTO gps_locations (device_id, lat, lng, speed, accuracy) VALUES (?,?,?,?,?)", args });
      
      return res.json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // GET - devuelve de gps_locations que es la que tu web usa
  try {
    const device_id = req.query.device_id;
    let sql = "SELECT device_id, lat, lng, speed, created_at as timestamp FROM gps_locations WHERE created_at > datetime('now','-6 hours') ORDER BY created_at DESC LIMIT 500";
    let args = [];
    if (device_id && device_id !== 'Todos') {
      sql = "SELECT device_id, lat, lng, speed, created_at as timestamp FROM gps_locations WHERE device_id=? ORDER BY created_at DESC LIMIT 200";
      args = [String(device_id)];
    }
    const rs = await client.execute({ sql, args });
    return res.json(rs.rows);
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
