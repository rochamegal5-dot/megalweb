import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  const { repartidor, lat, lng, velocidad, direccion } = req.body;
  
  try {
    await client.execute({
      sql: `INSERT INTO gps_tracking (repartidor, lat, lng, velocidad, direccion, fecha) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      args: [repartidor, lat, lng, velocidad || 0, direccion || 0]
    });
    return res.status(200).json({ok: true});
  } catch (e) {
    console.error(e);
    return res.status(500).json({error: e.message});
  }
}
