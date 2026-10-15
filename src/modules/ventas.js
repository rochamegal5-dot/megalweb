import { supabase } from '../lib/supabase.js'

export async function crearVenta(venta, items) {
  const { data: ventaData, error: ventaError } = await supabase.from('ventas').insert(venta).select().single()
  if (ventaError) throw ventaError
  
  const itemsConVenta = items.map(i => ({ ...i, venta_id: ventaData.id }))
  const { error: itemsError } = await supabase.from('venta_items').insert(itemsConVenta)
  if (itemsError) throw itemsError
  
  return ventaData
}

export async function cargarVentas() {
  const { data } = await supabase.from('ventas').select('*, clientes(nombre), repartidores(nombre)').order('created_at', {ascending:false}).limit(50)
  return data || []
}
window.crearVenta = crearVenta
window.cargarVentas = cargarVentas
