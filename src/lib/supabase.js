import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

// Para que tu index.html viejo funcione
if (typeof window !== 'undefined') {
  window.supabaseClient = supabase
}

export const UMBRAL_ONLINE = 120

// AHORA USA gps_locations que SÍ existe
export const actualizarUbicacion = async (repartidor_id, latitud, longitud) => {
  try {
    const { data, error } = await supabase
      .from('gps_locations')
      .insert({ 
        repartidor_id, 
        latitud, 
        longitud,
        // por si tu tabla usa otros nombres, intenta con lat/lng también
        // Si falla por columna, mira el error y dime qué columnas tiene
      })
      .select()
      .single()
    if (error) throw error
    console.log('✅ GPS guardado en gps_locations:', data)
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
