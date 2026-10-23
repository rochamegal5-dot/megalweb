
// /api/stock.js - ADAPTADO A TU TURSO REAL: stock_deposito, productos(id), stock_camioneta, movimientos_stock
import { createClient } from '@libsql/client';
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function getTables(){
  const r = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  return r.rows.map(x=>x.name);
}

async function getColumns(table){
  try{
    const r = await client.execute(`PRAGMA table_info(${table})`);
    return r.rows.map(x=>x.name);
  }catch{ return []; }
}

export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  
  try{
    const tables = await getTables();
    const depositoTable = tables.includes('stock_deposito') ? 'stock_deposito' : (tables.includes('deposito') ? 'deposito' : 'stock_deposito');
    const camionetaTable = tables.includes('stock_camioneta') ? 'stock_camioneta' : (tables.includes('camionetas') ? 'camionetas' : 'stock_camioneta');
    const movimientosTable = tables.includes('movimientos_stock') ? 'movimientos_stock' : (tables.includes('movimientos') ? 'movimientos' : 'movimientos_stock');
    const fraccTable = tables.includes('ventas_fraccionadas') ? 'ventas_fraccionadas' : 'ventas_fraccionadas';
    const productosTable = tables.includes('productos') ? 'productos' : 'productos';

    const prodCols = await getColumns(productosTable);
    const prodIdCol = prodCols.includes('producto_id') ? 'producto_id' : (prodCols.includes('id') ? 'id' : 'producto_id');
    const depCols = await getColumns(depositoTable);
    const depProdCol = depCols.includes('producto_id') ? 'producto_id' : (depCols.includes('id') ? 'id' : (depCols.includes('producto') ? 'producto' : 'producto_id'));

    if(req.method==='GET'){
      let productos = {rows:[]}, deposito = {rows:[]}, camionetas = {rows:[]}, movimientos = {rows:[]}, fracc = {rows:[]};
      try{ productos = await client.execute(`SELECT * FROM ${productosTable}`); }catch(e){}
      try{ deposito = await client.execute(`SELECT * FROM ${depositoTable}`); }catch(e){ deposito={rows:[]}; }
      try{ camionetas = await client.execute(`SELECT * FROM ${camionetaTable}`); }catch(e){}
      try{ movimientos = await client.execute(`SELECT * FROM ${movimientosTable} ORDER BY fecha_hora DESC LIMIT 60`); }catch(e){ try{ movimientos = await client.execute(`SELECT * FROM ${movimientosTable} ORDER BY id DESC LIMIT 60`); }catch(e2){} }
      try{ fracc = await client.execute(`SELECT * FROM ${fraccTable} ORDER BY fecha_hora DESC LIMIT 20`); }catch(e){}

      // Normalizar deposito a formato {producto_id, llenas, vacias, cambio, kilos_en_uso, nombre}
      const prodMap = {};
      productos.rows.forEach(p=>{ const pid = String(p[prodIdCol]||'').trim(); if(pid) prodMap[pid]=p; });

      const depositoNorm = deposito.rows.map(d=>{
        const pid = String(d[depProdCol] || d.producto_id || d.id || '').trim();
        const p = prodMap[pid] || {};
        return {
          producto_id: pid,
          nombre: d.nombre || p.nombre || p.name || pid,
          llenas: d.llenas ?? d.stock_llenas ?? d.cantidad_llenas ?? d.llen ?? 0,
          vacias: d.vacias ?? d.stock_vacias ?? d.vac ?? 0,
          cambio: d.cambio ?? d.cambio_env ?? 0,
          defectuosas: d.defectuosas ?? 0,
          kilos_en_uso: d.kilos_en_uso ?? d.kilos ?? d.kg_en_uso ?? 0,
          permite_completo: p.permite_completo ?? (pid==='11'||pid==='13'?1:0),
          es_fraccionado: p.es_fraccionado ?? (pid==='43.5'?1:0),
          _raw: d
        };
      }).filter(d=>d.producto_id);

      return res.json({ ok:true, productos: productos.rows, deposito: depositoNorm, camionetas: camionetas.rows, movimientos: movimientos.rows, fraccionadas: fracc.rows, _meta:{depositoTable, camionetaTable, movimientosTable, prodIdCol, depProdCol} });
    }

    if(req.method==='POST'){
      const body = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      const { accion } = body;
      const now = new Date().toISOString();

      if(accion==='balance_inicial'){
        const { balances } = body;
        for(const b of balances){
          // Upsert en stock_deposito
          try{
            // Intentar UPDATE
            const upd = await client.execute({ sql: `UPDATE ${depositoTable} SET llenas=?, vacias=?, cambio=?, kilos_en_uso=? WHERE ${depProdCol}=?`, args: [b.llenas||0, b.vacias||0, b.cambio||0, b.kilos_en_uso||0, b.producto_id] });
          }catch(e){}
          // Intentar INSERT OR REPLACE
          try{
            await client.execute({ sql: `INSERT OR REPLACE INTO ${depositoTable} (${depProdCol}, llenas, vacias, cambio, kilos_en_uso) VALUES (?, ?, ?, ?, ?)`, args: [b.producto_id, b.llenas||0, b.vacias||0, b.cambio||0, b.kilos_en_uso||0] });
          }catch(e){
            try{ await client.execute({ sql: `INSERT INTO ${depositoTable} (${depProdCol}, llenas, vacias, cambio) VALUES (?, ?, ?, ?)`, args: [b.producto_id, b.llenas||0, b.vacias||0, b.cambio||0] }); }catch(e2){}
          }
        }
        try{ await client.execute({ sql: `INSERT INTO ${movimientosTable} (id, tipo, detalle, fecha_hora) VALUES (?, ?, ?, ?)`, args: [Date.now().toString(36), 'balance_inicial', `Balance: ${balances.map(b=>`${b.producto_id}:${b.llenas}L`).join(', ')}`, now] }); }catch(e){}
        return res.json({ok:true});
      }

      if(accion==='crear_producto'){
        const { producto } = body;
        const { producto_id, nombre, precio, llenas, vacias, cambio, kilos_en_uso } = producto;
        try{
          await client.execute({ sql: `INSERT OR REPLACE INTO ${productosTable} (${prodIdCol}, nombre, precio) VALUES (?, ?, ?)`, args: [producto_id, nombre, precio||0] });
        }catch(e){
          try{ await client.execute({ sql: `INSERT INTO ${productosTable} (${prodIdCol}, nombre) VALUES (?, ?)`, args: [producto_id, nombre] }); }catch(e2){}
        }
        try{
          await client.execute({ sql: `INSERT OR REPLACE INTO ${depositoTable} (${depProdCol}, llenas, vacias, cambio, kilos_en_uso) VALUES (?, ?, ?, ?, ?)`, args: [producto_id, llenas||0, vacias||0, cambio||0, kilos_en_uso||0] });
        }catch(e){}
        try{ await client.execute({ sql: `INSERT INTO ${movimientosTable} (id, tipo, detalle, fecha_hora, producto_id) VALUES (?, ?, ?, ?, ?)`, args: [Date.now().toString(36), 'nuevo_producto', `Nuevo ${producto_id} - ${nombre}`, now, producto_id] }); }catch(e){}
        return res.json({ok:true});
      }

      if(accion==='carga_camioneta'){
        const { repartidor_id, producto_id, cantidad } = body;
        try{
          await client.execute({ sql: `UPDATE ${depositoTable} SET llenas = llenas - ? WHERE ${depProdCol}=?`, args: [cantidad, producto_id] });
        }catch(e){ return res.json({ok:false, error:'Sin stock o tabla: '+e.message}); }
        try{
          await client.execute({ sql: `INSERT INTO ${camionetaTable} (repartidor_id, producto_id, llenas) VALUES (?, ?, ?) ON CONFLICT(repartidor_id, producto_id) DO UPDATE SET llenas = llenas + ?`, args: [repartidor_id, producto_id, cantidad, cantidad] });
        }catch(e){
          try{
            const ex = await client.execute({ sql: `SELECT * FROM ${camionetaTable} WHERE repartidor_id=? AND producto_id=?`, args: [repartidor_id, producto_id] });
            if(ex.rows.length){ await client.execute({ sql: `UPDATE ${camionetaTable} SET llenas = llenas + ? WHERE repartidor_id=? AND producto_id=?`, args: [cantidad, repartidor_id, producto_id] }); }
            else { await client.execute({ sql: `INSERT INTO ${camionetaTable} (repartidor_id, producto_id, llenas) VALUES (?, ?, ?)`, args: [repartidor_id, producto_id, cantidad] }); }
          }catch(e2){ return res.json({ok:false, error:e2.message}); }
        }
        try{ await client.execute({ sql: `INSERT INTO ${movimientosTable} (id, tipo, detalle, fecha_hora, producto_id, cantidad, repartidor_id) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [Date.now().toString(36), 'carga', `Carga ${cantidad}x ${producto_id} a ${repartidor_id}`, now, producto_id, cantidad, repartidor_id] }); }catch(e){}
        return res.json({ok:true});
      }

      if(accion==='venta_fraccionada'){
        const { kilos, cliente_nombre } = body;
        try{
          const depRow = await client.execute({ sql: `SELECT * FROM ${depositoTable} WHERE ${depProdCol}=?`, args: ['43.5'] });
          const actual = depRow.rows[0]?.kilos_en_uso ?? 43.5;
          const restante = actual - kilos;
          if(restante < 0.5){ await client.execute({ sql: `UPDATE ${depositoTable} SET kilos_en_uso=0, llenas=llenas-1, vacias=vacias+1 WHERE ${depProdCol}=?`, args: ['43.5'] }); }
          else { await client.execute({ sql: `UPDATE ${depositoTable} SET kilos_en_uso=? WHERE ${depProdCol}=?`, args: [restante, '43.5'] }); }
          try{ await client.execute({ sql: `INSERT INTO ${fraccTable} (id, kilos, cliente_nombre, fecha_hora) VALUES (?, ?, ?, ?)`, args: [Date.now().toString(36), kilos, cliente_nombre, now] }); }catch(e){}
          try{ await client.execute({ sql: `INSERT INTO ${movimientosTable} (id, tipo, detalle, fecha_hora) VALUES (?, ?, ?, ?)`, args: [Date.now().toString(36), 'fraccionada', `${kilos}kg a ${cliente_nombre}`, now] }); }catch(e){}
          return res.json({ok:true, restante});
        }catch(e){ return res.json({ok:false, error:e.message}); }
      }

      if(accion==='descarga_camioneta'){
        const { repartidor_id } = body;
        try{
          const cams = await client.execute({ sql: `SELECT * FROM ${camionetaTable} WHERE repartidor_id=?`, args: [repartidor_id] });
          for(const c of cams.rows){ await client.execute({ sql: `UPDATE ${depositoTable} SET llenas = llenas + ? WHERE ${depProdCol}=?`, args: [c.llenas, c.producto_id] }); }
          await client.execute({ sql: `DELETE FROM ${camionetaTable} WHERE repartidor_id=?`, args: [repartidor_id] });
          return res.json({ok:true});
        }catch(e){ return res.json({ok:false, error:e.message}); }
      }

      if(accion==='proveedor'){
        const { tipo, producto_id, cantidad, numero_remito } = body;
        const cant = parseInt(cantidad)||1;
        try{
          if(tipo==='canje_vacio'){ await client.execute({ sql: `UPDATE ${depositoTable} SET vacias = vacias - ?, llenas = llenas + ? WHERE ${depProdCol}=?`, args: [cant, cant, producto_id] }); }
          else if(tipo==='canje_cambio'){ await client.execute({ sql: `UPDATE ${depositoTable} SET cambio = cambio - ?, llenas = llenas + ? WHERE ${depProdCol}=?`, args: [cant, cant, producto_id] }); }
          else if(tipo==='compra_envase'){ await client.execute({ sql: `UPDATE ${depositoTable} SET llenas = llenas + ? WHERE ${depProdCol}=?`, args: [cant, producto_id] }); }
          try{ await client.execute({ sql: `INSERT INTO ${movimientosTable} (id, tipo, detalle, fecha_hora, remito_entrada) VALUES (?, ?, ?, ?, ?)`, args: [Date.now().toString(36), 'proveedor', `${tipo} ${cant}x ${producto_id}`, now, numero_remito] }); }catch(e){}
          return res.json({ok:true});
        }catch(e){ return res.json({ok:false, error:e.message}); }
      }

      return res.json({ok:false, error:'Accion no conocida: '+accion});
    }
  }catch(e){
    return res.status(500).json({ok:false, error:e.message, stack:e.stack});
  }
}

