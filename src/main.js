import { supabase, ROCHA_CENTER, UMBRAL_ONLINE } from './lib/supabase.js'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Hace supabase disponible globalmente para tu código existente
window.supabaseClient = supabase
window.ROCHA_CENTER = ROCHA_CENTER
window.UMBRAL_ONLINE = UMBRAL_ONLINE
window.L = L

// Carga tu app original modularizada
// Por ahora, el resto de tu lógica viene del index.html original
// En la versión final, partimos cada módulo en /src/modules/

console.log('MegalWeb 2.1 - ENV Seguro cargado', {
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})

// Inicializa mapas y supabase (tu código original de initMaps e initSupabase va aquí)
// Importar aquí tus módulos: productos, clientes, etc.
import './modules/app.js'
