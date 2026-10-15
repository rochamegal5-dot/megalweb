import { supabase } from '../lib/supabase.js'

export async function cargarClientes() {
  const { data, error } = await supabase.from('clientes').select('*').order('nombre')
  if (error) throw error
  return data
}

export async function buscarCliente(termino) {
  const { data } = await supabase.from('clientes').select('*').ilike('nombre', `%${termino}%`).limit(10)
  return data || []
}

window.cargarClientes = cargarClientes
window.buscarCliente = buscarCliente
