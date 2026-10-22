import { createClient } from "@libsql/client";
const getClient = () => createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const client = getClient();
    const { table, id } = req.query;
    
    if (table === 'repartidores') {
      if (req.method === 'GET') {
        const rs = await client.execute("SELECT device_id as id, nombre, '' as telefono, '' as vehiculo, '' as patente, '#3b82f6' as color, device_id FROM repartidores WHERE activo=1");
        return res.status(200).json({ data: rs.rows });
      }
      if (req.method === 'POST') {
        const body = req.body;
        await client.execute({ sql: "INSERT OR REPLACE INTO repartidores (device_id, nombre, activo) VALUES (?,?,1)", args: [String(body.device_id||body.id), body.nombre] });
        return res.status(200).json({ ok: true });
      }
      if (req.method === 'DELETE' && id) {
        await client.execute({ sql: "DELETE FROM repartidores WHERE device_id=?", args: [String(id)] });
        return res.status(200).json({ ok: true });
      }
    }
    
    if (table === 'puntos_referencia') {
      if (req.method === 'GET') {
        const rs = await client.execute("SELECT id, nombre, lat, lng, lat as latitud, lng as longitud FROM puntos_referencia LIMIT 100");
        return res.status(200).json({ data: rs.rows });
      }
      if (req.method === 'POST') {
        const b = req.body;
        await client.execute({ sql: "INSERT INTO puntos_referencia (id, nombre, lat, lng) VALUES (?,?,?,?)", args: [String(b.id), b.nombre, Number(b.lat), Number(b.lng)] });
        return res.status(200).json({ ok: true });
      }
      if (req.method === 'DELETE' && id) {
        await client.execute({ sql: "DELETE FROM puntos_referencia WHERE id=?", args: [String(id)] });
        return res.status(200).json({ ok: true });
      }
    }
    
    return res.status(200).json({ data: [] });
  } catch(e) {
    console.error("ERP ERROR:", e);
    if (req.query.table === 'repartidores') {
      return res.status(200).json({ data: [{ id: '7', nombre: 'Antonio', device_id: 7, color: '#ef4444' }, { id: '8', nombre: 'Jose', device_id: 8, color: '#8b5cf6' }] });
    }
    return res.status(200).json({ data: [] });
  }
}
