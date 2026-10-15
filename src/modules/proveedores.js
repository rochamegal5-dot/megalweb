import { supabase } from '../lib/supabase.js'
export async function cargarProveedores() {
  const { data } = await supabase.from('proveedores').select('*')
  return data || []
}
window.cargarProveedores = cargarProveedores
