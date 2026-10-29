import { sql } from '@vercel/postgres';
if (!process.env.POSTGRES_URL && process.env.DATABASE_URL) { process.env.POSTGRES_URL = process.env.DATABASE_URL; }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { table, hoy } = req.query;
  try {
    if (req.method === 'GET') {
      if (!table) { const { rows } = await sql`SELECT * FROM gps_locations ORDER BY recorded_at DESC LIMIT 100`; return res.json({ data: rows }); }
      if (table === 'productos') { const { rows } = await sql`SELECT * FROM productos ORDER BY id`; return res.json({ data: rows }); }
      if (table === 'deposito') { const { rows } = await sql`SELECT * FROM deposito ORDER BY producto_id`; return res.json({ data: rows }); }
      if (table === 'movimientos_stock') { const { rows } = await sql`SELECT * FROM movimientos_stock ORDER BY fecha DESC LIMIT 200`; return res.json({ data: rows }); }
      if (table === 'ventas') {
        if (hoy === '1') { const { rows } = await sql`SELECT * FROM ventas WHERE fecha >= CURRENT_DATE ORDER BY fecha DESC`; return res.json({ data: rows }); }
        const { rows } = await sql`SELECT * FROM ventas ORDER BY fecha DESC LIMIT 500`; return res.json({ data: rows });
      }
      return res.status(400).json({ error: 'Tabla no permitida: '+table, data: [] });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!table) return res.status(400).json({ error: 'Falta table' });

      if (table === 'productos') {
        const { id, nombre, tipo, costo_proveedor, precio_venta } = body;
        await sql`INSERT INTO productos (id, nombre, tipo, costo_proveedor, precio_venta) VALUES (${id}, ${nombre}, ${tipo||'otro'}, ${costo_proveedor||0}, ${precio_venta||0}) ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, costo_proveedor = EXCLUDED.costo_proveedor, precio_venta = EXCLUDED.precio_venta`;
        const { rows } = await sql`SELECT * FROM productos WHERE id = ${id}`; return res.json({ data: rows });
      }

      if (table === 'deposito' || table === 'stock' || table === 'movimientos_stock') {
        const { accion } = body;
        await sql`CREATE TABLE IF NOT EXISTS movimientos_stock (id SERIAL PRIMARY KEY, fecha TIMESTAMPTZ DEFAULT NOW(), tipo TEXT, proveedor TEXT, remito TEXT, factura TEXT, detalles JSONB, observaciones TEXT)`;

        if (accion === 'balance_inicial' && body.balances) {
          for (const b of body.balances) {
            await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, cambio, kilos_en_uso) VALUES (${b.producto_id}, ${b.nombre||b.producto_id}, ${b.llenas||0}, ${b.vacias||0}, ${b.cambio||0}, ${b.kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET nombre = EXCLUDED.nombre, llenas = EXCLUDED.llenas, vacias = EXCLUDED.vacias, cambio = EXCLUDED.cambio, kilos_en_uso = EXCLUDED.kilos_en_uso`;
          }
          const { rows } = await sql`SELECT * FROM deposito ORDER BY producto_id`; return res.json({ data: rows });
        }

        if (accion === 'actualizar_stock') {
          const { producto_id, nombre, llenas, vacias, cambio, kilos_en_uso } = body;
          await sql`INSERT INTO deposito (producto_id, nombre, llenas, vacias, cambio, kilos_en_uso) VALUES (${producto_id}, ${nombre||producto_id}, ${llenas||0}, ${vacias||0}, ${cambio||0}, ${kilos_en_uso||0}) ON CONFLICT (producto_id) DO UPDATE SET llenas = EXCLUDED.llenas, vacias = EXCLUDED.vacias, cambio = EXCLUDED.cambio, kilos_en_uso = EXCLUDED.kilos_en_uso, nombre = EXCLUDED.nombre`;
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id = ${producto_id}`; return res.json({ data: rows });
        }

        if (accion === 'ingreso_gas') {
          const { proveedor, remito, factura, observaciones, llenas_ing, vacias_egr, cambios_egr } = body;
          for (const pid of Object.keys(llenas_ing||{})) {
            const cant = parseInt(llenas_ing[pid])||0;
            if(cant>0) {
              if(pid==='43.5') {
                // Para 43.5, ingreso suma a llenas, pero si no hay tubo en uso y kilos_en_uso=0, lo deja listo
                await sql`UPDATE deposito SET llenas = COALESCE(llenas,0) + ${cant} WHERE producto_id = ${pid}`;
              } else {
                await sql`UPDATE deposito SET llenas = COALESCE(llenas,0) + ${cant} WHERE producto_id = ${pid}`;
              }
            }
          }
          for (const pid of Object.keys(vacias_egr||{})) {
            const cant = parseInt(vacias_egr[pid])||0;
            if(cant>0) await sql`UPDATE deposito SET vacias = GREATEST(0, COALESCE(vacias,0) - ${cant}) WHERE producto_id = ${pid}`;
          }
          for (const pid of Object.keys(cambios_egr||{})) {
            const cant = parseInt(cambios_egr[pid])||0;
            if(cant>0) await sql`UPDATE deposito SET cambio = GREATEST(0, COALESCE(cambio,0) - ${cant}) WHERE producto_id = ${pid}`;
          }
          await sql`INSERT INTO movimientos_stock (tipo, proveedor, remito, factura, detalles, observaciones) VALUES ('ingreso_gas', ${proveedor||'Petrobras'}, ${remito||''}, ${factura||''}, ${JSON.stringify({ llenas_ing, vacias_egr, cambios_egr })}, ${observaciones||''})`;
          const { rows } = await sql`SELECT * FROM deposito ORDER BY producto_id`; return res.json({ data: rows });
        }

        if (accion === 'ingreso_otros') {
          const { producto_id, cantidad, costo_unitario, factura, proveedor, observaciones } = body;
          const cant = parseInt(cantidad)||0;
          if(cant>0) await sql`UPDATE deposito SET llenas = COALESCE(llenas,0) + ${cant} WHERE producto_id = ${producto_id}`;
          if(costo_unitario) await sql`UPDATE productos SET costo_proveedor = ${costo_unitario} WHERE id = ${producto_id}`;
          await sql`INSERT INTO movimientos_stock (tipo, proveedor, factura, detalles, observaciones) VALUES ('ingreso_otros', ${proveedor||''}, ${factura||''}, ${JSON.stringify({ producto_id, cantidad: cant, costo_unitario })}, ${observaciones||''})`;
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id = ${producto_id}`; return res.json({ data: rows });
        }

        if (accion === 'venta_fraccionada') {
          // Venta de 1-3kg usando el tubo 43.5 como tanque madre
          const { kilos, cliente_nombre, precio_kilo } = body;
          const kg = parseFloat(kilos)||0;
          if(kg<0.5 || kg>3) return res.status(400).json({ error: 'Solo 1 a 3kg permitido para fraccionado' });
          
          const { rows: depRows } = await sql`SELECT * FROM deposito WHERE producto_id = '43.5'`;
          if(depRows.length===0) return res.status(400).json({ error: 'No hay tubo 43.5 en deposito' });
          let dep = depRows[0];
          let llenas = dep.llenas||0;
          let vacias = dep.vacias||0;
          let kilos_en_uso = parseFloat(dep.kilos_en_uso)||0;

          // Si no hay tubo en uso, abrir uno nuevo
          if(kilos_en_uso<=0) {
            if(llenas<=0) return res.status(400).json({ error: 'No hay tubos 43.5 llenos. Debe reponer proveedor.' });
            // Abrir tubo nuevo: llenas--, kilos_en_uso = 43.5
            llenas = llenas - 1;
            kilos_en_uso = 43.5;
          }

          // Verificar si alcanza
          if(kilos_en_uso < kg) {
            // Necesita abrir otro tubo si hay
            const restanteNecesario = kg - kilos_en_uso;
            if(llenas<=0) return res.status(400).json({ error: `Tubo en uso tiene solo ${kilos_en_uso.toFixed(1)}kg, necesita ${kg}kg y no hay tubos llenos para completar. Quedan ${llenas} tubos.` });
            // Usa lo que queda del tubo actual, lo vacía, abre nuevo
            // Tubo actual se vuelve vacio
            vacias = vacias + 1;
            llenas = llenas - 1;
            kilos_en_uso = 43.5 - restanteNecesario;
          } else {
            kilos_en_uso = kilos_en_uso - kg;
          }

          // Si después de la venta el tubo en uso quedó en 0 o casi 0, marcarlo como vacío
          if(kilos_en_uso <= 0.1) {
            vacias = vacias + 1;
            kilos_en_uso = 0;
          }

          await sql`UPDATE deposito SET llenas = ${llenas}, vacias = ${vacias}, kilos_en_uso = ${kilos_en_uso} WHERE producto_id = '43.5'`;
          
          // Registrar venta
          const ventaId = Date.now().toString(36);
          await sql`INSERT INTO ventas (id, cliente_nombre, producto_id, cantidad, precio_unitario, costo_proveedor, flete, total, pago, tipo_cliente, modo, tipo_venta) VALUES (${ventaId}, ${cliente_nombre||'Cliente Fraccionado'}, 'fraccionado', ${kg}, ${precio_kilo||0}, 0, 0, ${kg * (precio_kilo||100)}, 'contado', 'consumidor_final', 'fraccionado', 'mostrador')`;
          await sql`INSERT INTO movimientos_stock (tipo, detalles, observaciones) VALUES ('venta_fraccionada', ${JSON.stringify({ kilos: kg, cliente: cliente_nombre, restante: kilos_en_uso })}, ${'Venta fraccionada '+kg+'kg'})`;
          
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id = '43.5'`;
          return res.json({ data: rows, message: `Vendido ${kg}kg - Quedan ${kilos_en_uso.toFixed(1)}kg en tubo en uso`, restante: kilos_en_uso });
        }

        if (accion === 'iniciar_tubo_43') {
          // Iniciar nuevo tubo 43.5 manualmente (cuando se cambia tubo)
          const { rows: depRows } = await sql`SELECT * FROM deposito WHERE producto_id = '43.5'`;
          let dep = depRows[0]||{ llenas:0, vacias:0, kilos_en_uso:0 };
          if((dep.llenas||0)<=0) return res.status(400).json({ error: 'No hay tubos 43.5 llenos para iniciar' });
          const llenas = (dep.llenas||0) - 1;
          let vacias = dep.vacias||0;
          if((dep.kilos_en_uso||0)>0.1) {
            // Si había tubo en uso con resto, ese resto se pierde o se suma a vacías? Lo marcamos como vacío
            vacias = vacias + 1;
          }
          await sql`UPDATE deposito SET llenas = ${llenas}, vacias = ${vacias}, kilos_en_uso = 43.5 WHERE producto_id = '43.5'`;
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id = '43.5'`;
          return res.json({ data: rows, message: 'Nuevo tubo 43.5 iniciado con 43.5kg' });
        }

        if (accion === 'cambio_stock') {
          const { producto_id, tipo_cambio, cantidad } = body;
          const { rows: existing } = await sql`SELECT * FROM deposito WHERE producto_id = ${producto_id}`;
          let dep = existing[0]||{ llenas:0, vacias:0, cambio:0 };
          let nLlenas = dep.llenas||0, nVacias = dep.vacias||0, nCambio = dep.cambio||0;
          if (tipo_cambio === 'cambio') nCambio += cantidad;
          if (tipo_cambio === 'perdida') nLlenas = Math.max(0, nLlenas - cantidad);
          if (tipo_cambio === 'ajuste') nLlenas += cantidad;
          if (tipo_cambio === 'devolucion') nVacias += cantidad;
          if (tipo_cambio === 'llenado') { nLlenas += cantidad; nVacias = Math.max(0, nVacias - cantidad); }
          await sql`UPDATE deposito SET llenas = ${nLlenas}, vacias = ${nVacias}, cambio = ${nCambio} WHERE producto_id = ${producto_id}`;
          const { rows } = await sql`SELECT * FROM deposito WHERE producto_id = ${producto_id}`; return res.json({ data: rows });
        }

        return res.status(400).json({ error: 'Accion no reconocida: '+accion });
      }

      if (table === 'ventas') {
        const { id, cliente_nombre, producto_id, cantidad, precio_unitario, costo_proveedor, flete, total, pago, tipo_cliente, modo } = body;
        const vid = id || Date.now().toString(36);
        await sql`INSERT INTO ventas (id, cliente_nombre, producto_id, cantidad, precio_unitario, costo_proveedor, flete, total, pago, tipo_cliente, modo, tipo_venta) VALUES (${vid}, ${cliente_nombre||'Cliente'}, ${producto_id||'13'}, ${cantidad||1}, ${precio_unitario||0}, ${costo_proveedor||0}, ${flete||0}, ${total||0}, ${pago||'contado'}, ${tipo_cliente||'consumidor_final'}, ${modo||'retira'}, 'mostrador')`;
        if (producto_id !== '43.5' && producto_id !== 'fraccionado') {
          if (modo === 'venta_completa') {
            await sql`UPDATE deposito SET llenas = GREATEST(0, COALESCE(llenas,0) - ${cantidad||1}) WHERE producto_id = ${producto_id}`;
          } else {
            await sql`UPDATE deposito SET llenas = GREATEST(0, COALESCE(llenas,0) - ${cantidad||1}), vacias = COALESCE(vacias,0) + ${cantidad||1} WHERE producto_id = ${producto_id}`;
          }
        }
        const { rows } = await sql`SELECT * FROM ventas WHERE id = ${vid}`; return res.json({ data: rows });
      }

      return res.json({ data: [body] });
    }

    return res.status(405).json({ error: 'Metodo no permitido' });
  } catch (e) {
    console.error('PG ERROR:', e);
    return res.status(500).json({ error: e.message, data: [] });
  }
}

