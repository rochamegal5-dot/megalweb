import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export const ROCHA_CENTER = [-34.4746, -54.3450]
export const UMBRAL_ONLINE = 5 * 60 * 1000

window.ROCHA_CENTER = ROCHA_CENTER
window.UMBRAL_ONLINE = UMBRAL_ONLINE
window.L = L

import './modules/productos.js'
import './modules/clientes.js'
import './modules/proveedores.js'
import './modules/ventas.js'
import './modules/repartidores.js'
import './modules/gps.js'
import './modules/finanzas.js'
import './modules/marketing.js'

import { initStock } from './modules/stock.js'
import { actualizarUbicacion } from './modules/repartidores.js'
import { initMap, cargarYMostrarRepartidores, centrarEnRepartidor } from './modules/gps.js'

window.actualizarUbicacion = actualizarUbicacion
window.initMap = initMap
window.cargarYMostrarRepartidores = cargarYMostrarRepartidores
window.centrarEnRepartidor = centrarEnRepartidor
window.initStock = initStock

console.log('✅ MegalWeb TURSO PURO - initStock listo')

// Router simple para view-stock
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const btnStock = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Stock'));
    if(btnStock){
      btnStock.addEventListener('click', () => {
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
        document.getElementById('view-stock')?.classList.remove('hidden');
        window.initStock && window.initStock();
      });
    }
  }, 500);
});

window.testConexion = async () => {
  const el = document.getElementById('testResult')
  try {
    const r = await fetch('/api/check-turso');
    const data = await r.json();
    if (el) el.innerHTML = `<span class="text-green-600 font-bold">✅ TURSO OK - ${data.productos?.length} prods</span>`
    return data
  } catch(e) {
    if (el) el.innerHTML = `<span class="text-red-600">❌ ${e.message}</span>`
    throw e
  }
}

fetch('/api/repartidores').then(r=>r.json()).then(data=>{
  document.querySelectorAll('select').forEach(s=>{
    if(s.innerHTML.includes('Todos')){
      s.innerHTML = '<option value="Todos">-- Todos --</option>' + data.map(r=>`<option value="${r.device_id}">${r.device_id} - ${r.nombre}</option>`).join('');
    }
  });
}).catch(()=>{});
