export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
  
  const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : req.query;
  const lat = body.lat;
  const lng = body.lng || body.longitud;
  const velocidad = body.velocidad || 0;
  const repartidor = body.repartidor || 'Moto-Desconocida';

  async function tursoExec(sql, args=[]) {
    const r = await fetch(HTTP_URL, { method: "POST", headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ statements: [{ q: sql, params: args }] }) });
    return r.json();
  }

  if (!lat || !lng) return res.status(400).json({ok:false, error:'falta lat/lng'});
  
  await tursoExec("INSERT INTO gps_locations (device_id, lat, lng, velocidad) VALUES (?, ?, ?, ?)", [7, parseFloat(lat), parseFloat(lng), parseFloat(velocidad)||0]);
  
  console.log(`TRACK APK: ${repartidor} -> ${lat},${lng}`);
  return res.status(200).json({ok:true});
}
