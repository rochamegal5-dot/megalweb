import { createClient } from "@libsql/client/web";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { device_id, usuario, jornada_id, lat, lng, velocidad, accuracy } = await req.json();
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return Response.json({ error: "lat/lng invalid" }, { status: 400 });
    }

    await client.execute({
      sql: `INSERT INTO gps_locations (device_id, usuario, jornada_id, lat, lng, velocidad, accuracy, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))`,
      args: [device_id ?? 7, usuario ?? 'Megal', jornada_id ?? '', lat, lng, velocidad ?? 0, accuracy ?? 0],
    });

    return Response.json({ ok: true, lat, lng, device_id });
  } catch (e: any) {
    console.error("INGEST ERROR", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ status: 'ingest endpoint ok - use POST' });
}
