// src/modules/stock.js - MEGAL STOCK v3 - TURSO COMPLETO
export async function initStock(){
  const cont = document.getElementById('stock-module') 
            || document.querySelector('main') 
            || document.getElementById('app')
            || document.body;
  
  async function loadStock(){
    try {
      const r = await fetch('/api/stock');
      const data = await r.json();
      if(!data.ok) throw new Error(data.error || 'Error stock');
      
      const dep = data.deposito || [];
      const cams = data.camionetas || [];
      
      // Busca el contenedor donde está el título "Stock" que viste vacío
      let target = document.getElementById('stock-module');
      if(!target){
        // Si no existe, crea dentro del área principal (la que sale vacía en tu foto)
        const mainArea = document.querySelector('.flex-1') || document.querySelector('[class*="flex-1"]') || document.getElementById('app');
        if(mainArea && !document.getElementById('stock-module')){
          const wrapper = document.createElement('div');
          wrapper.id = 'stock-module';
          // Si el mainArea ya tiene el título Stock, agrega después
          mainArea.appendChild(wrapper);
          target = wrapper;
        } else {
          target = mainArea || cont;
        }
      }

      target.innerHTML = `
        <div style="padding:20px;color:#e2e8f0;min-height:80vh">
          <h2 style="font-size:22px;font-weight:bold;margin-bottom:16px">📦 Stock MEGAL - Depósito TURSO</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
            ${dep.map(d=>`
              <div style="background:#1e293b;padding:14px;border-radius:10px;border:1px solid #334155">
                <div style="font-weight:bold">${d.nombre || d.producto_id} (${d.producto_id})</div>
                <div style="font-size:13px;margin-top:8px;line-height:1.7">
                  Llenas: <b style="color:#22c55e">${d.llenas}</b><br>
                  Vacías: <b style="color:#f59e0b">${d.vacias}</b><br>
                  Cambio: <b style="color:#ef4444">${d.cambio||0}</b><br>
                  ${d.producto_id==='43.5' ? `
                    <div style="margin-top:8px;background:#0f172a;padding:6px;border-radius:6px">
                      En uso: <b style="color:#38bdf8">${d.kilos_en_uso} kg</b>
                      <div style="background:#334155;height:8px;border-radius:4px;margin-top:4px">
                        <div style="width:${Math.max(5, (d.kilos_en_uso/43.5*100)).toFixed(0)}%;height:100%;background:#38bdf8;border-radius:4px"></div>
                      </div>
                    </div>` : ''}
                </div>
                <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
                  ${d.permite_completo?'<span style="font-size:10px;background:#22c55e22;color:#22c55e;padding:2px 6px;border-radius:4px">COMPLETO 11/13</span>':''}
                  ${d.es_fraccionado?'<span style="font-size:10px;background:#38bdf822;color:#38bdf8;padding:2px 6px;border-radius:4px">FRACC 1-3kg</span>':''}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="background:#1e293b;padding:14px;border-radius:10px">
              <h3 style="font-weight:bold;margin-bottom:8px">🚚 Cargar Camioneta (con hora)</h3>
              <select id="repStock" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px"><option value="antonio">Antonio</option><option value="jose">José</option><option value="mostrador">Mostrador</option></select>
              <select id="prodStock" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px"><option value="11">11kg</option><option value="13">13kg</option><option value="43.5">43.5kg</option><option value="45">45kg</option></select>
              <input id="cantStock" type="number" value="1" min="1" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px">
              <button id="btnCargarStock" style="width:100%;padding:10px;background:#22c55e;color:#000;font-weight:bold;border:none;border-radius:8px;cursor:pointer">CARGAR</button>
            </div>
            <div style="background:#1e293b;padding:14px;border-radius:10px">
              <h3 style="font-weight:bold;margin-bottom:8px">⚖️ Venta Fraccionada 43.5 (1-3kg)</h3>
              <input id="kilosStock" type="number" min="0.5" max="3" step="0.5" value="2" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px" placeholder="kg 1-3">
              <input id="clienteStock" type="text" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px" placeholder="Cliente - garrafita">
              <input id="precioKStock" type="number" style="width:100%;padding:8px;margin:6px 0;background:#0f172a;color:#fff;border:1px solid #334155;border-radius:6px" placeholder="Precio x kg">
              <button id="btnFraccStock" style="width:100%;padding:10px;background:#38bdf8;color:#000;font-weight:bold;border:none;border-radius:8px;cursor:pointer">VENDER kg</button>
            </div>
          </div>

          <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div style="background:#1e293b;padding:12px;border-radius:10px">
              <h3 style="font-weight:bold">Camionetas</h3>
              <div style="font-size:12px;margin-top:6px">${cams.length?cams.map(c=>`<div style="padding:2px 0">${c.repartidor_nombre||c.repartidor_id} - ${c.nombre}: ${c.llenas}L / ${c.vacias}V / ${c.cambio}C</div>`).join(''):'<i>Vacías - hacé la primera carga</i>'}</div>
            </div>
            <div style="background:#1e293b;padding:12px;border-radius:10px">
              <h3 style="font-weight:bold">📋 Movimientos (hora carga para auditar)</h3>
              <div style="font-size:11px;max-height:180px;overflow:auto;margin-top:6px">
                ${(data.movimientos||[]).map(m=>`<div style="padding:3px 0;border-bottom:1px solid #33415522">${(m.fecha_hora||'').substring(11,19)} - ${m.detalle||m.tipo} ${m.cantidad?`x${m.cantidad}`:''} ${m.kilos?`${m.kilos}kg`:''}</div>`).join('')||'<i>Sin movimientos</i>'}
              </div>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btnCargarStock')?.addEventListener('click', async ()=>{
        const rep = document.getElementById('repStock').value;
        const prod = document.getElementById('prodStock').value;
        const cant = document.getElementById('cantStock').value;
        const r = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'carga_camioneta',repartidor_id:rep,producto_id:prod,cantidad:parseInt(cant)})});
        const j = await r.json();
        alert(j.ok?`Cargado ${cant}x ${prod} a ${rep} a las ${j.hora?.substring(11,19)}`:j.error);
        loadStock();
      });

      document.getElementById('btnFraccStock')?.addEventListener('click', async ()=>{
        const kilos = parseFloat(document.getElementById('kilosStock').value);
        const cliente = document.getElementById('clienteStock').value;
        const precioK = parseFloat(document.getElementById('precioKStock').value)||0;
        if(kilos<0.5 || kilos>3){ alert('Solo 1 a 3kg'); return; }
        const r = await fetch('/api/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'venta_fraccionada',kilos,cliente_nombre:cliente,precio_kilo:precioK})});
        const j = await r.json();
        alert(j.ok?`Vendido ${kilos}kg a ${cliente} - Restante tubo: ${j.restante?.toFixed(1)}kg`:j.error);
        loadStock();
      });

    } catch(e){
      const t = document.getElementById('stock-module') || cont;
      t.innerHTML = `<div style="color:#ef4444;padding:20px">Error Stock: ${e.message}</div>`;
      console.error(e);
    }
  }

  await loadStock();
}

window.initStock = initStock;
console.log('✅ stock.js TURSO v3 cargado - window.initStock listo');
