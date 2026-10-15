import { createClient } from '@supabase/supabase-js'

// LEE 100% SEGURO DESDE VERCEL ENV VARS
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Faltan ENV VARS: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
  throw new Error('Configura las ENV VARS en Vercel > Settings > Environment Variables')
}

export const supabase = createClient(url, key)

export const ROCHA_CENTER = [-34.4833, -54.3333]
export const UMBRAL_ONLINE = 120
// TEST VISIBLE PARA CELULAR - sin consola
window.testGPSCelular = async () => {
  try {
    const { data, error } = await supabase
      .from('ubicaciones')
      .insert({ repartidor_id: 1, latitud: -34.4833, longitud: -54.3333 })
      .select()
      .single()
    if(error) throw error
    alert("✅ GPS OK: ID=" + data.id + " Lat=" + data.latitud)
    return data
  } catch(e) {
    alert("❌ ERROR: " + e.message)
    console.error(e)
  }
}
