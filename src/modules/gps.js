// gps.js - Mapa 100% Turso - NO necesita Supabase
import L from 'leaflet';

const ROCHA = [-34.4833, -54.3333];
let map;
let currentMarker = null;
let pathLine = null;

export function initMap(containerId = 'map') {
  if (map) {
    map.remove();
    map = null;
  }
  const el = document.getElementById(containerId);
  if (!el) {
    console.error("No existe #" + containerId);
    return null;
  }
  map = L.map(containerId).setView(ROCHA, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);
  
  // Cargar al iniciar
  cargarYMostrarRepartidores();
  
  // Auto-actualizar cada 5 segundos
  setInterval(cargarYMostrarRepartidores, 5000);
  
  return map;
}

export async function cargarYMostrarRepartidores() {
  try {
    const resp = await fetch('/api/gps?all=1', { cache: 'no-store' });
    const data = await resp.json();
    
    console.log("GPS Turso data:", data);
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log("Sin datos GPS");
      return [];
    }

    // data = [[device_id, lat, lng, velocidad, fecha], ...] ordenado DESC
    const ultimo = data[0];
    const device_id = ultimo[0];
    const lat = ultimo[1];
    const lng = ultimo[2];
    const velocidad = ultimo[3];
    const fecha = ultimo[4];

    if (!map) return data;

    // Borrar marcador anterior
    if (currentMarker) map.removeLayer(currentMarker);
    
    // Icono rojo para el último
    const icon = L.divIcon({
      className: 'gps-marker',
      html: `<div style="background:#ef4444; width:22px; height:22px; border-radius:50%; border:3px solid white; box-shadow:0 0 12px rgba(0,0,0,0.4); animation: pulse 1.5s infinite;"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    currentMarker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(`
        <div style="font-family:sans-serif; min-width:150px">
          <b style="font-size:14px">🏍️ Moto ${device_id}</b><br>
          📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}<br>
          💨 ${velocidad || 0} km/h<br>
          🕐 ${fecha ? new Date(fecha).toLocaleString() : ''}<br>
          <small style="color:green">● En vivo</small>
        </div>
      `)
      .openPopup();

    map.setView([lat, lng], 15);

    // Dibujar recorrido (últimos 20 puntos)
    if (pathLine) map.removeLayer(pathLine);
    const puntos = data.slice(0, 20).reverse().map(r => [r[1], r[2]]);
    if (puntos.length > 1) {
      pathLine = L.polyline(puntos, { color: '#3b82f6', weight: 4, opacity: 0.6, dashArray: '8,8' }).addTo(map);
    }

    return data;
  } catch (e) {
    console.error("Error cargando GPS:", e);
    return [];
  }
}

export function centrarEnRepartidor() {
  if (currentMarker && map) {
    map.setView(currentMarker.getLatLng(), 16);
    currentMarker.openPopup();
  }
}

// Exponer global para HTML
if (typeof window !== 'undefined') {
  window.initMap = initMap;
  window.cargarYMostrarRepartidores = cargarYMostrarRepartidores;
  window.centrarEnRepartidor = centrarEnRepartidor;
}

// CSS para pulso
const style = document.createElement('style');
style.textContent = `@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }`;
document.head.appendChild(style);
