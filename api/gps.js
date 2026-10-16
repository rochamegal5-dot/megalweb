export const config = { runtime: 'edge' }

export default async function handler(req) {
  try {
    const u = new URL(req.url)
    const lat = parseFloat(u.searchParams.get('lat') || '-34.48')
    const lng = parseFloat(u.searchParams.get('lng') || '-54.33')
    const device_id = parseInt(u.searchParams.get('device_id') || '7')

    const SUPA_URL = 'https://pinodukthcnnwmizwsm.supabase.co'
    const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!SUPA_KEY) return new Response(JSON.stringify({ error: 'Falta SERVICE_ROLE_KEY en Vercel' }), { status: 500 })

    const r = await fetch(`${SUPA_URL}/rest/v1/gps_locations`, {
      method: 'POST',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ device_id, lat, lng, recorded_at: new Date().toISOString() })
    })

    const txt = await r.text()
    if (!r.ok) return new Response(JSON.stringify({ error: `Supabase ${r.status}: ${txt}` }), { status: 500 })

    return new Response(txt, { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, stack: e.toString() }), { status: 500 })
  }
}
