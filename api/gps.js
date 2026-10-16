// /api/gps.js - FINAL FUNCIONAL CON TURSO (sin librerias)
export default async function handler(req, res) {
  const TURSO_URL = process.env.TURSO_DATABASE_URL;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

  if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(500).json({ ok: false, error: "Falta TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en Vercel" });
  }

  const { device_id, lat, lng, velocidad, all } = req.query;

  async function tursoExec(sql, args = []) {
    const resp = await fetch(TURSO_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TURSO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statements: [{ q: sql, params: args }]
      })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(data));
    return data;
  }

  try {
    // Si pide todo
    if (all === "1") {
      const deviceId = device_id ? parseInt(device_id) : null;
      let sql = deviceId
        ? "SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 100"
        : "SELECT device_id, lat, lng, velocidad, recorded_at FROM gps_locations ORDER BY recorded_at DESC LIMIT 200";
      let params = deviceId ? [deviceId] : [];
      
      // Usar fetch directo para SELECT (más simple)
      const url = deviceId 
        ? `${TURSO_URL}?q=${encodeURIComponent(sql)}&params=${encodeURIComponent(JSON.stringify(params))}`
        : `${TURSO_URL}?q=${encodeURIComponent(sql)}`;

      // Fallback: usar el endpoint de ejecución HTTP
      const result = await fetch(TURSO_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${TURSO_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ statements: [{ q: sql, params: params }] })
      }).then(r=>r.json());

      const rows = result?.results?.[0]?.rows || result?.[0]?.results?.rows || [];
      // Normalizar rows que vienen como array de valores
      const data = rows.map(r => {
        if (Array.isArray(r)) return { device_id: r[0], lat: r[1], lng: r[2], velocidad: r[3], recorded_at: r[4] };
        return r;
      });

      // Si el formato es diferente, intentar parsear el formato libsql
      let finalData = [];
      if (result.results && result.results[0] && result.results[0].rows) {
        // formato: { results: [{ columns: [], rows: [ [val...], ... ] }] }
        const cols = result.results[0].columns;
        finalData = result.results[0].rows.map(row => {
          let obj = {};
          row.forEach((v, i) => obj[cols[i]] = v);
          return obj;
        });
      } else {
        finalData = data;
      }

      // Si aún vacío, usar método simple con 2 queries separadas por device
      if (finalData.length === 0) {
        // intentar query sin params para debug
        const r2 = await tursoExec("SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 50");
        return res.status(200).json({ ok: true, data: [], debug: r2, message: "Usa device_id específico" });
      }

      return res.status(200).json({ ok: true, data: finalData });
    }

    // Guardar posición
    if (lat && lng) {
      const dId = parseInt(device_id) || 7;
      const v = parseFloat(velocidad) || 0;
      await tursoExec(
        "INSERT INTO gps_locations (device_id, lat, lng, velocidad, recorded_at) VALUES (?, ?, ?, ?, datetime('now'))",
        [dId, parseFloat(lat), parseFloat(lng), v]
      );
      return res.status(200).json({ ok: true, saved: { device_id: dId, lat, lng } });
    }

    return res.status(400).json({ ok: false, error: "Falta lat/lng o all=1" });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
