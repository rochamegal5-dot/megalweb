import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Constantes que antes venían de supabase.js - ahora fijas para Turso
export const ROCHA_CENTER = [-34.4746, -54.3450] // Melo / Rocha
export const UMBRAL_ONLINE = 5 * 60 * 1000 // 5 min

window.ROCHA_CENTER = ROCHA_CENTER
window.UMBRAL_ONLINE = UMBRAL_ONLINE
window.L = L

// Importa todos los módulos TURSO
import './modules/productos.js'
import './modules/clientes.js'
import './modules/proveedores.js'
import './modules/ventas.js'
import './modules/repartidores.js'
import './modules/gps.js'
import './modules/finanzas.js'
import './modules/marketing.js'

// Stock TURSO v3
import { initStock } from './modules/stock.js'

// GPS TURSO
import { actualizarUbicacion } from './modules/repartidores.js'
import { initMap, cargarYMostrarRepartidores, centrarEnRepartidor } from './modules/gps.js'

window.actualizarUbicacion = actualizarUbicacion
window.initMap = initMap
window.cargarYMostrarRepartidores = cargarYMostrarRepartidores
window.centrarEnRepartidor = centrarEnRepartidor
window.initStock = initStock

console.log('✅ MegalWeb TURSO PURO', new Date().toISOString())
console.log('✅ initStock:', typeof window.initStock)
console.log('✅ initMap:', typeof window.initMap)

// Enganchar botón Stock (el que viste vacío)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const btnStock = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Stock'));
    if(btnStock){
      console.log('✅ Botón Stock encontrado');
      btnStock.addEventListener('click', () => {
        console.log('📦 Click Stock → initStock TURSO');
        setTimeout(() => window.initStock && window.initStock(), 300);
      });
    }
  }, 800);
});

window.testConexion = async () => {
  const el = document.getElementById('testResult')
  try {
    const r = await fetch('/api/check-turso');
    const data = await r.json();
    if (el) el.innerHTML = `<span class="text-green-600 font-bold">✅ Conexión TURSO OK - ${data.productos?.length} productos - ${data.deposito?.length} stocks - Stock ${data.validaciones?.tiene_kilos_en_uso?'OK':''}</span>`
    console.log('Turso check:', data);
    return data
  } catch(e) {
    if (el) el.innerHTML = `<span class="text-red-600">❌ Error Turso: ${e.message}</span>`
    throw e
  }
}

// FIX rápido para cargar repartidores del TURSO en el sidebar
fetch('/api/repartidores').then(r=>r.json()).then(data=>{
  document.querySelectorAll('select').forEach(s=>{
    if(s.innerHTML.includes('Todos')){
      s.innerHTML = '<option value="Todos">-- Todos --</option>' + data.map(r=>`<option value="${r.device_id}">${r.device_id} - ${r.nombre}</option>`).join('');
    }
  });
}).catch(()=>{});
