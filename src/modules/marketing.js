import { supabase } from '../lib/supabase.js'
export async function generarCampanaIA(prompt) {
  // Aquí conectarías con tu API de marketing IA
  console.log('Generando campaña con prompt:', prompt)
  return { texto: `Campaña generada para: ${prompt}` }
}
window.generarCampanaIA = generarCampanaIA
