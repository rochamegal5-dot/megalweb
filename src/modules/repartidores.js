import { supabase, UMBRAL_ONLINE } from '../lib/supabase.js'

export async function cargarRepartidores() {
  const { data, error } = await supabase.from('repartidores').select('*').order('nombre')
  if (error) throw error
  return data
}

export function calcularEstadoRepartidor(lastSeen) {
  if (!lastSeen) return 'offline'
  const diff = (Date.now() - new Date(lastSeen).getTime()) / 1000
  if (diff < UMBRAL_ONLINE) return 'online'
  if (diff < UMBRAL_ONLINE * 2) return 'away'
  return 'offline'
}

export async function actualizarUbicacion(repartidorId, lat, lng) {
  // CORRIGE EL ERROR DE FOREIGN KEY QUE TENÍAS
  // Antes fallaba por ubicaciones_repartidor_id_fkey
  const { data, error } = await supabase.from('ubicaciones').insert({
    repartidor_id: repartidorId,
    latitud: lat,
    longitud: lng
  }).select().single()
  
  if (error) {
    console.error('Error ubicacion:', error)
    // Si falla por FK, es porque repartidor_id no existe
    if (error.code === '23503') {
      alert('Error: El repartidor no existe en la tabla repartidores. Ejecuta el SQL fix en Supabase.')
    }
    throw error
  }
  
  // Actualiza last_seen en repartidores
  await supabase.from('repartidores').update({ last_seen: new Date().toISOString(), lat, lng }).eq('id', repartidorId)
  
  return data
}

window.cargarRepartidores = cargarRepartidores
window.actualizarUbicacion = actualizarUbicacion
window.calcularEstadoRepartidor = calcularEstadoRepartidor
