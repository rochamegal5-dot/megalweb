// src/modules/stock.js - MEGAL v3 UI
export async function initStock(){
  const cont = document.getElementById('stock-module') || document.getElementById('app') || document.body;
  if(!cont) return;
  
  async function loadStock(){
    const r = await fetch('/api/stock');
    const data = await r.json();
    if(!data.ok) throw new Error(data.error);
    
    const dep = data.deposito || [];
    cont.innerHTML = `
      <div style="padding:20px;color:#fff;background:#0f172a;min-height:100vh;font-family:system-ui">
        <h2 style="font-size:24px;margin-bottom:16px">📦 Stock MEGAL - Depósito</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
          ${dep.map(d=>`
            <div style="background:#1e293b;padding:16px;border-radius:12px;border:1px solid #334155">
              <div style="font-weight:bold;font-size:18px">${d.nombre} (${d.producto_id})</div>
              <div style="margin-top:8px;font-size:14px;line-height:1.6">
                Llenas: <b style="color:#22c55e">${d.llenas}</b><br>
                Vacías: <b style="color:#f59e0b">${d.vacias}</b><br>
                Cambio: <b style="color:#ef4444">${d.cambio||0}</b><br>
                ${d.producto_id==='43.5' ? `<div style="margin-top:8px;background:#0f172a;padding:6px;border-radius:6px">En uso: <b style="color:#38bdf8">${d.kilos_en_uso} kg</b><div style="background:#334155;height:8px;border-radius:4px;margin-top:4px"><div style="width:${(d.kilos_en_uso/43.5*100).toFixed(0)}%;height:100%;background:#38bdf8;border-radius:4px"></div></div></div>` : ''}
                ${d.permite_completo ? `<span style="font-size:11px;background:#22c55e22;color:#22c55e;padding:2px 6px;border-radius:4px">Permite Completo</span>` : ''}
                ${d.es_fraccionado ? `<span style="font-size:11px;background:#38bdf822;color:#38bdf8;padding:2px 6px;border-radius:4px">Fraccionado 1-3kg</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div style="background:#1e293b;padding:16px;border-radius:12px">
            <h3>🚚 Cargar Camioneta</h3>
            <select id="rep" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px"><option value="antonio">Antonio</option><option value="jose">José</option></select>
            <select id="prod" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px"><option value="11">11kg</option><option value="13">13kg</option><option value="43.5">43.5kg</option><option value="45">45kg</option></select>
            <input id="cant" type="number" value="1" min="1" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px">
            <button onclick="window.cargar()" style="width:100%;padding:10px;background:#22c55e;color:#000;font-weight:bold;border:none;border-radius:8px;cursor:pointer">CARGAR con hora</button>
          </div>
          <div style="background:#1e293b;padding:16px;border-radius:12px">
            <h3>⚖️ Venta Fraccionada 43.5</h3>
            <input id="kilos" type="number" min="1" max="3" step="0.5" value="2" placeholder="1 a 3 kg" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px">
            <input id="cliente" type="text" placeholder="Cliente (garrafita)" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px">
            <input id="precioK" type="number" placeholder="Precio por kg" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px">
            <button onclick="window.venderFracc()" style="width:100%;padding:10px;background:#38bdf8;color:#000;font-weight:bold;border:none;border-radius:8px;cursor:pointer">VENDER kg</button>
          </div>
        </div>

        <div style="margin-top:16px;background:#1e293b;padding:12px;border-radius:12px">
          <h3>📋 Movimientos (con hora de carga)</h3>
          <div style="font-size:12px;max-height:200px;overflow:auto">
            ${(data.movimientos||[]).map(m=>`<div style="padding:4px 0;border-bottom:1px solid #334155">${m.fecha_hora?.substring(11,19)||''} - ${m.detalle||m.tipo} - ${m.cantidad||m.kilos||''}</div>`).join('')||'<i>Sin movimientos - hacé la primera carga</i>'}
          </div>
        </div>
      </div>
    `;

    window.cargar = async ()=>{
      const rep = document.getElementById('rep').value;
      const prod = document.getElementById('prod').value;
      const cant = document.getElementById('cant').value;
      const r = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'carga_camioneta',repartidor_id:rep,producto_id:prod,cantidad:cant})});
      const j = await r.json();
      alert(j.ok ? `Cargado ${cant}x ${prod} a ${rep} a las ${j.hora?.substring(11,19)}` : j.error);
      loadStock();
    };
    window.venderFracc = async ()=>{
      const kilos = document.getElementById('kilos').value;
      const cliente = document.getElementById('cliente').value;
      const precioK = document.getElementById('precioK').value;
      const r = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'venta_fraccionada',kilos:parseFloat(kilos),cliente_nombre:cliente,precio_kilo:parseFloat(precioK)})});
      const j = await r.json();
      alert(j.ok ? `Vendido ${kilos}kg - Restante tubo: ${j.restante?.toFixed(1)}kg` : j.error);
      loadStock();
    };
  }
  
  try{ await loadStock(); } catch(e){ cont.innerHTML = `<div style="color:red;padding:20px">Error cargando stock: ${e.message}</div>`; }
}

// Auto-init si estas en #stock
if(location.hash==='#stock' || document.getElementById('stock-module')){
  initStock();
}
