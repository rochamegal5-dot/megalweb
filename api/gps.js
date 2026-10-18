import L from 'leaflet'

// Centro Rocha (si no lo tenés en supabase.js, definilo acá)
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
  
  // Limpia markers
  Object.values(markers).forEach(m => map.removeLayer(m))
  markers = {}
  
  try {
    // 1. Traer repartidores de Turso
    const respRep = await fetch('/api/repartidores?all=1').catch(() => null);
    let repartidores = [];
    if (respRep && respRep.ok) {
      const data = await respRep.json();
      repartidores = Array.isArray(data) ? data : (data.results?.[0]?.rows || []);
    }

    // 2. Traer ubicaciones de Turso (tu tabla gps_locations)
    const respGps = await fetch('/api/gps?all=1');
    const tursoData = await respGps.json();
    const ubicaciones = Array.isArray(tursoData) ? tursoData : [];
    
    console.log("Turso GPS data:", ubicaciones.length, "puntos");

    // 3. Mostrar repartidores con su última ubicación
    for (const row of ubicaciones.slice(0, 20)) {
      // Turso devuelve [device_id, lat, lng, velocidad, recorded_at]
      const device_id = Array.isArray(row) ? row[0] : row.device_id;
      const lat = Array.isArray(row) ? row[1] : row.lat;
      const lng = Array.isArray(row) ? row[2] : row.lng;
      const velocidad = Array.isArray(row) ? row[3] : row.velocidad;
      const fecha = Array.isArray(row) ? row[4] : row.recorded_at;

      if (!lat || !lng) continue;

      // Buscar nombre del repartidor
      const rep = repartidores.find(r => {
        const id = Array.isArray(r) ? r[0] : r.id;
        const devId = Array.isArray(r) ? r[6] : r.device_id;
        return devId == device_id || id == device_id;
      });
      
      const nombre = rep ? (Array.isArray(rep) ? rep[1] : rep.nombre) : `Moto ${device_id}`;
      const color = rep ? (Array.isArray(rep) ? rep[5] : rep.color) : '#ef4444';

      const icon = L.divIcon({
        className: 'gps-marker',
        html: `<div style="background:${color}; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); position:relative;"><div class="gps-pulse" style="background:${color}; width:20px; height:20px; border-radius:50%; position:absolute; top:-3px; left:-3px; animation: pulse 2s infinite;"></div></div>`,
        iconSize: [20,20]
      })
      
      const marker = L.marker([lat, lng], { icon }).addTo(map)
        .bindPopup(`<b>${nombre}</b><br>${parseFloat(lat).toFixed(6)},${parseFloat(lng).toFixed(6)}<br>${velocidad || 0} km/h<br>${fecha ? new Date(fecha).toLocaleString() : ''}`)
      
      markers[device_id] = marker
    }

    // Si no hay datos, centrar en Rocha
    if (ubicaciones.length === 0) {
      console.log("Sin datos GPS aún, esperando APK");
    } else {
      // Centrar en última ubicación
      const ultima = ubicaciones[0];
      const lat = Array.isArray(ultima) ? ultima[1] : ultima.lat;
      const lng = Array.isArray(ultima) ? ultima[2] : ultima.lng;
      if (lat && lng) map.setView([lat, lng], 15);
    }

    return repartidores

  } catch(e) {
    console.error("Error cargando Turso:", e);
    return []
  }
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
    console.log(`GPS Web: ${lat},${lng}`);
    if (window.AndroidGPS) {
      window.AndroidGPS.sendLocation(lat.toString(), lng.toString(), speed.toString());
    }
  }, null, {enableHighAccuracy: true, maximumAge: 0, timeout: 10000});
}

window.initMap = initMap
window.cargarYMostrarRepartidores = cargarYMostrarRepartidores
window.centrarEnRepartidor = centrarEnRepartidor
