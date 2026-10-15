import { supabase, ROCHA_CENTER, UMBRAL_ONLINE } from './lib/supabase.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

window.supabaseClient = supabase
window.supabase = supabase
window.ROCHA_CENTER = ROCHA_CENTER
window.UMBRAL_ONLINE = UMBRAL_ONLINE
window.L = L

// Importa todos los módulos seguros
import './modules/productos.js'
import './modules/clientes.js'
import './modules/proveedores.js'
import './modules/stock.js'
import './modules/ventas.js'
import './modules/repartidores.js'
import './modules/gps.js'
import './modules/finanzas.js'
import './modules/marketing.js'

// FORCE EXPOSURE - V2.1 CACHE BUST
import { actualizarUbicacion } from './modules/repartidores.js'
import { initMap, cargarYMostrarRepartidores, centrarEnRepartidor } from './modules/gps.js'

window.actualizarUbicacion = actualizarUbicacion
window.initMap = initMap
window.cargarYMostrarRepartidores = cargarYMostrarRepartidores
window.centrarEnRepartidor = centrarEnRepartidor

console.log('✅ MegalWeb V2.1 CACHE BUST', new Date().toISOString())
console.log('✅ actualizarUbicacion:', typeof window.actualizarUbicacion)

window.testConexion = async () => {
  const el = document.getElementById('testResult')
  try {
    const { data, error } = await supabase.from('repartidores').select('*').limit(5)
    if (error) throw error
    if (el) el.innerHTML = `<span class="text-green-600 font-bold">✅ Conexión OK V2.1 - ${data.length} repartidores - Funciones GPS listas</span>`
    return data
  } catch(e) {
    if (el) el.innerHTML = `<span class="text-red-600">❌ Error: ${e.message}</span>`
    throw e
  }
}