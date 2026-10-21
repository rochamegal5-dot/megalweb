import { createClient } from "@libsql/client/web";

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const device_id = searchParams.get("device_id") || "7";

    // rowid DESC = última insertada primero, aunque created_at sea null (fix Hace 100h)
    const res = await turso.execute({
      sql: "SELECT *, datetime(created_at) as created_at_fmt FROM gps_locations WHERE device_id = ? ORDER BY rowid DESC LIMIT 100",
      args: [device_id]
    });

    return Response.json(res.rows, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
