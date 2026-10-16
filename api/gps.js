export const config = { runtime: 'edge' }
export default async function handler(req) {
  return new Response(JSON.stringify({ ok: true, msg: 'Vercel OK, DB liberada a 13 MB' }), 
  { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
}
