import { createClient } from "@libsql/client/web";
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const device_id = searchParams.get("device_id") || "7";
  const res = await turso.execute({
    sql: "SELECT * FROM gps_locations WHERE device_id = ? ORDER BY created_at DESC LIMIT 100",
    args: [device_id]
  });
  return Response.json(res.rows);
}
