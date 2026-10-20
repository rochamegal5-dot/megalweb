import { createClient } from "@libsql/client/web";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const device_id = searchParams.get('device_id');

    let sql = `SELECT device_id, usuario, jornada_id, lat, lng, velocidad, accuracy, created_at, datetime(created_at,'localtime') as ts FROM gps_locations`;
    let args: any[] = [];

    if (device_id) {
      sql += ` WHERE device_id = ?`;
      args.push(parseInt(device_id));
    }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    args.push(limit);

    const rs = await client.execute({ sql, args });
    return Response.json(rs.rows);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
