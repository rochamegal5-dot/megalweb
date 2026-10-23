// src/modules/stock.js - MEGAL STOCK v3 - TURSO - view-stock
export async function initStock(){
  console.log('📦 initStock TURSO iniciado');
  
  // 1. Mostrar la vista stock y ocultar las otras
  document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
  const viewStock = document.getElementById('view-stock');
  if(viewStock){
    viewStock.classList.remove('hidden');
  } else {
    console.error('No existe #view-stock');
    return;
  }

  const target = viewStock; // renderizamos acá adentro

  try {
    const r = await fetch('/api/stock');
    const data = await r.json();
    console.log('Data stock TURSO:', data);
    if(!data.ok) throw new Error(data.error);
    
    const dep = data.deposito || [];
    const cams = data.camionetas || [];
    const movs = data.movimientos || [];

    target.innerHTML = `
      <div class="card" style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:12px">
        <h3 style="font-size:20px;font-weight:bold;margin-bottom:12px">📦 Stock MEGAL - TURSO REAL</h3>
        
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
          ${dep.map(d=>`
            <div style="background:#1e293b;padding:12px;border-radius:10px;border:2px solid ${d.producto_id==='43.5'?'#38bdf8':'#334155'}">
              <div style="font-weight:bold">${d.producto_id} - ${d.nombre||'Tubo'}</div>
              <div style="font-size:13px;margin-top:6px;line-height:1.7">
                Llenas: <b style="color:#22c55e">${d.llenas}</b><br>
                Vacías: <b style="color:#f59e0b">${d.vacias}</b><br>
                Cambio: <b style="color:#ef4444">${d.cambio||0}</b>
                ${d.producto_id==='43.5' ? `<div style="margin-top:8px;background:#0f172a;padding:6px;border-radius:6px"><b style="color:#38bdf8">${d.kilos_en_uso} kg en uso</b><div style="background:#334155;height:8px;border-radius:4px;margin-top:4px"><div style="width:${Math.max(5,(d.kilos_en_uso/43.5*100)).toFixed(0)}%;height:100%;background:#38bdf8;border-radius:4px"></div></div></div>` : ''}
              </div>
              <div style="margin-top:6px">
                ${d.permite_completo?'<span style="font-size:10px;background:#22c55e22;color:#22c55e;padding:2px 6px;border-radius:4px">COMPLETO</span>':''}
                ${d.es_fraccionado?'<span style="font-size:10px;background:#38bdf822;color:#38bdf8;padding:2px 6px;border-radius:4px">FRACC 1-3kg</span>':''}
              </div>
            </div>
          `).join('')}
        </div>

        <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:#1e293b;padding:12px;border-radius:10px">
            <h4 style="font-weight:bold">🚚 Cargar Camioneta (con hora)</h4>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              <select id="repStock" style="flex:1;min-width:90px;padding:8px;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px"><option value="antonio">Antonio</option><option value="jose">José</option><option value="mostrador">Mostrador</option></select>
              <select id="prodStock" style="flex:1;min-width:70px;padding:8px;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px"><option value="11">11kg</option><option value="13">13kg</option><option value="43.5">43.5kg</option><option value="45">45kg</option></select>
              <input id="cantStock" type="number" value="1" min="1" style="width:70px;padding:8px;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px">
            </div>
            <button id="btnCargarStock" style="width:100%;margin-top:8px;padding:10px;background:#22c55e;color:#000;font-weight:bold;border:none;border-radius:8px;cursor:pointer">CARGAR</button>
          </div>

          <div style="background:#1e293b;padding:12px;border-radius:10px">
            <h4 style="font-weight:bold">⚖️ Fraccionado 43.5 (1-3kg)</h4>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
              <input id="kilosStock" type="number" min="0.5" max="3" step="0.5" value="2" style="flex:1;min-width:60px;padding:8px;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px" placeholder="kg">
              <input id="clienteStock" type="text" style="flex:1;min-width:90px;padding:8px;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px" placeholder="Cliente">
            </div>
            <button id="btnFraccStock" style="width:100%;margin-top:8px;padding:10px;background:#38bdf8;color:#000;font-weight:bold;border:none;border-radius:8px;cursor:pointer">VENDER kg</button>
          </div>
        </div>

        <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="background:#1e293b;padding:10px;border-radius:10px">
            <b>Camionetas</b>
            <div style="font-size:12px;margin-top:6px">${cams.length?cams.map(c=>`<div>${c.repartidor_id} - ${c.nombre||c.producto_id}: ${c.llenas}L / ${c.vacias}V / ${c.cambio}C</div>`).join(''):'<i style="color:#64748b">Vacías</i>'}</div>
          </div>
          <div style="background:#1e293b;padding:10px;border-radius:10px">
            <b>📋 Movimientos (hora carga para auditar)</b>
            <div style="font-size:11px;max-height:150px;overflow:auto;margin-top:6px">
              ${movs.map(m=>`<div style="padding:3px 0;border-bottom:1px solid #ffffff11">${(m.fecha_hora||'').substring(11,19)} - ${m.detalle||m.tipo}</div>`).join('')||'<i style="color:#64748b">Sin movimientos</i>'}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCargarStock')?.addEventListener('click', async ()=>{
      const rep = document.getElementById('repStock').value;
      const prod = document.getElementById('prodStock').value;
      const cant = document.getElementById('cantStock').value;
      const resp = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'carga_camioneta',repartidor_id:rep,producto_id:prod,cantidad:parseInt(cant)})});
      const j = await resp.json();
      alert(j.ok?`✅ Cargado ${cant}x ${prod} a ${rep}`:j.error);
      initStock();
    });

    document.getElementById('btnFraccStock')?.addEventListener('click', async ()=>{
      const kilos = parseFloat(document.getElementById('kilosStock').value);
      const cliente = document.getElementById('clienteStock').value || 'Cliente';
      if(kilos<0.5 || kilos>3){ alert('Solo 1 a 3kg'); return; }
      const resp = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'venta_fraccionada',kilos,cliente_nombre:cliente,precio_kilo:0})});
      const j = await resp.json();
      alert(j.ok?`✅ Vendido ${kilos}kg - Restante ${j.restante?.toFixed(1)}kg`:j.error);
      initStock();
    });

  } catch(e){
    console.error(e);
    target.innerHTML = `<div class="card" style="background:#1e293b;color:#ef4444;padding:20px">❌ Error Stock: ${e.message}</div>`;
  }
}

window.initStock = initStock;
