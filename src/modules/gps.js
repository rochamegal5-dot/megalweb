// src/modules/gps.js - Megal Rocha - FIX ATODUR 10s + Turso
let map, markers = {}, polylines = {}, interval = null;

export async function initGPS(containerId = 'gps-container') {
  const container = document.getElementById(containerId);
  if(!container) return;
  
  container.innerHTML = `
    <div style="padding:10px;background:#111;color:#0f0;font-family:monospace;display:flex;justify-content:space-between;align-items:center">
      <span id="gps-status">Megal - Conectando Turso...</span>
      <select id="device-selector" style="padding:5px">
        <option value="Todos">-- Cargando repartidores --</option>
      </select>
      <button id="btn-live" style="background:#00c853;color:white;border:0;padding:5px 12px;cursor:pointer">● LIVE 10s</button>
    </div>
    <div id="gps-map" style="height:75vh;width:100%"></div>
    <div id="gps-log" style="height:15vh;overflow:auto;background:#000;color:#0f0;font-size:11px;padding:5px;font-family:monospace"></div>
  `;

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

  map = L.map('gps-map').setView([-34.48, -54.33], 13); // Rocha
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  // CARGAR REPARTIDORES DINAMICO DESDE TURSO
  try {
    const repRes = await fetch('/api/repartidores');
    const reps = await repRes.json();
    const sel = document.getElementById('device-selector');
    sel.innerHTML = '<option value="Todos">-- Todos --</option>';
    reps.forEach(r => {
      sel.innerHTML += `<option value="${r.device_id}">${r.device_id} - ${r.nombre}</option>`;
    });
  } catch(e){ console.error('Error cargando repartidores', e) }

  document.getElementById('device-selector').addEventListener('change', (e) => startTracking(e.target.value));
  document.getElementById('btn-live').addEventListener('click', () => startTracking(document.getElementById('device-selector').value));

  startTracking('Todos');
}

async function startTracking(deviceId) {
  if(interval) clearInterval(interval);
  
  const load = async () => {
    try {
      const url = deviceId === 'Todos' ? '/api/locations' : `/api/locations?device_id=${deviceId}`;
      const res = await fetch(url);
      let data = await res.json();
      if(!Array.isArray(data)) data = [];
      
      if(!data.length) {
        document.getElementById('gps-log').innerHTML = `Sin datos para equipo ${deviceId} - Esperando app Gastrack... Turso OK`;
        document.getElementById('gps-status').innerText = `Megal - Eq ${deviceId} - Sin datos - LIVE 10s`;
        return;
      }

      data.sort((a,b) => new Date(b.timestamp||b.created_at) - new Date(a.timestamp||a.created_at));
      const last = data[0];
      
      const latlngs = data.map(p => [parseFloat(p.lat), parseFloat(p.lng)]).reverse();
      if(polylines[deviceId]) map.removeLayer(polylines[deviceId]);
      polylines[deviceId] = L.polyline(latlngs, {color: deviceId==7?'#ff0000':'#0000ff', weight:4}).addTo(map);

      if(markers[deviceId]) map.removeLayer(markers[deviceId]);
      markers[deviceId] = L.marker([last.lat, last.lng], {
        icon: L.divIcon({html:`<div style="background:red;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px red"></div>`, iconSize:[22,22]})
      }).addTo(map).bindPopup(`<b>Equipo ${last.device_id}</b><br>Lat: ${last.lat}<br>Lng: ${last.lng}<br>Vel: ${last.speed||0} km/h<br>${new Date(last.timestamp).toLocaleString()}`);

      map.setView([last.lat, last.lng], 16);
      document.getElementById('gps-status').innerText = `Megal LIVE - Eq ${deviceId} - ${parseFloat(last.lat).toFixed(5)}, ${parseFloat(last.lng).toFixed(5)} - ${last.speed||0} km/h`;
      document.getElementById('gps-log').innerHTML = data.slice(0,30).map(p => 
        `[${new Date(p.timestamp).toLocaleTimeString()}] Eq${p.device_id} ${parseFloat(p.lat).toFixed(5)},${parseFloat(p.lng).toFixed(5)} ${p.speed||0}km/h`
      ).join('<br>');
      
    } catch(e) {
      console.error(e);
      document.getElementById('gps-log').innerText = 'Error: '+e.message;
    }
  };

  await load();
  interval = setInterval(load, 10000); // FIX: 10s no 3s - evita Database Error
}

export default { initGPS };
