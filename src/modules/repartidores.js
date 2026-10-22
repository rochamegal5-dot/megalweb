// src/modules/repartidores.js - Megal Rocha - Limpio - Carga desde Turso
let repartidoresCache = [];

export async function getRepartidores() {
  try {
    const res = await fetch('/api/repartidores');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    repartidoresCache = Array.isArray(data) ? data : [];
    return repartidoresCache;
  } catch (e) {
    console.error('Error cargando repartidores, usando fallback:', e.message);
    // Fallback si Turso falla - siempre devuelve algo para no romper JSON
    repartidoresCache = [
      { device_id: 7, nombre: 'Antonio - Equipo 7' },
      { device_id: 8, nombre: 'Jose - Equipo 8' }
    ];
    return repartidoresCache;
  }
}

export async function initRepartidores() {
  const data = await getRepartidores();
  
  // Busca TODOS los select que digan Vehículos o tengan "Todos" y los llena
  const allSelects = document.querySelectorAll('select');
  allSelects.forEach(sel => {
    const text = sel.parentElement?.innerText || sel.outerHTML;
    const isVehiculoSelect = text.includes('Vehículos') || text.includes('Vehiculos') || sel.id.toLowerCase().includes('vehiculo');
    const hasTodos = sel.innerHTML.includes('Todos') || sel.innerHTML.includes('todos');
    
    if (isVehiculoSelect || hasTodos) {
      const prevValue = sel.value;
      sel.innerHTML = '<option value="Todos">-- Todos --</option>';
      data.forEach(r => {
        const opt = document.createElement('option');
        opt.value = String(r.device_id);
        opt.textContent = `${r.device_id} - ${r.nombre}`;
        sel.appendChild(opt);
      });
      // Restaura valor previo si existía
      if (prevValue && [...sel.options].some(o => o.value === prevValue)) {
        sel.value = prevValue;
      }
    }
  });
}

// Para usar desde otros módulos
export function getRepartidorNombre(device_id) {
  const found = repartidoresCache.find(r => String(r.device_id) === String(device_id));
  return found ? found.nombre : `Equipo ${device_id}`;
}

// Auto-ejecuta cuando carga la página
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initRepartidores);
  // Reintentos por si el DOM tarda
  setTimeout(initRepartidores, 800);
  setTimeout(initRepartidores, 2500);
}

export default { initRepartidores, getRepartidores, getRepartidorNombre };
