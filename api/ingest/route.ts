
import { createClient } from "@libsql/client/web";
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export async function POST(req) {
  const body = await req.json();
  const { device_id, usuario, jornada_id, lat, lng, accuracy, velocidad, battery } = body;
  if(!lat || !lng) return Response.json({error:"sin coords"}, {status:400});

  await turso.execute({
    sql: `INSERT INTO gps_locations (device_id, usuario, jornada_id, lat, lng, accuracy, velocidad, battery, created_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [device_id, usuario, jornada_id, lat, lng, accuracy, velocidad, battery, new Date().toISOString()]
  });
  return Response.json({ok:true});
}
