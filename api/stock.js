
// /api/stock.js - MEGAL TURSO - CON BALANCE INICIAL + PRODUCTOS DINAMICOS
import { createClient } from '@libsql/client';
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  try{
    if(req.method==='GET'){
      const prod = await client.execute('SELECT * FROM productos ORDER BY producto_id');
      const dep = await client.execute('SELECT d.*, p.nombre, p.precio, p.permite_completo, p.es_fraccionado FROM deposito d LEFT JOIN productos p ON d.producto_id = p.producto_id ORDER BY d.producto_id');
      const cams = await client.execute('SELECT * FROM camionetas');
      const movs = await client.execute('SELECT * FROM movimientos ORDER BY fecha_hora DESC LIMIT 60');
      const fracc = await client.execute('SELECT * FROM ventas_fraccionadas ORDER BY fecha_hora DESC LIMIT 20');
      return res.json({ ok:true, productos: prod.rows, deposito: dep.rows, camionetas: cams.rows, movimientos: movs.rows, fraccionadas: fracc.rows });
    }
    if(req.method==='POST'){
      const body = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      const { accion } = body;
      const now = new Date().toISOString();

      if(accion==='balance_inicial'){
        const { balances } = body;
        for(const b of balances){
          await client.execute({ sql: `INSERT INTO deposito (producto_id, llenas, vacias, cambio, defectuosas, kilos_en_uso) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(producto_id) DO UPDATE SET llenas=?, vacias=?, cambio=?, defectuosas=?, kilos_en_uso=?`, args: [b.producto_id, b.llenas||0, b.vacias||0, b.cambio||0, b.defectuosas||0, b.kilos_en_uso||0, b.llenas||0, b.vacias||0, b.cambio||0, b.defectuosas||0, b.kilos_en_uso||0] });
        }
        await client.execute({ sql: `INSERT INTO movimientos (id, tipo, detalle, fecha_hora) VALUES (?, 'balance_inicial', ?, ?)`, args: [Date.now().toString(36), `Balance inicial: ${balances.map(b=>`${b.producto_id}:${b.llenas}L`).join(', ')}`, now] });
        return res.json({ok:true});
      }

      if(accion==='crear_producto'){
        const { producto } = body;
        const { producto_id, nombre, tipo, precio, llenas, vacias, cambio, kilos_en_uso } = producto;
        const permite = (producto_id==='11'||producto_id==='13'||tipo==='envase')?1:0;
        const fracc = (producto_id==='43.5'||tipo==='fraccionado')?1:0;
        await client.execute({ sql: `INSERT INTO productos (producto_id, nombre, precio, permite_completo, es_fraccionado, tipo) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(producto_id) DO UPDATE SET nombre=?, precio=?, tipo=?`, args: [producto_id, nombre, precio||0, permite, fracc, tipo, nombre, precio||0, tipo] });
        await client.execute({ sql: `INSERT INTO deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES (?, ?, ?, ?, ?) ON CONFLICT(producto_id) DO UPDATE SET llenas=llenas+?, vacias=vacias+?, cambio=cambio+?, kilos_en_uso=?`, args: [producto_id, llenas||0, vacias||0, cambio||0, kilos_en_uso||0, llenas||0, vacias||0, cambio||0, kilos_en_uso||0] });
        await client.execute({ sql: `INSERT INTO movimientos (id, tipo, detalle, fecha_hora, producto_id, cantidad) VALUES (?, 'nuevo_producto', ?, ?, ?, ?)`, args: [Date.now().toString(36), `Nuevo producto ${producto_id} - ${nombre}`, now, producto_id, llenas||0] });
        return res.json({ok:true});
      }

      if(accion==='carga_camioneta'){
        const { repartidor_id, producto_id, cantidad } = body;
        const depRow = await client.execute({sql:'SELECT * FROM deposito WHERE producto_id=?', args:[producto_id]});
        if(!depRow.rows[0] || depRow.rows[0].llenas < cantidad) return res.json({ok:false, error:`Sin stock de ${producto_id}`});
        await client.execute({sql:'UPDATE deposito SET llenas = llenas - ? WHERE producto_id=?', args:[cantidad, producto_id]});
        await client.execute({ sql:`INSERT INTO camionetas (repartidor_id, producto_id, llenas, nombre) VALUES (?, ?, ?, ?) ON CONFLICT(repartidor_id, producto_id) DO UPDATE SET llenas = llenas + ?`, args:[repartidor_id, producto_id, cantidad, producto_id, cantidad] });
        await client.execute({ sql:`INSERT INTO movimientos (id, tipo, detalle, fecha_hora, producto_id, cantidad, repartidor_id) VALUES (?, 'carga', ?, ?, ?, ?, ?)`, args:[Date.now().toString(36), `Carga ${cantidad}x ${producto_id} a ${repartidor_id} a las ${now.substring(11,19)}`, now, producto_id, cantidad, repartidor_id] });
        return res.json({ok:true, hora:now});
      }

      if(accion==='venta_fraccionada'){
        const { kilos, cliente_nombre, precio_kilo } = body;
        const depRow = await client.execute({sql:'SELECT * FROM deposito WHERE producto_id=?', args:['43.5']});
        const actual = depRow.rows[0]?.kilos_en_uso || 43.5;
        if(actual < kilos) return res.json({ok:false, error:`Tubo solo tiene ${actual}kg`});
        const restante = actual - kilos;
        if(restante < 0.5){ await client.execute({sql:'UPDATE deposito SET kilos_en_uso=0, llenas=llenas-1, vacias=vacias+1 WHERE producto_id=?', args:['43.5']}); } else { await client.execute({sql:'UPDATE deposito SET kilos_en_uso=? WHERE producto_id=?', args:[restante, '43.5']}); }
        await client.execute({ sql:`INSERT INTO ventas_fraccionadas (id, kilos, cliente_nombre, precio_kilo, total, fecha_hora) VALUES (?, ?, ?, ?, ?, ?)`, args:[Date.now().toString(36), kilos, cliente_nombre, precio_kilo||0, (kilos*(precio_kilo||0)), now] });
        await client.execute({ sql:`INSERT INTO movimientos (id, tipo, detalle, fecha_hora, producto_id, kilos) VALUES (?, 'fraccionada', ?, ?, ?, ?)`, args:[Date.now().toString(36), `${kilos}kg a ${cliente_nombre}`, now, '43.5', kilos] });
        return res.json({ok:true, restante});
      }

      if(accion==='descarga_camioneta'){
        const { repartidor_id } = body;
        const cams = await client.execute({sql:'SELECT * FROM camionetas WHERE repartidor_id=?', args:[repartidor_id]});
        for(const c of cams.rows){ await client.execute({sql:'UPDATE deposito SET llenas = llenas + ? WHERE producto_id=?', args:[c.llenas, c.producto_id]}); }
        await client.execute({sql:'DELETE FROM camionetas WHERE repartidor_id=?', args:[repartidor_id]});
        await client.execute({sql:`INSERT INTO movimientos (id, tipo, detalle, fecha_hora) VALUES (?, 'descarga', ?, ?)`, args:[Date.now().toString(36), `Descarga ${repartidor_id}`, now]});
        return res.json({ok:true});
      }

      if(accion==='proveedor'){
        const { tipo, producto_id, cantidad, numero_remito } = body;
        const cant = parseInt(cantidad)||1;
        if(tipo==='canje_vacio'){ await client.execute({sql:'UPDATE deposito SET vacias = vacias - ? , llenas = llenas + ? WHERE producto_id=?', args:[cant, cant, producto_id]}); }
        else if(tipo==='canje_cambio'){ await client.execute({sql:'UPDATE deposito SET cambio = cambio - ? , llenas = llenas + ? WHERE producto_id=?', args:[cant, cant, producto_id]}); }
        else if(tipo==='compra_envase'){ await client.execute({sql:'UPDATE deposito SET llenas = llenas + ? WHERE producto_id=?', args:[cant, producto_id]}); }
        await client.execute({sql:`INSERT INTO movimientos (id, tipo, detalle, fecha_hora, remito_entrada, producto_id, cantidad) VALUES (?, 'proveedor', ?, ?, ?, ?, ?)`, args:[Date.now().toString(36), `${tipo} ${cant}x ${producto_id}`, now, numero_remito, producto_id, cant]});
        return res.json({ok:true});
      }

      return res.json({ok:false, error:'Accion no conocida'});
    }
  }catch(e){ console.error(e); return res.status(500).json({ok:false, error:e.message}); }
}

