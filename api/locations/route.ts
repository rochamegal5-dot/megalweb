import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const device_id = searchParams.get("device_id");
  if (!device_id) return NextResponse.json({ error: "device_id requerido" }, { status: 400 });

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const rs = await client.execute({
    sql: "SELECT * FROM locations WHERE device_id = ? ORDER BY timestamp DESC LIMIT 2000",
    args: [device_id],
  });
  return NextResponse.json(rs.rows);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { device_id, lat, lng, speed, accuracy, battery } = body;
    if (!device_id || !lat || !lng) return NextResponse.json({ error: "faltan datos" }, { status: 400 });

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    await client.execute({
      sql: "INSERT INTO locations (device_id, lat, lng, speed, accuracy, battery) VALUES (?,?,?,?,?,?)",
      args: [String(device_id), lat, lng, speed || 0, accuracy || 0, battery || 0],
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
