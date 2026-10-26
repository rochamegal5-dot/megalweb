
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { table, hoy, id } = req.query;

  try {
    // GET
    if (req.method === 'GET') {
      if (!table) {
        // GPS - devolver todo con limite
        const { rows } = await sql`SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 100`;
        return res.json({ data: rows });
      }

      let query;
      // Tablas permitidas
      const allowed = ['productos','proveedores','clientes','repartidores','ventas','deposito','gps_locations','puntos_referencia'];
      if (!allowed.includes(table)) return res.status(400).json({ error: 'Tabla no permitida' });

      if (table === 'ventas' && hoy === '1') {
        const { rows } = await sql`SELECT * FROM ventas WHERE fecha >= CURRENT_DATE ORDER BY fecha DESC`;
        return res.json({ data: rows });
      }

      if (table === 'productos' && id) {
        const { rows } = await sql`SELECT * FROM productos WHERE id = ${id}`;
        return res.json({ data: rows });
      }

      // Query generica
      const { rows } = await sql.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`);
      return res.json({ data: rows });
    }

    // POST
    if (req.method === 'POST') {
      const body = req.body;
      if (!table) return res.status(400).json({ error: 'Falta table' });

      // Productos
      if (table === 'productos') {
        const { id, nombre, tipo, costo_proveedor, precio_venta, costo, precio_venta_lista, proveedor_id, stock_min, notas, permite_completo, es_fraccionado } = body;
        await sql`
          INSERT INTO productos (id, nombre, tipo, costo_proveedor, precio_venta, costo, precio_venta_lista, proveedor_id, stock_min, notas, permite_completo, es_fraccionado)
          VALUES (${id}, ${nombre}, ${tipo||'otro'}, ${costo_proveedor||0}, ${precio_venta||0}, ${costo||0}, ${precio_venta_lista||0}, ${proveedor_id||''}, ${stock_min||5}, ${notas||''}, ${permite_completo||0}, ${es_fraccionado||0})
          ON CONFLICT (id) DO UPDATE SET 
            nombre = EXCLUDED.nombre,
            tipo = EXCLUDED.tipo,
            costo_proveedor = EXCLUDED.costo_proveedor,
            precio_venta = EXCLUDED.precio_venta,
            costo = EXCLUDED.costo,
            precio_venta_lista = EXCLUDED.precio_venta_lista
        `;
        const { rows } = await sql`SELECT * FROM productos WHERE id = ${id}`;
        return res.json({ data: rows });
      }

      // Ventas
      if (table === 'ventas') {
        const { id, fecha, fecha_hora, tipo_venta, modo, tipo_cliente, cliente_nombre, producto_id, cantidad, kilos, precio_unitario, costo_proveedor, flete, pago, total, estado, origen } = body;
        await sql`
          INSERT INTO ventas (id, fecha, fecha_hora, tipo_venta, modo, tipo_cliente, cliente_nombre, producto_id, cantidad, kilos, precio_unitario, costo_proveedor, flete, pago, total, estado, origen)
          VALUES (${id||Date.now().toString(36)}, ${fecha||new Date().toISOString()}, ${fecha_hora||new Date().toISOString()}, ${tipo_venta||'mostrador'}, ${modo||'retira'}, ${tipo_cliente||'consumidor_final'}, ${cliente_nombre||'Cliente'}, ${producto_id||'13'}, ${cantidad||1}, ${kilos||0}, ${precio_unitario||0}, ${costo_proveedor||0}, ${flete||0}, ${pago||'contado'}, ${total||0}, ${estado||'cerrada'}, ${origen||'mostrador'})
        `;
        const { rows } = await sql`SELECT * FROM ventas WHERE id = ${body.id} OR fecha >= CURRENT_DATE ORDER BY fecha DESC LIMIT 1`;
        return res.json({ data: rows });
      }

      // Otras tablas genericas
      return res.json({ data: [body], message: 'Guardado (generico)' });
    }

    return res.status(405).json({ error: 'Metodo no permitido' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message, data: [] });
  }
}

