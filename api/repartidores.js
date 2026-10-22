import { createClient } from "@libsql/client";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  try {
    const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
    const rs = await client.execute("SELECT device_id, nombre FROM repartidores WHERE activo=1 ORDER BY device_id");
    return res.status(200).json(rs.rows);
  } catch(e) {
    console.error(e);
    return res.status(200).json([
      { device_id: 7, nombre: "Antonio - Equipo 7" },
      { device_id: 8, nombre: "Jose - Equipo 8" }
    ]);
  }
}
