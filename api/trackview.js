export default function handler(req, res) {
  res.setHeader("Content-Type", "text/html");
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ATODUR - Tracking Life360</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0;font-family:sans-serif} #map{height:100vh} #panel{position:absolute;top:10px;left:50px;z-index:999;background:#0F172A;color:white;padding:12px;border-radius:8px}</style>
</head>
<body>
<div id="panel">
  <select id="sel" style="padding:6px"><option value="7">Antonio - Equipo 7</option><option value="8">Jose - Equipo 8</option></select>
  <div id="stats" style="margin-top:8px;font-size:13px">Cargando Turso...</div>
</div>
<div id="map"></div>
<script>
const map = L.map('map').setView([-34.48, -54.33], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
let poly, markers=[];
async function load(){
  const id = document.getElementById('sel').value;
  try{
    const res = await fetch('/api/locations?device_id='+id);
    const data = await res.json();
    if(!data || !data.length){ document.getElementById('stats').innerText='Sin datos aún. Iniciá seguimiento en la app'; return; }
    markers.forEach(m=>map.removeLayer(m)); markers=[];
    if(poly) map.removeLayer(poly);
    const latlngs = data.map(d=>[d.lat, d.lng]);
    poly = L.polyline(latlngs, {color:'#FACC15', weight:5}).addTo(map);
    const last = data[0];
    const m = L.marker([last.lat, last.lng]).addTo(map).bindPopup('<b>Equipo '+last.device_id+'</b><br>Vel: '+(Number(last.speed||0).toFixed(1))+' km/h<br>'+last.timestamp);
    markers.push(m);
    document.getElementById('stats').innerText = 'Vel: '+(Number(last.speed||0).toFixed(1))+' km/h | Puntos: '+data.length+' | '+last.timestamp;
    map.setView([last.lat, last.lng], 16);
  }catch(e){ console.error(e); document.getElementById('stats').innerText='Error cargando: '+e.message }
}
setInterval(load, 4000);
document.getElementById('sel').addEventListener('change', load);
load();
</script>
</body>
</html>
  `);
}
