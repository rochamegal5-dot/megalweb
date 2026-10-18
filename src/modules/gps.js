import L from 'leaflet'

const ROCHA_CENTER = [-34.4833, -54.3333]

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
  
  Object.values(markers).forEach(m => map.removeLayer(m))
  markers = {}
  
  try {
    const resp = await fetch('/api/gps?all=1');
    const data = await resp.json();
    
    // data es [[device_id, lat, lng, velocidad, fecha], ...]
    const ubicaciones = Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) ? data : (data.normalized || []);
    
    console.log("GPS Turso:", ubicaciones);

    if (ubicaciones.length === 0) {
      console.log("Sin datos GPS aún");
      return []
    }

    // Mostrar últimos 20 puntos
    ubicaciones.slice(0, 20).forEach((row, idx) => {
      const device_id = row[0];
      const lat = row[1];
      const lng = row[2];
      const velocidad = row[3];
      const fecha = row[4];

      if (!lat || !lng) return;

      const isLatest = idx === 0;
      const color = isLatest ? '#ef4444' : '#3b82f6';
      const size = isLatest ? 20 : 12;

      const icon = L.divIcon({
        className: 'gps-marker',
        html: `<div style="background:${color}; width:${size}px; height:${size}px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [size, size]
      })
      
      const marker = L.marker([lat, lng], { icon }).addTo(map)
        .bindPopup(`<b>Moto ${device_id}</b><br>${lat.toFixed(5)},${lng.toFixed(5)}<br>${velocidad || 0} km/h<br>${fecha ? new Date(fecha).toLocaleString() : ''}`)
      
      if (isLatest) {
        map.setView([lat, lng], 15);
        markers[device_id] = marker;
      }
    });

    return ubicaciones

  } catch(e) {
    console.error("Error Turso map:", e);
    return []
  }
}

export function centrarEnRepartidor(id) {
  const m = markers[id]
  if (m && map) map.setView(m.getLatLng(), 15)
}

// === PUENTE ANDROID APK ===
if (typeof navigator !== 'undefined' && navigator.geolocation) {
  navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const speed = pos.coords.speed ? (pos.coords.speed * 3.6).toFixed(1) : "0";
    if (window.AndroidGPS && window.AndroidGPS.sendLocation) {
      window.AndroidGPS.sendLocation(lat.toString(), lng.toString(), speed.toString());
    }
  }, null, {enableHighAccuracy: true, maximumAge: 0, timeout: 10000});
}

window.initMap = initMap
window.cargarYMostrarRepartidores = cargarYMostrarRepartidores
window.centrarEnRepartidor = centrarEnRepartidor
