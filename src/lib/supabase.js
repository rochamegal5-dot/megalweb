import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// Para que tu index.html viejo funcione
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase
}

export const UMBRAL_ONLINE = 120
//
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

  } catch (e) {
    console.error('❌ Error GPS:', e.message, e)
    // Intento 2: por si tu tabla usa latitude/longitude o lat/lng
    if (e.message.includes('column')) {
      console.log('Reintentando con lat/lng...')
      const { data, error } = await supabase
        .from('gps_locations')
        .insert({ repartidor_id, lat: latitud, lng: longitud })
        .select()
        .single()
      if (!error) return data
    }
    throw e
  }
}

// Test visible para celular
window.testGPSCelular = actualizarUbicacion
