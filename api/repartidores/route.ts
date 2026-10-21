import { createClient } from "@libsql/client/web";
const turso = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

export async function GET() {
  const res = await turso.execute("SELECT * FROM repartidores WHERE activo=1 ORDER BY device_id");
  return new Response(JSON.stringify(res.rows), { headers: { "Content-Type": "application/json" } });
}

export async function POST(req) {
  const { nombre, telefono, device_id } = await req.json();
  await turso.execute({
    sql: "INSERT INTO repartidores (nombre, telefono, device_id) VALUES (?,?,?)",
    args: [nombre, telefono, device_id]
  });
  return new Response(JSON.stringify({ok:true}));
}
