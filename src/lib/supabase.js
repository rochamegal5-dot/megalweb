import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

if (typeof window !== 'undefined') {
  window.supabaseClient = supabase
}

export const UMBRAL_ONLINE = 120

// ESTO ARREGLA TU ERROR DE BUILD
export const ROCHA_CENTER = [-34.4833, -54.3333]
export const ROCHA_CENTER_OBJ = { lat: -34.4833, lng: -54.3333 }
export const CENTER_ROCHA = ROCHA_CENTER

// ESTO ARREGLA EL Failed to fetch - USA PROXY
export const actualizarUbicacion = async (repartidor_id, latitud, longitud) => {
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
    console.log('✅ GPS via proxy:', json.data)
    return json.data
  } catch (e) {
    console.warn('Proxy no disponible, intento directo:', e.message)
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
    return data
  }
}

if (typeof window !== 'undefined') {
  window.actualizarUbicacion = actualizarUbicacion
  window.testGPSCelular = actualizarUbicacion
}
