// /api/erp.js - COMPLETO con proveedores, finanzas, marketing
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  if (!TURSO_URL || !TURSO_TOKEN) return res.status(500).json({ ok: false, error: "Falta TURSO config" });
  const HTTP_URL = TURSO_URL.replace("libsql://", "https://");
  const ALLOWED = ["repartidores","productos","clientes","proveedores","stock_deposito","stock_camioneta","ventas","finanzas","marketing","configuraciones","puntos_ruta","gps_locations"];
  const table = req.query.table;
  if (!table || !ALLOWED.includes(table)) return res.status(400).json({ ok: false, error: "Tabla no permitida", allowed: ALLOWED });
  async function exec(sql, args=[]) {
    const r = await fetch(HTTP_URL, { method: "POST", headers: { "Authorization": `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ statements: [{ q: sql, params: args }] }) });
    const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j.results?.[0] || j;
  }
  try {
    if (req.method === "GET") {
      const result = await exec(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 500`);
      const rows = result.response?.result?.rows || result.rows || [];
      return res.status(200).json({ ok: true, data: rows });
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      if (!body) return res.status(400).json({ ok: false, error: "Body vacío" });
      const keys = Object.keys(body);
      const placeholders = keys.map(() => "?").join(",");
      const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(",")}) VALUES (${placeholders})`;
      const values = keys.map(k => body[k]);
      await exec(sql, values);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ ok: false, error: "Falta id" });
      await exec(`DELETE FROM ${table} WHERE id = ?`, [id]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ ok: false, error: "Metodo no permitido" });
  } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
}

