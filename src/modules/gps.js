import { supabase, ROCHA_CENTER } from '../lib/supabase.js'
import L from 'leaflet'

let map, markers = {}

export function initMap(containerId = 'map') {
  if (map) { map.remove(); map = null }
  map = L.map(containerId).setView(ROCHA_CENTER, 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map)
  return map
}

export async function cargarYMostrarRepartidores() {
  if (!map) initMap()
  
  const { data: repartidores } = await supabase.from('repartidores').select('*')
  const { data: ubicaciones } = await supabase.from('ubicaciones').select('*').order('created_at', {ascending:false}).limit(100)
  
  // Limpia markers
  Object.values(markers).forEach(m => map.removeLayer(m))
  markers = {}
  
  for (const rep of repartidores || []) {
    const ultimaUbic = ubicaciones?.find(u => u.repartidor_id === rep.id) || rep
    if (!ultimaUbic.latitud && !ultimaUbic.lat && !rep.lat) continue
    
    const lat = ultimaUbic.latitud || ultimaUbic.lat || rep.lat
    const lng = ultimaUbic.longitud || ultimaUbic.lng || rep.lng
    
    const icon = L.divIcon({
      className: 'gps-marker',
      html: `<div style="background:${rep.color || '#3b82f6'}; width:16px; height:16px; border-radius:50%; border:3px solid white; position:relative;"><div class="gps-pulse" style="background:${rep.color || '#3b82f6'}; width:16px; height:16px;"></div></div>`,
      iconSize: [16,16]
    })
    
    const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b>${rep.nombre}</b><br>Última: ${new Date(ultimaUbic.created_at || rep.last_seen).toLocaleTimeString()}`)
    markers[rep.id] = marker
  }
  
  return repartidores
}

export function centrarEnRepartidor(id) {
  const m = markers[id]
  if (m && map) map.setView(m.getLatLng(), 15)
}
// === INTEGRACIÓN GASTRACK ANDROID + TURSO ===
if (typeof navigator !== 'undefined' && navigator.geolocation) {
  navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const speed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : "0";
    if (window.AndroidGPS) {
      window.AndroidGPS.sendLocation(lat.toString(), lng.toString(), speed.toString());
    }
  }, null, {enableHighAccuracy: true, maximumAge: 0});
}

window.initMap = initMap
window.cargarYMostrarRepartidores = cargarYMostrarRepartidores
window.centrarEnRepartidor = centrarEnRepartidor
