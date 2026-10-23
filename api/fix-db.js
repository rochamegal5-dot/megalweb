// /api/fix-db.js - Repara esquema Turso para Stock dinámico sin borrar GPS
import { createClient } from '@libsql/client';
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

export default async function handler(req,res){
  const logs=[];
  try{
    // 1. Ver que tablas hay
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    logs.push('Tablas actuales: ' + tables.rows.map(r=>r.name).join(', '));

    // 2. Crear productos si no existe
    await client.execute(`
      CREATE TABLE IF NOT EXISTS productos (
        producto_id TEXT PRIMARY KEY,
        nombre TEXT,
        precio REAL DEFAULT 0,
        tipo TEXT DEFAULT 'otro',
        permite_completo INTEGER DEFAULT 0,
        es_fraccionado INTEGER DEFAULT 0
      )
    `);
    logs.push('✅ productos OK');

    // 3. Crear deposito si no existe - con producto_id
    await client.execute(`
      CREATE TABLE IF NOT EXISTS deposito (
        producto_id TEXT PRIMARY KEY,
        llenas INTEGER DEFAULT 0,
        vacias INTEGER DEFAULT 0,
        cambio INTEGER DEFAULT 0,
        defectuosas INTEGER DEFAULT 0,
        kilos_en_uso REAL DEFAULT 0,
        nombre TEXT
      )
    `);
    logs.push('✅ deposito OK');

    // 4. Si deposito existe pero con columna id en vez de producto_id, migramos
    try{
      const cols = await client.execute("PRAGMA table_info(deposito)");
      const colNames = cols.rows.map(r=>r.name);
      logs.push('Columnas deposito: ' + colNames.join(', '));
      if(!colNames.includes('producto_id')){
        logs.push('⚠️ deposito no tiene producto_id, recreando...');
        await client.execute("ALTER TABLE deposito RENAME TO deposito_old");
        await client.execute(`
          CREATE TABLE deposito (
            producto_id TEXT PRIMARY KEY,
            llenas INTEGER DEFAULT 0,
            vacias INTEGER DEFAULT 0,
            cambio INTEGER DEFAULT 0,
            defectuosas INTEGER DEFAULT 0,
            kilos_en_uso REAL DEFAULT 0,
            nombre TEXT
          )
        `);
        // Intentar copiar datos si tenia id
        try{
          const oldData = await client.execute("SELECT * FROM deposito_old");
          for(const r of oldData.rows){
            const pid = r.id || r.codigo || r.producto_id || r.nombre || '11';
            await client.execute({
              sql: "INSERT OR REPLACE INTO deposito (producto_id, llenas, vacias, cambio, kilos_en_uso, nombre) VALUES (?, ?, ?, ?, ?, ?)",
              args: [String(pid), r.llenas||0, r.vacias||0, r.cambio||0, r.kilos_en_uso||0, r.nombre||String(pid)]
            });
          }
          logs.push(`Migrados ${oldData.rows.length} registros de deposito_old`);
        }catch(e){ logs.push('No se pudo migrar old: '+e.message); }
      }
    }catch(e){ logs.push('Error revisando columnas: '+e.message); }

    // 5. Crear resto
    await client.execute(`CREATE TABLE IF NOT EXISTS camionetas (repartidor_id TEXT, producto_id TEXT, llenas INTEGER DEFAULT 0, PRIMARY KEY (repartidor_id, producto_id))`);
    await client.execute(`CREATE TABLE IF NOT EXISTS movimientos (id TEXT PRIMARY KEY, tipo TEXT, detalle TEXT, fecha_hora TEXT, producto_id TEXT, cantidad INTEGER, repartidor_id TEXT, remito_entrada TEXT, kilos REAL)`);
    await client.execute(`CREATE TABLE IF NOT EXISTS ventas_fraccionadas (id TEXT PRIMARY KEY, kilos REAL, cliente_nombre TEXT, precio_kilo REAL, total REAL, fecha_hora TEXT)`);

    // 6. Insertar productos base si deposito vacio
    const depCount = await client.execute("SELECT COUNT(*) as c FROM deposito");
    if((depCount.rows[0]?.c||0)===0){
      const base = [
        ['11','11kg',10,15,1,0,0],
        ['13','13kg',20,25,2,0,0],
        ['43.5','43.5kg',5,0,0,0,43.5],
        ['45','45kg',8,5,0,0,0],
      ];
      for(const b of base){
        await client.execute({ sql: "INSERT OR REPLACE INTO deposito (producto_id, nombre, llenas, vacias, cambio, defectuosas, kilos_en_uso) VALUES (?, ?, ?, ?, ?, ?, ?)", args: b });
        await client.execute({ sql: "INSERT OR REPLACE INTO productos (producto_id, nombre, permite_completo, es_fraccionado) VALUES (?, ?, ?, ?)", args: [b[0], b[1], b[0]==='11'||b[0]==='13'?1:0, b[0]==='43.5'?1:0] });
      }
      logs.push('✅ Insertado balance base 11/13/43.5/45');
    }

    const finalDep = await client.execute("SELECT * FROM deposito");
    logs.push('Depósito final: ' + JSON.stringify(finalDep.rows));

    return res.json({ok:true, logs, deposito: finalDep.rows});

  }catch(e){
    return res.status(500).json({ok:false, error:e.message, logs});
  }
}
