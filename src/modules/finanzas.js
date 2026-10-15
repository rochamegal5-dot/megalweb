import { supabase } from '../lib/supabase.js'
export async function cargarResumenFinanciero() {
  const { data: ventas } = await supabase.from('ventas').select('total, created_at').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
  const total = ventas?.reduce((s,v) => s + (v.total||0), 0) || 0
  return { totalMes: total, cantidad: ventas?.length || 0 }
}
window.cargarResumenFinanciero = cargarResumenFinanciero
