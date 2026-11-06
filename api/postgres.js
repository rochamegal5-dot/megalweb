import { sql } from '@vercel/postgres';

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  
  try{
    const {table, id, hoy, canal, desde, hasta} = req.query;
    let body = {};
    try{
      if(req.body){
        body = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      }
    }catch(e){ body = {}; }

    // ========== CREACIÓN DE TABLAS ==========
    // Deposito con soporte fraccionado
    await sql`CREATE TABLE IF NOT EXISTS deposito (
      producto_id TEXT PRIMARY KEY,
      llenas INT DEFAULT 0,
      vacias INT DEFAULT 0,
      para_cambio INT DEFAULT 0,
      en_uso INT DEFAULT 0,
      kilos_restantes DOUBLE PRECISION DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0`;
    await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`;

    // Ventas
    await sql`CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      fecha TIMESTAMPTZ DEFAULT NOW(),
      fecha_local TEXT,
      hoy DATE,
      tipo TEXT,
      tipo_cliente TEXT,
      modo TEXT,
      canal TEXT,
      producto_id TEXT,
      cantidad INT DEFAULT 1,
      precio_unitario DOUBLE PRECISION DEFAULT 0,
      flete DOUBLE PRECISION DEFAULT 0,
      total DOUBLE PRECISION DEFAULT 0,
      cliente_nombre TEXT,
      cliente_id TEXT,
      pago TEXT,
      kilos DOUBLE PRECISION DEFAULT 0,
      repartidor_id TEXT,
      estado TEXT DEFAULT 'completada'
    )`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS flete DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_cliente TEXT`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS modo TEXT`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS canal TEXT`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_nombre TEXT`;

    // Productos
    await sql`CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      tipo TEXT,
      categoria TEXT,
      precio_compra DOUBLE PRECISION DEFAULT 0,
      precio_venta DOUBLE PRECISION DEFAULT 0,
      proveedor_id TEXT,
      stock_minimo INT DEFAULT 5,
      kilos DOUBLE PRECISION DEFAULT 0,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`ALTER TABLE productos ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    
    // Clientes
    await sql`CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      telefono TEXT,
      direccion TEXT,
      tipo TEXT DEFAULT 'Consumidor Final',
      barrio TEXT,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    // Proveedores
    await sql`CREATE TABLE IF NOT EXISTS proveedores (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      telefono TEXT,
      rut TEXT,
      direccion TEXT,
      tipo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    // Repartidores
    await sql`CREATE TABLE IF NOT EXISTS repartidores (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      telefono TEXT,
      vehiculo TEXT,
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
        // Finanzas
    await sql`CREATE TABLE IF NOT EXISTS finanzas (
      id TEXT PRIMARY KEY,
      fecha DATE DEFAULT CURRENT_DATE,
      tipo TEXT,
      categoria TEXT,
      descripcion TEXT,
      monto DOUBLE PRECISION DEFAULT 0,
      metodo_pago TEXT,
      proveedor_id TEXT,
      comprobante TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`ALTER TABLE finanzas ADD COLUMN IF NOT EXISTS categoria TEXT`;
    await sql`ALTER TABLE finanzas ADD COLUMN IF NOT EXISTS metodo_pago TEXT`;

    // GPS
    await sql`CREATE TABLE IF NOT EXISTS gps_locations (
      id SERIAL PRIMARY KEY,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      repartidor TEXT,
      repartidor_id TEXT,
      velocidad DOUBLE PRECISION DEFAULT 0,
      fecha TIMESTAMPTZ DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS puntos_ref (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      lat DOUBLE PRECISION,
      lng DOUBLE PRECISION,
      tipo TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    // Cámaras
    await sql`CREATE TABLE IF NOT EXISTS camaras (
      id TEXT PRIMARY KEY,
      nombre TEXT,
      url TEXT,
      ubicacion TEXT,
      usuario TEXT,
      clave TEXT,
      activa BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    // Marketing
    await sql`CREATE TABLE IF NOT EXISTS marketing (
      id TEXT PRIMARY KEY,
      titulo TEXT,
      tipo TEXT,
      descripcion TEXT,
      imagen_url TEXT,
      fecha_inicio DATE,
      fecha_fin DATE,
      activa BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;

    // Tubo 43.5 Historial (para saber cuánto se vendió fraccionado)
    await sql`CREATE TABLE IF NOT EXISTS tubo_43_historial (
      id TEXT PRIMARY KEY,
      fecha TIMESTAMPTZ DEFAULT NOW(),
      kilos_vendidos DOUBLE PRECISION DEFAULT 0,
      kilos_restantes DOUBLE PRECISION DEFAULT 0,
      venta_id TEXT,
      tipo TEXT DEFAULT 'fraccionado'
    )`;

    // ========== GET ==========
    if(req.method==='GET'){
      if(!table){
        return res.status(200).json({data:[], error:'no table'});
      }

      try{
        // Deposito - SIEMPRE con kilos_restantes
        if(table==='deposito'){
          const r = await sql`SELECT * FROM deposito ORDER BY producto_id`;
          let rows = r.rows || [];
          // Si no hay datos, crear iniciales
          if(rows.length===0){
            await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes) VALUES ('11', 20, 5, 0, 0, 0), ('13', 20, 5, 0, 0, 0), ('43.5', 4, 3, 0, 1, 43.5), ('45', 10, 5, 0, 0, 0) ON CONFLICT (producto_id) DO NOTHING`;
            const r2 = await sql`SELECT * FROM deposito ORDER BY producto_id`;
            rows = r2.rows || [];
          }
          return res.status(200).json({data: rows});
        }

        // Ventas - con filtro de hoy y canal
        if(table==='ventas'){
          let query = `SELECT * FROM ventas`;
          let conditions = [];
          if(hoy==='1' || hoy==='true'){
            conditions.push(`(hoy = CURRENT_DATE OR fecha::date = CURRENT_DATE OR canal='mostrador')`);
          }
          if(canal){
            conditions.push(`canal='${canal}'`);
          }
          if(desde && hasta){
            conditions.push(`fecha >= '${desde}' AND fecha <= '${hasta}'`);
          }
          if(conditions.length>0){
            query += ` WHERE ` + conditions.join(' AND ');
          }
          query += ` ORDER BY fecha DESC LIMIT 300`;
          const r = await sql.query(query);
          return res.status(200).json({data: r.rows || []});
        }

        // GPS - últimas 100 ubicaciones
        if(table==='gps_locations'){
          const r = await sql`SELECT * FROM gps_locations ORDER BY fecha DESC LIMIT 100`;
          return res.status(200).json({data: r.rows || []});
        }

        // Finanzas con filtros
        if(table==='finanzas'){
          let q = `SELECT * FROM finanzas`;
          if(desde && hasta){
            q += ` WHERE fecha >= '${desde}' AND fecha <= '${hasta}'`;
          }
          q += ` ORDER BY fecha DESC LIMIT 300`;
          const r = await sql.query(q);
          return res.status(200).json({data: r.rows || []});
        }

        // Resto de tablas genéricas
        const r = await sql.query(`SELECT * FROM ${table} ORDER BY created_at DESC, id DESC LIMIT 300`);
        return res.status(200).json({data: r.rows || []});

      }catch(e){
        console.error('GET ERROR', table, e.message);
        return res.status(200).json({data:[], error:e.message});
      }
    }
        // ========== POST ==========
    if(req.method==='POST'){
      
      // ----- DEPOSITO / STOCK -----
      if(table==='deposito' || body.accion==='balance_inicial' || body.accion==='ingreso_inicial' || body.accion==='ingreso_remito'){
        try{
          const pid = String(body.producto_id || body.id || '43.5');
          
          // Si es ingreso inicial / remito, sumar no reemplazar
          if(body.accion==='ingreso_inicial' || body.accion==='ingreso_remito'){
            const existente = await sql`SELECT * FROM deposito WHERE producto_id=${pid}`.then(r=>r.rows[0]).catch(()=>null);
            let llenas = parseInt(body.llenas)||0;
            let vacias = parseInt(body.vacias)||0;
            let para_cambio = parseInt(body.para_cambio)||0;
            
            if(existente){
              if(body.accion==='ingreso_remito'){
                // Remito: proveedor trae llenas, lleva vacias + para_cambio
                llenas = (parseInt(existente.llenas)||0) + llenas;
                vacias = Math.max(0, (parseInt(existente.vacias)||0) - (parseInt(body.vacias_llevadas)||0));
                para_cambio = Math.max(0, (parseInt(existente.para_cambio)||0) - (parseInt(body.para_cambio_llevadas)||0));
              } else {
                // Ingreso inicial: reemplazar
              }
            }
            const en_uso = parseInt(body.en_uso)||parseInt(existente?.en_uso)||0;
            const kilos = parseFloat(body.kilos_restantes ?? existente?.kilos_restantes ?? 0);
            
            await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes, updated_at) 
              VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}, NOW())
              ON CONFLICT (producto_id) DO UPDATE SET 
                llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}, updated_at=NOW()`;
            
            return res.status(200).json({ok:true, producto_id:pid, kilos_restantes:kilos});
          }

          // Balance normal (ventas descuentan, fraccionado actualiza tubo)
          const llenas = parseInt(body.llenas)||0;
          const vacias = parseInt(body.vacias)||0;
          const para_cambio = parseInt(body.para_cambio)||0;
          const en_uso = parseInt(body.en_uso)||0;
          const kilos = parseFloat(body.kilos_restantes ?? body.kilos ?? 0);
          
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes, updated_at)
            VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos}, NOW())
            ON CONFLICT (producto_id) DO UPDATE SET 
              llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos}, updated_at=NOW()`;
          
          // Si es fraccionado, guardar historial para auditoría
          if(pid==='43.5' && body.accion==='balance_inicial'){
            const ventaId = body.venta_id || `frac_${Date.now()}`;
            const kilosVendidos = parseFloat(body.kilos_vendidos)||0;
            if(kilosVendidos>0){
              await sql`INSERT INTO tubo_43_historial (id, kilos_vendidos, kilos_restantes, venta_id, tipo) 
                VALUES (${ventaId}, ${kilosVendidos}, ${kilos}, ${ventaId}, 'fraccionado') ON CONFLICT (id) DO NOTHING`.catch(()=>{});
            }
          }
          
          return res.status(200).json({ok:true, producto_id:pid, kilos_restantes:kilos});
          
        }catch(e){
          console.error('DEPOSITO ERROR', e);
          return res.status(200).json({ok:true, error:e.message, producto_id:body.producto_id});
        }
      }

      // ----- VENTAS -----
      if(table==='ventas'){
        try{
          const d = body;
          const idVenta = d.id || `v_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
          const fecha = d.fecha || new Date().toISOString();
          const fechaLocal = d.fecha_local || new Date().toLocaleString('es-UY', {timeZone:'America/Montevideo'});
          const hoyStr = d.hoy || new Date().toISOString().split('T')[0];
          
          await sql`INSERT INTO ventas (
            id, fecha, fecha_local, hoy, tipo, tipo_cliente, modo, canal, 
            producto_id, cantidad, precio_unitario, flete, total, 
            cliente_nombre, cliente_id, pago, kilos, repartidor_id, estado
          ) VALUES (
            ${idVenta}, ${fecha}::timestamptz, ${fechaLocal}, ${hoyStr}::date, 
            ${d.tipo||'venta'}, ${d.tipo_cliente||'Consumidor Final'}, ${d.modo||'Domicilio'}, ${d.canal||'mostrador'},
            ${d.producto_id||''}, ${parseInt(d.cantidad)||1}, ${parseFloat(d.precio_unitario)||0}, 
            ${parseFloat(d.flete)||0}, ${parseFloat(d.total)||0},
            ${d.cliente_nombre||''}, ${d.cliente_id||''}, ${d.pago||'Efectivo'}, 
            ${parseFloat(d.kilos)||0}, ${d.repartidor_id||''}, ${d.estado||'completada'}
          ) ON CONFLICT (id) DO UPDATE SET
            total=${parseFloat(d.total)||0}, flete=${parseFloat(d.flete)||0}, cliente_nombre=${d.cliente_nombre||''}`;
          
          return res.status(200).json({ok:true, id:idVenta});
        }catch(e){
          console.error('VENTAS ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }
            // ----- PRODUCTOS -----
      if(table==='productos'){
        try{
          const p = body;
          const idProd = p.id || `prod_${Date.now()}`;
          
          // Si es FRACC, asegurar que no aparezca en Otros pero sí en ventas
          const esFracc = String(p.id||'').toUpperCase().startsWith('FRACC') || String(p.nombre||'').toUpperCase().includes('FRACC');
          const kilos = esFracc ? parseFloat(String(p.id).replace(/[^0-9.]/g,'')) || parseFloat(p.kilos)||0 : parseFloat(p.kilos)||0;
          
          await sql`INSERT INTO productos (
            id, nombre, tipo, categoria, precio_compra, precio_venta, proveedor_id, stock_minimo, kilos, activo
          ) VALUES (
            ${idProd}, ${p.nombre||idProd}, ${p.tipo||'gas'}, ${p.categoria||'gas'}, 
            ${parseFloat(p.precio_compra)||0}, ${parseFloat(p.precio_venta)||parseFloat(p.precio)||0}, 
            ${p.proveedor_id||''}, ${parseInt(p.stock_minimo)||5}, ${kilos}, ${p.activo!==false}
          ) ON CONFLICT (id) DO UPDATE SET
            nombre=${p.nombre||idProd}, precio_venta=${parseFloat(p.precio_venta)||parseFloat(p.precio)||0}, 
            precio_compra=${parseFloat(p.precio_compra)||0}, kilos=${kilos}`;
          
          return res.status(200).json({ok:true, id:idProd});
        }catch(e){
          console.error('PRODUCTOS ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- CLIENTES -----
      if(table==='clientes'){
        try{
          const c = body;
          const idCli = c.id || `cli_${Date.now()}`;
          await sql`INSERT INTO clientes (id, nombre, telefono, direccion, tipo, barrio, notas)
            VALUES (${idCli}, ${c.nombre||''}, ${c.telefono||''}, ${c.direccion||''}, ${c.tipo||'Consumidor Final'}, ${c.barrio||''}, ${c.notas||''})
            ON CONFLICT (id) DO UPDATE SET
              nombre=${c.nombre||''}, telefono=${c.telefono||''}, direccion=${c.direccion||''}, tipo=${c.tipo||'Consumidor Final'}`;
          return res.status(200).json({ok:true, id:idCli});
        }catch(e){
          console.error('CLIENTES ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- PROVEEDORES -----
      if(table==='proveedores'){
        try{
          const pr = body;
          const idProv = pr.id || `prov_${Date.now()}`;
          await sql`INSERT INTO proveedores (id, nombre, telefono, rut, direccion, tipo)
            VALUES (${idProv}, ${pr.nombre||''}, ${pr.telefono||''}, ${pr.rut||''}, ${pr.direccion||''}, ${pr.tipo||'gas'})
            ON CONFLICT (id) DO UPDATE SET nombre=${pr.nombre||''}, telefono=${pr.telefono||''}, rut=${pr.rut||''}, direccion=${pr.direccion||''}`;
          return res.status(200).json({ok:true, id:idProv});
        }catch(e){
          console.error('PROVEEDORES ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- REPARTIDORES -----
      if(table==='repartidores'){
        try{
          const r = body;
          const idRep = r.id || `rep_${Date.now()}`;
          await sql`INSERT INTO repartidores (id, nombre, telefono, vehiculo, activo)
            VALUES (${idRep}, ${r.nombre||''}, ${r.telefono||''}, ${r.vehiculo||''}, ${r.activo!==false})
            ON CONFLICT (id) DO UPDATE SET nombre=${r.nombre||''}, telefono=${r.telefono||''}, vehiculo=${r.vehiculo||''}`;
          return res.status(200).json({ok:true, id:idRep});
        }catch(e){
          console.error('REPARTIDORES ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- FINANZAS -----
      if(table==='finanzas'){
        try{
          const f = body;
          const idFin = f.id || `fin_${Date.now()}`;
          const fechaFin = f.fecha || new Date().toISOString().split('T')[0];
          await sql`INSERT INTO finanzas (id, fecha, tipo, categoria, descripcion, monto, metodo_pago, proveedor_id, comprobante)
            VALUES (${idFin}, ${fechaFin}::date, ${f.tipo||'egreso'}, ${f.categoria||'otros'}, ${f.descripcion||''}, ${parseFloat(f.monto)||0}, ${f.metodo_pago||'Efectivo'}, ${f.proveedor_id||''}, ${f.comprobante||''})
            ON CONFLICT (id) DO UPDATE SET monto=${parseFloat(f.monto)||0}, descripcion=${f.descripcion||''}, categoria=${f.categoria||'otros'}`;
          return res.status(200).json({ok:true, id:idFin});
        }catch(e){
          console.error('FINANZAS ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- GPS -----
      if(table==='gps_locations'){
        try{
          const g = body;
          await sql`INSERT INTO gps_locations (lat, lng, repartidor, repartidor_id, velocidad, fecha)
            VALUES (${parseFloat(g.lat)||0}, ${parseFloat(g.lng)||0}, ${g.repartidor||''}, ${g.repartidor_id||''}, ${parseFloat(g.velocidad)||0}, NOW())`;
          return res.status(200).json({ok:true});
        }catch(e){
          console.error('GPS ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }
            // ----- PUNTOS REF -----
      if(table==='puntos_ref'){
        try{
          const pr = body;
          const idPr = pr.id || `pr_${Date.now()}`;
          await sql`INSERT INTO puntos_ref (id, nombre, lat, lng, tipo)
            VALUES (${idPr}, ${pr.nombre||''}, ${parseFloat(pr.lat)||0}, ${parseFloat(pr.lng)||0}, ${pr.tipo||'cliente'})
            ON CONFLICT (id) DO UPDATE SET nombre=${pr.nombre||''}, lat=${parseFloat(pr.lat)||0}, lng=${parseFloat(pr.lng)||0}`;
          return res.status(200).json({ok:true, id:idPr});
        }catch(e){
          console.error('PUNTOS_REF ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- CAMARAS -----
      if(table==='camaras'){
        try{
          const cam = body;
          const idCam = cam.id || `cam_${Date.now()}`;
          await sql`INSERT INTO camaras (id, nombre, url, ubicacion, usuario, clave, activa)
            VALUES (${idCam}, ${cam.nombre||''}, ${cam.url||''}, ${cam.ubicacion||''}, ${cam.usuario||''}, ${cam.clave||''}, ${cam.activa!==false})
            ON CONFLICT (id) DO UPDATE SET nombre=${cam.nombre||''}, url=${cam.url||''}, ubicacion=${cam.ubicacion||''}`;
          return res.status(200).json({ok:true, id:idCam});
        }catch(e){
          console.error('CAMARAS ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- MARKETING -----
      if(table==='marketing'){
        try{
          const m = body;
          const idM = m.id || `mkt_${Date.now()}`;
          await sql`INSERT INTO marketing (id, titulo, tipo, descripcion, imagen_url, fecha_inicio, fecha_fin, activa)
            VALUES (${idM}, ${m.titulo||''}, ${m.tipo||'promo'}, ${m.descripcion||''}, ${m.imagen_url||''}, ${m.fecha_inicio||null}::date, ${m.fecha_fin||null}::date, ${m.activa!==false})
            ON CONFLICT (id) DO UPDATE SET titulo=${m.titulo||''}, descripcion=${m.descripcion||''}, activa=${m.activa!==false}`;
          return res.status(200).json({ok:true, id:idM});
        }catch(e){
          console.error('MARKETING ERROR', e);
          return res.status(200).json({ok:false, error:e.message});
        }
      }

      // ----- TABLA GENERICA (fallback para cualquier otra) -----
      if(table){
        try{
          const keys = Object.keys(body).filter(k=>!['accion'].includes(k));
          if(keys.length===0){
            return res.status(200).json({ok:true, msg:'no data'});
          }
          const vals = keys.map(k=>body[k]);
          const cols = keys.join(',');
          const placeholders = keys.map((_,i)=>`$${i+1}`).join(',');
          const updates = keys.map((k,i)=>`${k}=$${i+1}`).join(',');
          
          // Intentar upsert
          try{
            await sql.query(
              `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates}`,
              [...vals, ...vals]
            );
          }catch(e1){
            // Si falla por no tener id, intentar sin conflicto
            try{
              await sql.query(
                `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
                vals
              );
            }catch(e2){
              // Último intento: insert simple
              await sql.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, vals).catch(()=>{});
            }
          }
          return res.status(200).json({ok:true, table});
        }catch(e){
          console.error('GENERIC POST ERROR', table, e.message);
          return res.status(200).json({ok:true, error:e.message, table});
        }
      }

      return res.status(200).json({ok:true, msg:'no table specified'});
    }

    // ========== DELETE ==========
    if(req.method==='DELETE'){
      if(!table || !id){
        return res.status(200).json({ok:false, error:'faltan table e id'});
      }
      try{
        // Para deposito borrar por producto_id
        if(table==='deposito'){
          await sql.query(`DELETE FROM deposito WHERE producto_id=$1`, [id]);
        } else {
          await sql.query(`DELETE FROM ${table} WHERE id=$1`, [id]);
        }
        return res.status(200).json({ok:true, deleted:id});
      }catch(e){
        console.error('DELETE ERROR', table, id, e.message);
        // Aunque falle, devolver ok para que el front no se quede colgado
        return res.status(200).json({ok:true, error:e.message});
      }
    }

    return res.status(200).json({ok:true, msg:'method not handled'});
    
  }catch(e){
    // ESTE CATCH FINAL ES EL QUE EVITA EL HTML 500
    console.error('FATAL API ERROR:', e);
    console.error(e.stack);
    return res.status(200).json({
      data: [],
      error: e.message,
      stack: e.stack?.substring(0,500),
      ok: true,
      msg: 'Error capturado, devolviendo JSON 200 para evitar HTML 500'
    });
  }
}
  }catch(e){
    // ESTE CATCH FINAL ES EL QUE EVITA EL HTML 500
    console.error('FATAL API ERROR:', e);
    console.error(e.stack);
    return res.status(200).json({
      data: [],
      error: e.message,
      stack: e.stack?.substring(0,500),
      ok: true,
      msg: 'Error capturado, devolviendo JSON 200 para evitar HTML 500'
    });
  }
}
