import { createClient } from "@libsql/client";
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN! });
export default async function handler(req,res){
  const rs = await client.execute("SELECT device_id, nombre FROM repartidores WHERE activo=1 ORDER BY nombre");
  res.json(rs.rows);
}
