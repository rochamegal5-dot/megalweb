
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { table, hoy, id } = req.query;

  try {
    if (req.method === 'GET') {
      if (!table) {
        const { rows } = await sql`SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 100`;
        return res.json({ data: rows });
      }

      if (table === 'productos') {
        const { rows } = await sql`SELECT * FROM productos ORDER BY id`;
        return res.json({ data: rows });
      }
      if (table === 'proveedores') {
        const { rows } = await sql`SELECT * FROM proveedores ORDER BY id DESC LIMIT 500`;
        return res.json({ data: rows });
      }
      if (table === 'clientes') {
        const { rows } = await sql`SELECT * FROM clientes ORDER BY id DESC LIMIT 500`;
        return res.json({ data: rows });
      }
      if (table === 'repartidores') {
        const { rows } = await sql`SELECT * FROM repartidores ORDER BY id`;
        return res.json({ data: rows });
      }
      if (table === 'deposito') {
        const { rows } = await sql`SELECT * FROM deposito ORDER BY producto_id`;
        return res.json({ data: rows });
      }
      if (table === 'ventas') {
        if (hoy === '1') {
          const { rows } = await sql`SELECT * FROM ventas WHERE fecha >= CURRENT_DATE ORDER BY fecha DESC`;
          return res.json({ data: rows });
        }
        const { rows } = await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 500`;
        return res.json({ data: rows });
      }
      if (table === 'puntos_referencia') {
        const { rows } = await sql`SELECT * FROM puntos_referencia ORDER BY id`;
        return res.json({ data: rows });
      }
      return res.status(400).json({ error: 'Tabla no permitida', data: [] });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!table) return res.status(400).json({ error: 'Falta table' });

      if (table === 'productos') {
        const { id, nombre, tipo, costo_proveedor, precio_venta, costo, precio_venta_lista } = body;
        await sql`
          INSERT INTO productos (id, nombre, tipo, costo_proveedor, precio_venta, costo, precio_venta_lista)
          VALUES (${id}, ${nombre}, ${tipo||'otro'}, ${costo_proveedor||0}, ${precio_venta||0}, ${costo||0}, ${precio_venta_lista||0})
          ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, costo_proveedor = EXCLUDED.costo_proveedor, precio_venta = EXCLUDED.precio_venta, costo = EXCLUDED.costo, precio_venta_lista = EXCLUDED.precio_venta_lista
        `;
        const { rows } = await sql`SELECT * FROM productos WHERE id = ${id}`;
        return res.json({ data: rows });
      }

      if (table === 'ventas') {
        const { id, cliente_nombre, producto_id, cantidad, precio_unitario, costo_proveedor, flete, total, pago, tipo_cliente, modo } = body;
        const vid = id || Date.now().toString(36);
        await sql`
          INSERT INTO ventas (id, cliente_nombre, producto_id, cantidad, precio_unitario, costo_proveedor, flete, total, pago, tipo_cliente, modo, tipo_venta)
          VALUES (${vid}, ${cliente_nombre||'Cliente'}, ${producto_id||'13'}, ${cantidad||1}, ${precio_unitario||0}, ${costo_proveedor||0}, ${flete||0}, ${total||0}, ${pago||'contado'}, ${tipo_cliente||'consumidor_final'}, ${modo||'retira'}, 'mostrador')
        `;
        const { rows } = await sql`SELECT * FROM ventas WHERE id = ${vid}`;
        return res.json({ data: rows });
      }

      return res.json({ data: [body] });
    }

    return res.status(405).json({ error: 'Metodo no permitido' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message, data: [] });
  }
}

