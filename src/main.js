import { supabase, ROCHA_CENTER, UMBRAL_ONLINE } from './lib/supabase.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Disponible globalmente para compatibilidad con tu código viejo
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

console.log('✅ MegalWeb 2.1 - Todos los módulos seguros cargados', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})

// Exponer función global de test
window.testConexion = async () => {
  const el = document.getElementById('testResult')
  try {
    const { data, error } = await supabase.from('repartidores').select('*').limit(5)
    if (error) throw error
    if (el) el.innerHTML = `<span class="text-green-600 font-bold">✅ Conexión OK con ENV segura - ${data.length} repartidores</span>`
    return data
  } catch(e) {
    if (el) el.innerHTML = `<span class="text-red-600">❌ Error: ${e.message}</span>`
    throw e
  }
}