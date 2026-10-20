// src/modules/gps.js - GasTrack ATODUR 【entity-Life360¦canonical_name=Life360】 3s - Megal Rocha
import { supabase } from '../lib/supabase.js';

let map, markers = {}, polylines = {}, interval = null;

export async function initGPS(containerId = 'gps-container') {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  container.innerHTML = `
    <div style="padding:10px;background:#111;color:#0f0;font-family:monospace;display:flex;justify-content:space-between">
      <span id="gps-status">ATODUR - Conectando...</span>
      <select id="device-selector">
        <option value="7">Equipo 7 - Megal</option>
        <option value="8">Equipo 8</option>
      </select>
      <button id="btn-live" style="background:red;color:white;border:0;padding:5px 10px">● LIVE 3s</button>
    </div>
    <div id="gps-map" style="height:75vh;width:100%"></div>
    <div id="gps-log" style="height:15vh;overflow:auto;background:#000;color:#0f0;font-size:11px;padding:5px"></div>
  `;

  // Init Leaflet
  if(!document.querySelector('link[href*="leaflet.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  await new Promise(r => {
    if(window.L) return r();
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = r;
    document.head.appendChild(s);
  });

  map = L.map('gps-map').setView([-32.524, -55.765], 7); // Uruguay centro
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  document.getElementById('device-selector').addEventListener('change', (e) => startTracking(e.target.value));
  document.getElementById('btn-live').addEventListener('click', () => startTracking(document.getElementById('device-selector').value));

  startTracking(7);
}

async function startTracking(deviceId) {
  if(interval) clearInterval(interval);
  document.getElementById('gps-status').innerText = `ATODUR - Equipo ${deviceId} LIVE 3s`;
  
  const load = async () => {
    try {
      // Primero intenta Vercel /api/locations, luego Supabase, luego Turso
      let res = await fetch(`/api/locations?device_id=${deviceId}`);
      let data = await res.json();
      
      // Si viene de Supabase formato distinto
      if(!Array.isArray(data) && data.data) data = data.data;
      
      if(!data || !data.length) {
        document.getElementById('gps-log').innerHTML = `Sin datos para equipo ${deviceId} - Esperando app...`;
        return;
      }

      // Ordena por fecha desc
      data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
      const last = data[0];
      
      // Update polyline
      const latlngs = data.map(p => [parseFloat(p.lat), parseFloat(p.lng)]).reverse();
      if(polylines[deviceId]) map.removeLayer(polylines[deviceId]);
      polylines[deviceId] = L.polyline(latlngs, {color: deviceId==7?'#ff0000':'#0000ff', weight:4}).addTo(map);

      // Marker
      if(markers[deviceId]) map.removeLayer(markers[deviceId]);
      markers[deviceId] = L.marker([last.lat, last.lng], {
        icon: L.divIcon({html:`<div style="background:red;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px red"></div>`, iconSize:[20,20]})
      }).addTo(map).bindPopup(`
        <b>Equipo ${last.device_id}</b><br>
        ${last.usuario}<br>
        Jornada: ${last.jornada_id}<br>
        Vel: ${parseFloat(last.velocidad||0).toFixed(1)} km/h<br>
        Bat: ${last.battery||'?'}%<br>
        ${new Date(last.created_at).toLocaleString()}
      `);

      map.setView([last.lat, last.lng], 16);
      
      document.getElementById('gps-status').innerText = `ATODUR LIVE - Eq ${deviceId} - ${last.lat.toFixed(5)}, ${last.lng.toFixed(5)} - ${last.velocidad} km/h`;
      document.getElementById('gps-log').innerHTML = data.slice(0,20).map(p => 
        `[${new Date(p.created_at).toLocaleTimeString()}] Eq${p.device_id} ${p.lat},${p.lng} ${p.velocidad}km/h`
      ).join('<br>');
      
    } catch(e) {
      console.error(e);
      document.getElementById('gps-log').innerText = 'Error: '+e.message;
    }
  };

  await load();
  interval = setInterval(load, 3000); // ATODUR 3s
}

export default { initGPS };
