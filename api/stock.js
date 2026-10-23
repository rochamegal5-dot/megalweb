
// /api/stock.js - MEGAL TURSO - FIX SIN JOIN - CON BALANCE + PRODUCTOS DINAMICOS
import { createClient } from '@libsql/client';
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  try{
    if(req.method==='GET'){
      // Queries simples sin JOIN para no romper si falta columna
      const prod = await client.execute('SELECT * FROM productos');
      const dep = await client.execute('SELECT * FROM deposito');
      const cams = await client.execute('SELECT * FROM camionetas');
      const movs = await client.execute('SELECT * FROM movimientos ORDER BY fecha_hora DESC LIMIT 60');
      const fracc = await client.execute('SELECT * FROM ventas_fraccionadas ORDER BY fecha_hora DESC LIMIT 20').catch(()=>({rows:[]}));
      
      // Merge nombres desde productos si deposito no tiene nombre
      const prodMap = {};
      prod.rows.forEach(p=>{
        const pid = p.producto_id || p.id || p.codigo;
        prodMap[pid] = p;
      });
      
      const depEnriched = dep.rows.map(d=>{
        const pid = d.producto_id || d.id;
        const p = prodMap[pid] || {};
        return {
          ...d,
          producto_id: pid,
          nombre: d.nombre || p.nombre || pid,
          precio: d.precio || p.precio || 0,
          permite_completo: d.permite_completo ?? p.permite_completo ?? (pid==='11'||pid==='13'?1:0),
          es_fraccionado: d.es_fraccionado ?? p.es_fraccionado ?? (pid==='43.5'?1:0),
        };
      });

      return res.json({ ok:true, productos: prod.rows, deposito: depEnriched, camionetas: cams.rows, movimientos: movs.rows, fraccionadas: fracc.rows });
    }
    
    if(req.method==='POST'){
      const body = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      const { accion } = body;
      const now = new Date().toISOString();

      if(accion==='balance_inicial'){
        const { balances } = body;
        for(const b of balances){
          // Intenta actualizar, si no existe inserta
          try{
            await client.execute({ sql: 'UPDATE deposito SET llenas=?, vacias=?, cambio=?, kilos_en_uso=? WHERE producto_id=?', args: [b.llenas||0, b.vacias||0, b.cambio||0, b.kilos_en_uso||0, b.producto_id] });
            const check = await client.execute({ sql: 'SELECT changes() as c', args: [] });
            if(check.rows[0]?.c === 0){
              await client.execute({ sql: 'INSERT INTO deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES (?, ?, ?, ?, ?)', args: [b.producto_id, b.llenas||0, b.vacias||0, b.cambio||0, b.kilos_en_uso||0] });
            }
          }catch(e){
            // Fallback insert directo
            await client.execute({ sql: 'INSERT OR REPLACE INTO deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES (?, ?, ?, ?, ?)', args: [b.producto_id, b.llenas||0, b.vacias||0, b.cambio||0, b.kilos_en_uso||0] }).catch(()=>{});
          }
        }
        await client.execute({ sql: 'INSERT INTO movimientos (id, tipo, detalle, fecha_hora) VALUES (?, ?, ?, ?)', args: [Date.now().toString(36), 'balance_inicial', `Balance: ${balances.map(b=>`${b.producto_id}:${b.llenas}L`).join(', ')}`, now] });
        return res.json({ok:true});
      }

      if(accion==='crear_producto'){
        const { producto } = body;
        const { producto_id, nombre, tipo, precio, llenas, vacias, cambio, kilos_en_uso } = producto;
        const permite = (producto_id==='11'||producto_id==='13')?1:0;
        const fracc = (producto_id==='43.5')?1:0;
        
        // Inserta en productos si existe la tabla, si no ignora y solo va a deposito
        try{
          await client.execute({ sql: 'INSERT OR REPLACE INTO productos (producto_id, nombre, precio, tipo, permite_completo, es_fraccionado) VALUES (?, ?, ?, ?, ?, ?)', args: [producto_id, nombre, precio||0, tipo||'otro', permite, fracc] });
        }catch(e){
          // Si productos tiene esquema id/nombre diferente
          try{ await client.execute({ sql: 'INSERT OR REPLACE INTO productos (id, nombre, precio) VALUES (?, ?, ?)', args: [producto_id, nombre, precio||0] }); }catch(e2){}
        }
        
        try{
          await client.execute({ sql: 'INSERT OR REPLACE INTO deposito (producto_id, llenas, vacias, cambio, kilos_en_uso, nombre) VALUES (?, ?, ?, ?, ?, ?)', args: [producto_id, llenas||0, vacias||0, cambio||0, kilos_en_uso||0, nombre] });
        }catch(e){
          await client.execute({ sql: 'INSERT OR REPLACE INTO deposito (producto_id, llenas, vacias, cambio, kilos_en_uso) VALUES (?, ?, ?, ?, ?)', args: [producto_id, llenas||0, vacias||0, cambio||0, kilos_en_uso||0] });
        }
        
        await client.execute({ sql: 'INSERT INTO movimientos (id, tipo, detalle, fecha_hora, producto_id, cantidad) VALUES (?, ?, ?, ?, ?, ?)', args: [Date.now().toString(36), `Nuevo producto ${producto_id} - ${nombre}`, now, producto_id, llenas||0] });
        return res.json({ok:true});
      }

      if(accion==='carga_camioneta'){
        const { repartidor_id, producto_id, cantidad } = body;
        const depRow = await client.execute({sql:'SELECT * FROM deposito WHERE producto_id=?', args:[producto_id]});
        if(!depRow.rows[0] || (depRow.rows[0].llenas||0) < cantidad) return res.json({ok:false, error:`Sin stock de ${producto_id}`});
        await client.execute({sql:'UPDATE deposito SET llenas = llenas - ? WHERE producto_id=?', args:[cantidad, producto_id]});
        await client.execute({ sql:'INSERT INTO camionetas (repartidor_id, producto_id, llenas) VALUES (?, ?, ?) ON CONFLICT(repartidor_id, producto_id) DO UPDATE SET llenas = llenas + ?', args:[repartidor_id, producto_id, cantidad, cantidad] }).catch(async ()=>{
          // Si no tiene constraint unico, borra e inserta
          const existing = await client.execute({sql:'SELECT * FROM camionetas WHERE repartidor_id=? AND producto_id=?', args:[repartidor_id, producto_id]});
          if(existing.rows[0]){ await client.execute({sql:'UPDATE camionetas SET llenas = llenas + ? WHERE repartidor_id=? AND producto_id=?', args:[cantidad, repartidor_id, producto_id]}); }
          else { await client.execute({sql:'INSERT INTO camionetas (repartidor_id, producto_id, llenas) VALUES (?, ?, ?)', args:[repartidor_id, producto_id, cantidad]}); }
        });
        await client.execute({ sql:'INSERT INTO movimientos (id, tipo, detalle, fecha_hora, producto_id, cantidad, repartidor_id) VALUES (?, ?, ?, ?, ?, ?, ?)', args:[Date.now().toString(36), `Carga ${cantidad}x ${producto_id} a ${repartidor_id} ${now.substring(11,19)}`, now, producto_id, cantidad, repartidor_id] });
        return res.json({ok:true, hora:now});
      }

      if(accion==='venta_fraccionada'){
        const { kilos, cliente_nombre } = body;
        const depRow = await client.execute({sql:'SELECT * FROM deposito WHERE producto_id=?', args:['43.5']});
        const actual = depRow.rows[0]?.kilos_en_uso ?? 43.5;
        if(actual < kilos) return res.json({ok:false, error:`Tubo solo tiene ${actual}kg`});
        const restante = actual - kilos;
        if(restante < 0.5){ await client.execute({sql:'UPDATE deposito SET kilos_en_uso=0, llenas=llenas-1, vacias=vacias+1 WHERE producto_id=?', args:['43.5']}); }
        else { await client.execute({sql:'UPDATE deposito SET kilos_en_uso=? WHERE producto_id=?', args:[restante, '43.5']}); }
        await client.execute({ sql:'INSERT INTO ventas_fraccionadas (id, kilos, cliente_nombre, fecha_hora) VALUES (?, ?, ?, ?)', args:[Date.now().toString(36), kilos, cliente_nombre, now] }).catch(()=>{});
        await client.execute({ sql:'INSERT INTO movimientos (id, tipo, detalle, fecha_hora, producto_id, kilos) VALUES (?, ?, ?, ?, ?, ?)', args:[Date.now().toString(36), `${kilos}kg a ${cliente_nombre}`, now, '43.5', kilos] });
        return res.json({ok:true, restante});
      }

      if(accion==='descarga_camioneta'){
        const { repartidor_id } = body;
        const cams = await client.execute({sql:'SELECT * FROM camionetas WHERE repartidor_id=?', args:[repartidor_id]});
        for(const c of cams.rows){ await client.execute({sql:'UPDATE deposito SET llenas = llenas + ? WHERE producto_id=?', args:[c.llenas, c.producto_id]}); }
        await client.execute({sql:'DELETE FROM camionetas WHERE repartidor_id=?', args:[repartidor_id]});
        await client.execute({sql:'INSERT INTO movimientos (id, tipo, detalle, fecha_hora) VALUES (?, ?, ?, ?)', args:[Date.now().toString(36), 'descarga', `Descarga ${repartidor_id}`, now]});
        return res.json({ok:true});
      }

      if(accion==='proveedor'){
        const { tipo, producto_id, cantidad, numero_remito } = body;
        const cant = parseInt(cantidad)||1;
        if(tipo==='canje_vacio'){ await client.execute({sql:'UPDATE deposito SET vacias = vacias - ? , llenas = llenas + ? WHERE producto_id=?', args:[cant, cant, producto_id]}); }
        else if(tipo==='canje_cambio'){ await client.execute({sql:'UPDATE deposito SET cambio = cambio - ? , llenas = llenas + ? WHERE producto_id=?', args:[cant, cant, producto_id]}); }
        else if(tipo==='compra_envase'){ await client.execute({sql:'UPDATE deposito SET llenas = llenas + ? WHERE producto_id=?', args:[cant, producto_id]}); }
        await client.execute({sql:'INSERT INTO movimientos (id, tipo, detalle, fecha_hora, remito_entrada, producto_id, cantidad) VALUES (?, ?, ?, ?, ?, ?, ?)', args:[Date.now().toString(36), `${tipo} ${cant}x ${producto_id}`, now, numero_remito, producto_id, cant]});
        return res.json({ok:true});
      }

      return res.json({ok:false, error:'Accion no conocida'});
    }
  }catch(e){ console.error(e); return res.status(500).json({ok:false, error:e.message, stack:e.stack}); }
}

