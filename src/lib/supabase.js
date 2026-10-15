import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// Para compatibilidad con tu index.html viejo
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase
}

export const UMBRAL_ONLINE = 120

// Centro de Rocha - lo usa src/modules/gps.js
export const ROCHA_CENTER = [-34.4833, -54.3333]
export const ROCHA_CENTER_OBJ = { lat: -34.4833, lng: -54.3333 }
export const CENTER_ROCHA = ROCHA_CENTER

// FUNCION QUE SOLUCIONA EL Failed to fetch - USA PROXY /api/gps
export const actualizarUbicacion = async (repartidor_id, latitud, longitud) => {
  // Intenta por proxy (soluciona bloqueo de Antel/supabase.co)
  try {
    const res = await fetch('/api/gps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        device_id: repartidor_id, 
        lat: latitud, 
        lng: longitud 
      })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Error proxy')
    console.log('✅ GPS via /api/gps:', json.data)
    return json.data
  } catch (eProxy) {
    console.warn('Proxy falló, intento directo:', eProxy.message)
    // Fallback directo a Supabase si el proxy no existe aún
    const { data, error } = await supabase
      .from('gps_locations')
      .insert({
        device_id: repartidor_id,
        lat: latitud,
        lng: longitud,
        speed: 0,
        accuracy: 10,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single()
    if (error) throw error
    console.log('✅ GPS directo en gps_locations:', data)
    return data
  }
}

// Funciones extra por si tu app las usa
export const obtenerUltimaUbicacion = async (device_id) => {
  const { data, error } = await supabase
    .from('gps_locations')
    .select('*')
    .eq('device_id', device_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return data
}

if (typeof window !== 'undefined') {
  window.testGPSCelular = actualizarUbicacion
  window.actualizarUbicacion = actualizarUbicacion
  window.supabase = supabase
}
