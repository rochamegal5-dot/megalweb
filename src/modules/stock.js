
// src/modules/stock.js - MEGAL STOCK v3
const API_STOCK='/api/stock';
export async function initStock(){
  const container=document.getElementById('stock-module');
  if(!container) return;
  async function loadStock(){
    try{
      const r=await fetch(API_STOCK);
      const data=await r.json();
      renderStock(data);
    }catch(e){container.innerHTML=`<div class="p-4 text-red-400">Error: ${e.message}</div>`;}
  }
  function renderStock({deposito, camionetas, movimientos, fraccionadas}){
    const tubo43=deposito.find(d=>d.producto_id==='43.5');
    const kilosEnUso=tubo43?.kilos_en_uso||0;
    container.innerHTML=`
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${deposito.map(d=>`
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div class="flex justify-between mb-2"><h3 class="font-bold text-white">${d.nombre}</h3><span class="text-xs px-2 py-1 rounded ${d.tipo==='garrafa'?'bg-amber-900 text-amber-200':'bg-cyan-900 text-cyan-200'}">${d.tipo}</span></div>
            ${d.producto_id==='43.5'?`<div class="mb-3 bg-slate-800 rounded p-2"><div class="text-xs text-slate-400">TUBO EN USO - Fraccionador</div><div class="flex gap-2 items-end"><span class="text-2xl font-bold text-cyan-400">${(d.kilos_en_uso||0).toFixed(1)}kg</span><span class="text-xs text-slate-500">/43.5kg</span></div><div class="w-full bg-slate-700 h-2 rounded mt-1"><div class="bg-cyan-500 h-2 rounded" style="width:${((d.kilos_en_uso||0)/43.5*100)}%"></div></div></div>`:''}
            <div class="grid grid-cols-3 gap-2 text-center"><div class="bg-slate-800 rounded p-2"><div class="text-[10px] text-slate-400">LLENAS</div><div class="text-lg font-bold text-green-400">${d.llenas}</div></div><div class="bg-slate-800 rounded p-2"><div class="text-[10px] text-slate-400">VACIAS</div><div class="text-lg font-bold text-slate-300">${d.vacias}</div></div><div class="bg-slate-800 rounded p-2"><div class="text-[10px] text-slate-400">CAMBIO</div><div class="text-lg font-bold text-red-400">${d.cambio||d.defectuosas||0}</div></div></div>
            <div class="mt-2 text-xs text-slate-500 text-center">Total ${d.llenas+d.vacias+(d.cambio||0)} | ${d.permite_completo?'✅ Completo':''} ${d.es_fraccionado?'🔹 Fracc':''}</div>
          </div>`).join('')}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4"><h3 class="font-bold text-white mb-3">🚚 Camionetas - Carga con HORA</h3>
          <div class="space-y-3">${['antonio','jose'].map(rep=>{
            const stockRep=camionetas.filter(c=>c.repartidor_id===rep);
            const totalLlenas=stockRep.reduce((s,c)=>s+c.llenas,0);
            return `<div class="bg-slate-800 rounded p-3"><div class="flex justify-between mb-2"><span class="font-bold text-white capitalize">${rep} - ${totalLlenas} llenas</span><div class="flex gap-2"><button onclick="window.stockCargar('${rep}')" class="text-xs bg-blue-600 text-white px-3 py-1 rounded">CARGAR (hora)</button><button onclick="window.stockDescargar('${rep}')" class="text-xs bg-slate-600 text-white px-3 py-1 rounded">DESCARGAR</button></div></div><div class="grid grid-cols-4 gap-1 text-[11px]">${stockRep.length?stockRep.map(s=>`<div class="bg-slate-700 rounded p-1 text-center"><div>${s.producto_id}</div><div class="font-bold">${s.llenas}L ${s.vacias}V ${s.cambio}C</div></div>`).join(''):'<div class="text-slate-500">Vacia</div>'}</div><button onclick="window.stockVender('camioneta','${rep}')" class="text-[10px] bg-amber-700 text-white px-2 py-1 rounded mt-2">VENTA CALLE</button></div>`;
          }).join('')}</div>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4"><h3 class="font-bold text-white mb-3">🏪 Mostrador + Fraccionado 43.5kg</h3>
          <div class="grid grid-cols-3 gap-2 mb-3"><button onclick="window.stockVender('mostrador','mostrador','recarga')" class="bg-green-900 text-green-200 text-xs p-2 rounded">Recarga<br><span class="text-[10px]">Llena-1 Vacia+1</span></button><button onclick="window.stockVender('mostrador','mostrador','completo')" class="bg-amber-900 text-amber-200 text-xs p-2 rounded">Envase Completo<br><span class="text-[10px]">11/13 Baja total</span></button><button onclick="window.stockVender('mostrador','mostrador','cambio')" class="bg-red-900 text-red-200 text-xs p-2 rounded">Cambio Falla<br><span class="text-[10px]">Llena-1 Cambio+1</span></button></div>
          <div class="bg-cyan-950 border border-cyan-800 rounded p-3 mb-3"><div class="text-xs font-bold text-cyan-300 mb-2">🔹 FRACCIONADO 43.5kg → Garrafita 3kg cliente (1 a 3kg)</div><div class="flex gap-2"><select id="kilosFraccionado" class="flex-1 bg-slate-800 text-white text-sm rounded p-1"><option>1</option><option>1.5</option><option>2</option><option>2.5</option><option>3</option></select><input id="clienteFraccionado" placeholder="Cliente" class="flex-1 bg-slate-800 text-white text-sm rounded p-1"><input id="precioFraccionado" type="number" value="450" class="flex-1 bg-slate-800 text-white text-sm rounded p-1"><button onclick="window.ventaFraccionada()" class="bg-cyan-600 text-white text-xs px-4 py-2 rounded">VENDER (${kilosEnUso.toFixed(1)}kg rest)</button></div></div>
          <div class="bg-slate-800 rounded p-3"><div class="text-xs font-bold text-white mb-2">📦 Proveedor - Remitos</div><div class="grid grid-cols-2 gap-2"><select id="provTipo" class="bg-slate-700 text-white text-xs rounded p-1"><option value="canje_vacio">Canje Vacios→Llenas</option><option value="canje_cambio">Canje Cambios→Llenas</option><option value="compra_envase">Compra Envase Completo (+total)</option></select><input id="provRemito" placeholder="N° Remito" class="bg-slate-700 text-white text-xs rounded p-1"><select id="provProducto" class="bg-slate-700 text-white text-xs rounded p-1"><option value="11">11kg</option><option value="13">13kg</option><option value="43.5">43.5kg</option><option value="45">45kg</option></select><input id="provCantidad" type="number" placeholder="Cant" class="bg-slate-700 text-white text-xs rounded p-1"></div><button onclick="window.proveedorMov()" class="w-full mt-2 bg-slate-600 text-white text-xs p-1 rounded">REGISTRAR REMITO</button></div>
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4"><h3 class="font-bold text-white mb-3">📋 Historial con HORA DE CARGA</h3><div class="overflow-auto max-h-96"><table class="w-full text-[11px]"><thead class="text-slate-400"><tr><th class="text-left p-1">Hora</th><th>Tipo</th><th>Origen</th><th>Prod</th><th>Cant</th><th>Detalle</th></tr></thead><tbody>${movimientos.map(m=>`<tr class="border-t border-slate-800"><td class="p-1 text-slate-300">${new Date(m.fecha_hora).toLocaleString('es-UY')}</td><td class="p-1"><span class="px-1 rounded text-[10px] bg-slate-700">${m.tipo}</span></td><td class="p-1 text-slate-400">${m.origen||''}→${m.destino||''} ${m.repartidor_id||''}</td><td class="p-1 text-white">${m.producto_id||''}</td><td class="p-1 text-white">${m.cantidad||''} ${m.kilos?`(${m.kilos}kg)`:''} ${m.modalidad||''}</td><td class="p-1 text-slate-500">${m.detalle||''}</td></tr>`).join('')}</tbody></table></div></div>
    `;
  }
  window.stockCargar=async(rep)=>{
    const prod=prompt('Producto? 11,13,43.5,45'); const cant=prompt('Cantidad?');
    if(!prod||!cant) return;
    await fetch(API_STOCK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'carga_camioneta',repartidor_id:rep,producto_id:prod,cantidad:parseInt(cant)})});
    alert(`Cargado ${cant}x ${prod} a ${rep} - ${new Date().toLocaleString()}`);
    loadStock();
  };
  window.stockDescargar=async(rep)=>{
    if(!confirm(`Descargar ${rep}?`)) return;
    await fetch(API_STOCK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'descarga_camioneta',repartidor_id:rep})});
    loadStock();
  };
  window.stockVender=async(origen,rep,mod)=>{
    const prod=prompt('Producto?'); if(!prod) return;
    let m=mod||prompt('Modalidad? recarga/completo/cambio');
    if(m==='completo' && !['11','13'].includes(prod)){alert('Completo solo 11/13'); return;}
    await fetch(API_STOCK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'venta',origen,repartidor_id:rep,producto_id:prod,modalidad:m,cantidad:1})});
    loadStock();
  };
  window.ventaFraccionada=async()=>{
    const kilos=parseFloat(document.getElementById('kilosFraccionado').value);
    const cliente=document.getElementById('clienteFraccionado').value||'Cliente';
    const precio=parseInt(document.getElementById('precioFraccionado').value)||0;
    const r=await fetch(API_STOCK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'venta_fraccionada',kilos,cliente_nombre:cliente,precio_kilo:precio})});
    const d=await r.json();
    if(d.error) alert(d.error); else alert(`Vendido ${kilos}kg - Restante ${d.restante?.toFixed(1)}kg`);
    loadStock();
  };
  window.proveedorMov=async()=>{
    const tipo=document.getElementById('provTipo').value;
    const remito=document.getElementById('provRemito').value;
    const prod=document.getElementById('provProducto').value;
    const cant=parseInt(document.getElementById('provCantidad').value);
    if(!remito||!cant){alert('Falta remito/cant'); return;}
    await fetch(API_STOCK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion:'proveedor',tipo,numero_remito:remito,producto_id:prod,cantidad:cant,proveedor_nombre:'Proveedor'})});
    alert(`${tipo} Remito ${remito} OK`);
    loadStock();
  };
  loadStock();
}
