// api/postgres.js - MEGAL FIX FRACCIONADO REAL
export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  
  const { table, id } = req.query;
  
  let sql;
  try{
    const mod = await import('@vercel/postgres');
    sql = mod.sql;
  }catch(e){
    return res.status(200).json({ok:false, error:'No postgres lib', data:[STRIPPED]
  }

  try{
    // Asegurar columnas tubo
    if(table==='deposito'){
      await sql`CREATE TABLE IF NOT EXISTS deposito (producto_id TEXT PRIMARY KEY, llenas INT DEFAULT 0, vacias INT DEFAULT 0, para_cambio INT DEFAULT 0, en_uso INT DEFAULT 0, kilos_restantes DOUBLE PRECISION DEFAULT 0, kilos_en_uso DOUBLE PRECISION DEFAULT 0)`;
      await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_restantes DOUBLE PRECISION DEFAULT 0`;
      await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS kilos_en_uso DOUBLE PRECISION DEFAULT 0`;
      await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS en_uso INT DEFAULT 0`;
      await sql`ALTER TABLE deposito ADD COLUMN IF NOT EXISTS para_cambio INT DEFAULT 0`;
    }
    if(table==='ventas'){
      await sql`CREATE TABLE IF NOT EXISTS ventas (id TEXT PRIMARY KEY, fecha TEXT, fecha_local TEXT, hoy TEXT, tipo TEXT, tipo_cliente TEXT, modo TEXT, canal TEXT, producto_id TEXT, cantidad INT, precio_unitario DOUBLE PRECISION, flete DOUBLE PRECISION, total DOUBLE PRECISION, cliente_nombre TEXT, pago TEXT, kilos DOUBLE PRECISION)`;
      await sql`ALTER TABLE ventas ADD COLUMN IF NOT EXISTS kilos DOUBLE PRECISION DEFAULT 0`;
    }

    if(req.method==='GET'){
      if(!table) return res.status(200).json({data:[STRIPPED]
      const r = await sql.query(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 1000`);
      return res.status(200).json({ok:true, data:[STRIPPED]
    }

    if(req.method==='POST'){
      const body = typeof req.body==='string' ? JSON.parse(req.body) : req.body;
      
      // === DEPOSITO ===
      if(table==='deposito'){
        const pid = body.producto_id;
        // Acción especial reset tubo
        if(body.accion==='iniciar_tubo_43'){
          await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes, kilos_en_uso)
            VALUES ('43.5', 4, 3, 0, 1, 43.5, 43.5)
            ON CONFLICT (producto_id) DO UPDATE SET kilos_en_uso=43.5, kilos_restantes=43.5, en_uso=1`;
          return res.status(200).json({ok:true, reset:true, kilos:43.5});
        }
        // Balance normal
        const llenas = parseInt(body.llenas)||0;
        const vacias = parseInt(body.vacias)||0;
        const para_cambio = parseInt(body.para_cambio)||0;
        const en_uso = parseInt(body.en_uso)||0;
        const kilos_en_uso = parseFloat(body.kilos_en_uso ?? body.kilos_restantes ?? 0);
        const kilos_restantes = kilos_en_uso;
        await sql`INSERT INTO deposito (producto_id, llenas, vacias, para_cambio, en_uso, kilos_restantes, kilos_en_uso)
          VALUES (${pid}, ${llenas}, ${vacias}, ${para_cambio}, ${en_uso}, ${kilos_restantes}, ${kilos_en_uso})
          ON CONFLICT (producto_id) DO UPDATE SET llenas=${llenas}, vacias=${vacias}, para_cambio=${para_cambio}, en_uso=${en_uso}, kilos_restantes=${kilos_restantes}, kilos_en_uso=${kilos_en_uso}`;
        return res.status(200).json({ok:true});
      }

      // === VENTAS - ACÁ ESTÁ EL FIX ===
      if(table==='ventas'){
        const idV = body.id || 'V_'+Date.now();
        // Insert venta
        await sql`INSERT INTO ventas (id, fecha, fecha_local, hoy, tipo, tipo_cliente, modo, canal, producto_id, cantidad, precio_unitario, flete, total, cliente_nombre, pago, kilos)
          VALUES (${idV}, ${body.fecha}, ${body.fecha_local}, ${body.hoy}, ${body.tipo}, ${body.tipo_cliente}, ${body.modo}, ${body.canal}, ${body.producto_id}, ${parseInt(body.cantidad)||1}, ${parseFloat(body.precio_unitario)||0}, ${parseFloat(body.flete)||0}, ${parseFloat(body.total)||0}, ${body.cliente_nombre}, ${body.pago}, ${parseFloat(body.kilos)||0})
          ON CONFLICT (id) DO NOTHING`;

        // Si es fraccionado, DESCONTAR DEL TUBO 43.5
        const pidUpper = String(body.producto_id||'').toUpperCase();
        const esFracc = pidUpper.startsWith('FRACC') || body.tipo==='fraccionado' || String(body.producto_id)==='43.5';
        if(esFracc){
          // Cuantos kilos se vendieron?
          let kVend = parseFloat(body.kilos)||0;
          if(!kVend){
            const m = pidUpper.match(/([\d.]+)/);
            kVend = m ? parseFloat(m[0]) : 1;
          }
          // Leer tubo actual
          const tuboRes = await sql`SELECT * FROM deposito WHERE producto_id='43.5'`;
          let tubo = tuboRes.rows[0];
          if(!tubo){
            // Crear si no existe
            await sql`INSERT INTO deposito (producto_id, kilos_en_uso, kilos_restantes, en_uso) VALUES ('43.5', 43.5, 43.5, 1) ON CONFLICT (producto_id) DO NOTHING`;
            tubo = {kilos_en_uso:43.5, kilos_restantes:43.5};
          }
          const actual = parseFloat(tubo.kilos_en_uso ?? tubo.kilos_restantes ?? 43.5);
          const nuevo = Math.max(0, actual - kVend);
          console.log(`FRACC: ${actual} - ${kVend} = ${nuevo}`);
          await sql`UPDATE deposito SET kilos_en_uso=${nuevo}, kilos_restantes=${nuevo} WHERE producto_id='43.5'`;
          return res.status(200).json({ok:true, fracc:true, antes:actual, descontado:kVend, despues:nuevo});
        }
        return res.status(200).json({ok:true});
      }

      // Otras tablas genéricas
      const keys = Object.keys(body);
      const vals = Object.values(body);
      // fallback simple
      return res.status(200).json({ok:true, generic:true});
    }

    if(req.method==='DELETE'){
      if(table && id){
        await sql.query(`DELETE FROM ${table} WHERE id='${id}' OR producto_id='${id}'`);
      }
      return res.status(200).json({ok:true});
    }

    return res.status(200).json({ok:true});
  }catch(err){
    console.error('API ERROR',err);
    return res.status(200).json({ok:false, error:err.message, data:[STRIPPED]
  }
}
