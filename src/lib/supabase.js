import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

if (typeof window !== 'undefined') {
  window.supabaseClient = supabase
}

export const UMBRAL_ONLINE = 120

// Centro de Rocha - lo usa gps.js
export const ROCHA_CENTER = [-34.4833, -54.3333]
export const ROCHA_CENTER_OBJ = { lat: -34.4833, lng: -54.3333 }
export const CENTER_ROCHA = ROCHA_CENTER

export const actualizarUbicacion = async (repartidor_id, latitud, longitud) => {
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
  console.log('✅ GPS en gps_locations:', data)
  return data
}

if (typeof window !== 'undefined') {
  window.testGPSCelular = actualizarUbicacion
  window.actualizarUbicacion = actualizarUbicacion
}
