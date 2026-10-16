// api/gps.js - Node runtime, no Edge
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const lat = parseFloat(req.query.lat || req.body?.lat || '-34.48')
    const lng = parseFloat(req.query.lng || req.body?.lng || '-54.33')
    const device_id = parseInt(req.query.device_id || req.body?.device_id || '7')

    const SUPA_URL = process.env.VITE_SUPABASE_URL || 'https://pinodukthcnnwmizwsm.supabase.co'
    const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!SUPA_KEY) return res.status(500).json({ error: 'Falta SERVICE_ROLE_KEY en Vercel ENV' })

    const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } })

    const { data, error } = await supabase.from('gps_locations').insert({
      device_id, lat, lng, recorded_at: new Date().toISOString()
    }).select().single()

    if (error) return res.status(500).json({ error: error.message, details: error })
    
    return res.status(200).json({ ok: true, data })

  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.toString() })
  }
}
