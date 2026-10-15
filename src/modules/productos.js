import { supabase } from '../lib/supabase.js'

export async function cargarProductos() {
  const { data, error } = await supabase.from('productos').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function crearProducto(producto) {
  const { data, error } = await supabase.from('productos').insert(producto).select().single()
  if (error) throw error
  return data
}

window.cargarProductos = cargarProductos
window.crearProducto = crearProducto
