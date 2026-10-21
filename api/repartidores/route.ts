import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export async function GET() {
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
    const rs = await client.execute("SELECT device_id, nombre FROM repartidores WHERE activo=1 ORDER BY nombre");
    return NextResponse.json(rs.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
