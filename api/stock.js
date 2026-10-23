// api/stock.js - MEGAL STOCK v3 FINAL - Fix 500
export default async function handler(req, res) {
  const TURSO_RAW = process.env.TURSO_DATABASE_URL;
  const TURSO_URL = TURSO_RAW ? TURSO_RAW.replace('libsql://', 'https://') : null;
  const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
  
  if (!TURSO_URL || !TURSO_TOKEN) {
    return res.status(500).json({error: "Falta TURSO config"});
  }

  async function fetchAll(q){
    try {
      const r = await fetch(TURSO_URL,{
        method:"POST",
        headers:{"Authorization":`Bearer ${TURSO_TOKEN}`,"Content-Type":"application/json"},
        body:JSON.stringify({statements:[{q}]})
      });
      if(!r.ok){
        const txt = await r.text();
        console.error("Turso error:", txt);
        return [];
      }
      const data = await r.json();
      if(!data[0]?.results) return [];
      const result = data[0].results;
      const cols = result.columns || [];
      const rows = result.rows || [];
      return rows.map(row=>{
        const obj={};
        cols.forEach((c,i)=> obj[c]=row[i]);
        return obj;
      });
    } catch(e){
      console.error("fetchAll error", q, e);
      return [];
    }
  }

  async function exec(q){
    try {
      await fetch(TURSO_URL,{
        method:"POST",
        headers:{"Authorization":`Bearer ${TURSO_TOKEN}`,"Content-Type":"application/json"},
        body:JSON.stringify({statements:[{q}]})
      });
    } catch(e){ console.error(e); }
  }

  try {
    if(req.method === 'GET'){
      const deposito = await fetchAll("SELECT d.*, p.nombre, p.tipo, p.permite_completo, p.es_fraccionado FROM stock_deposito d LEFT JOIN productos p ON d.producto_id = p.id");
      const camionetas = await fetchAll("SELECT c.*, p.nombre, r.nombre as repartidor_nombre FROM stock_camioneta c LEFT JOIN productos p ON c.producto_id = p.id LEFT JOIN repartidores r ON c.repartidor_id = r.id");
      const movimientos = await fetchAll("SELECT * FROM movimientos_stock ORDER BY fecha_hora DESC LIMIT 100");
      const fraccionadas = await fetchAll("SELECT * FROM ventas_fraccionadas ORDER BY fecha_hora DESC LIMIT 50");
      return res.status(200).json({ok:true, deposito, camionetas, movimientos, fraccionadas});
    }

    if(req.method === 'POST'){
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const {accion} = body;
      const id = `mov_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
      const ahora = new Date().toISOString();

      if(accion==='carga_camioneta'){
        const {repartidor_id, producto_id, cantidad} = body;
        await exec(`UPDATE stock_deposito SET llenas = llenas - ${cantidad} WHERE producto_id='${producto_id}'`);
        await exec(`INSERT INTO stock_camioneta (repartidor_id, producto_id, llenas) VALUES ('${repartidor_id}','${producto_id}',${cantidad}) ON CONFLICT(repartidor_id, producto_id) DO UPDATE SET llenas = llenas + ${cantidad}`);
        await exec(`INSERT INTO movimientos_stock (id, fecha_hora, tipo, origen, destino, repartidor_id, producto_id, cantidad, detalle) VALUES ('${id}','${ahora}','CARGA','deposito','${repartidor_id}','${producto_id}',${cantidad},'Carga ${repartidor_id} ${cantidad}x ${producto_id} - ${ahora}')`);
        return res.status(200).json({ok:true, hora: ahora});
      }

      if(accion==='venta'){
        const {origen, repartidor_id, producto_id, modalidad, cantidad=1} = body;
        if(origen==='camioneta'){
          if(modalidad==='recarga') await exec(`UPDATE stock_camioneta SET llenas = llenas - ${cantidad}, vacias = vacias + ${cantidad} WHERE repartidor_id='${repartidor_id}' AND producto_id='${producto_id}'`);
          else if(modalidad==='completo') await exec(`UPDATE stock_camioneta SET llenas = llenas - ${cantidad} WHERE repartidor_id='${repartidor_id}' AND producto_id='${producto_id}'`);
          else await exec(`UPDATE stock_camioneta SET llenas = llenas - ${cantidad}, cambio = cambio + ${cantidad} WHERE repartidor_id='${repartidor_id}' AND producto_id='${producto_id}'`);
        } else {
          if(modalidad==='recarga') await exec(`UPDATE stock_deposito SET llenas = llenas - ${cantidad}, vacias = vacias + ${cantidad} WHERE producto_id='${producto_id}'`);
          else if(modalidad==='completo') await exec(`UPDATE stock_deposito SET llenas = llenas - ${cantidad} WHERE producto_id='${producto_id}'`);
          else await exec(`UPDATE stock_deposito SET llenas = llenas - ${cantidad}, cambio = cambio + ${cantidad} WHERE producto_id='${producto_id}'`);
        }
        await exec(`INSERT INTO movimientos_stock (id, fecha_hora, tipo, origen, repartidor_id, producto_id, cantidad, modalidad, detalle) VALUES ('${id}','${ahora}','VENTA','${origen}','${repartidor_id}','${producto_id}',${cantidad},'${modalidad}','Venta ${modalidad} ${producto_id}')`);
        return res.status(200).json({ok:true});
      }

      if(accion==='venta_fraccionada'){
        const {kilos, cliente_nombre, precio_kilo} = body;
        const dep = await fetchAll("SELECT kilos_en_uso, llenas FROM stock_deposito WHERE producto_id='43.5'");
        let kilosRest = dep[0]?.kilos_en_uso || 0;
        if(kilosRest < kilos){
          if((dep[0]?.llenas||0)<1) return res.status(400).json({error:"No hay tubos 43.5 llenos"});
          await exec(`UPDATE stock_deposito SET llenas = llenas -1, kilos_en_uso = 43.5 WHERE producto_id='43.5'`);
          kilosRest = 43.5;
        }
        await exec(`UPDATE stock_deposito SET kilos_en_uso = kilos_en_uso - ${kilos} WHERE producto_id='43.5'`);
        const nuevoRest = kilosRest - kilos;
        if(nuevoRest <= 0.1) await exec(`UPDATE stock_deposito SET vacias = vacias + 1, kilos_en_uso = 0 WHERE producto_id='43.5'`);
        await exec(`INSERT INTO ventas_fraccionadas (id, fecha_hora, kilos, cliente_nombre, precio_por_kilo, total) VALUES ('${id}','${ahora}',${kilos},'${cliente_nombre||'Cliente'}',${precio_kilo||0},${kilos*(precio_kilo||0)})`);
        await exec(`INSERT INTO movimientos_stock (id, fecha_hora, tipo, origen, producto_id, kilos, detalle) VALUES ('${id}','${ahora}','FRACCIONADO','mostrador','43.5',${kilos},'Fracc ${kilos}kg a ${cliente_nombre} Rest ${nuevoRest.toFixed(1)}kg')`);
        return res.status(200).json({ok:true, restante: nuevoRest});
      }

      if(accion==='descarga_camioneta'){
        const {repartidor_id} = body;
        const stock = await fetchAll(`SELECT * FROM stock_camioneta WHERE repartidor_id='${repartidor_id}'`);
        for(const s of stock){
          await exec(`UPDATE stock_deposito SET vacias = vacias + ${s.vacias||0}, cambio = cambio + ${s.cambio||0}, llenas = llenas + ${s.llenas||0} WHERE producto_id='${s.producto_id}'`);
          await exec(`UPDATE stock_camioneta SET llenas=0, vacias=0, cambio=0 WHERE repartidor_id='${repartidor_id}' AND producto_id='${s.producto_id}'`);
        }
        await exec(`INSERT INTO movimientos_stock (id, fecha_hora, tipo, origen, destino, repartidor_id, detalle) VALUES ('${id}','${ahora}','DESCARGA','${repartidor_id}','deposito','${repartidor_id}','Descarga ${repartidor_id}')`);
        return res.status(200).json({ok:true});
      }

      if(accion==='proveedor'){
        const {tipo, numero_remito, producto_id, cantidad} = body;
        if(tipo==='canje_vacio') await exec(`UPDATE stock_deposito SET vacias = vacias - ${cantidad}, llenas = llenas + ${cantidad} WHERE producto_id='${producto_id}'`);
        else if(tipo==='canje_cambio') await exec(`UPDATE stock_deposito SET cambio = cambio - ${cantidad}, llenas = llenas + ${cantidad} WHERE producto_id='${producto_id}'`);
        else if(tipo==='compra_envase') await exec(`UPDATE stock_deposito SET llenas = llenas + ${cantidad} WHERE producto_id='${producto_id}'`);
        await exec(`INSERT INTO movimientos_stock (id, fecha_hora, tipo, producto_id, cantidad, remito_entrada, detalle) VALUES ('${id}','${ahora}','PROVEEDOR_${tipo.toUpperCase()}','${producto_id}',${cantidad},'${numero_remito}','Prov ${tipo} ${cantidad}x ${producto_id} Remito ${numero_remito}')`);
        return res.status(200).json({ok:true});
      }
    }

    return res.status(405).json({error:"Method not allowed"});
  } catch(e){
    console.error(e);
    return res.status(500).json({error: e.message});
  }
}
