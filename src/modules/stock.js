import { supabase } from '../lib/supabase.js'
export async function cargarStock() {
  const { data, error } = await supabase.from('stock').select('*, productos(nombre)').order('updated_at', {ascending:false})
  if (error) throw error
  return data
}
window.cargarStock = cargarStock
