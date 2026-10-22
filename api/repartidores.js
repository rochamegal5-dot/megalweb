import { createClient } from "@libsql/client";
export default async function handler(req, res) {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const rs = await client.execute("SELECT device_id, nombre FROM repartidores WHERE activo=1 ORDER BY nombre");
    res.setHeader("Access-Control-Allow-Origin","*");
    res.json(rs.rows);
  } catch(e){ res.status(500).json({error:e.message}) }
}
