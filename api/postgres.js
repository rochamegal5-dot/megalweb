import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Content-Type','application/json');
  try {
    const { table } = req.query;
    const permitidas = ['gps_locations','finanzas','deposito','ventas','proveedores','productos','clientes','repartidores'];
    if (req.method === 'GET') {
      if (!table || !permitidas.includes(table)) {
        return res.status(200).json({ data: [] });
      }
      try {
        const { rows } = await sql.query(`SELECT * FROM ${table} LIMIT 200`);
        return res.status(200).json({ data: rows });
      } catch (e) {
        return res.status(200).json({ data: [], table, note: 'tabla no existe aun' });
      }
    }
    return res.status(200).json({ data: [] });
  } catch (err) {
    return res.status(200).json({ data: [], error: err.message });
  }
}
