import { createClient } from "@libsql/client";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS") return res.status(200).end();
  
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  if(req.method==="POST"){
    try{
      const { device_id, lat, lng, speed, accuracy } = req.body;
      if(!device_id || !lat || !lng) return res.status(400).json({error:"faltan datos"});
      await client.execute({
        sql:"INSERT INTO locations (device_id, lat, lng, speed, accuracy) VALUES (?,?,?,?,?)",
        args:[String(device_id), lat, lng, speed||0, accuracy||0]
      });
      return res.json({ok:true});
    }catch(e){ return res.status(500).json({error:e.message}) }
  }

  // GET ?device_id=7
  try{
    const device_id = req.query.device_id || "7";
    const rs = await client.execute({
      sql:"SELECT device_id, lat, lng, speed, timestamp FROM locations WHERE device_id=? ORDER BY timestamp DESC LIMIT 100",
      args:[device_id]
    });
    return res.json(rs.rows);
  }catch(e){ return res.status(500).json({error:e.message}) }
}
