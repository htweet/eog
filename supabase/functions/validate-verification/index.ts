import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Haversine distance in meters
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claimsData.claims.sub

    const body = await req.json()
    const { task_id, latitude, longitude, accuracy, device_timestamp } = body ?? {}

    if (
      typeof task_id !== 'string' ||
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      typeof device_timestamp !== 'string'
    ) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to read exact task coordinates (bypass fuzzy RLS)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select('id, latitude, longitude, voucher_id, status')
      .eq('id', task_id)
      .maybeSingle()

    if (taskErr || !task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (task.voucher_id !== userId) {
      return new Response(JSON.stringify({ error: 'Not assigned to this task' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (task.latitude == null || task.longitude == null) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Task has no coordinates' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const distance = distanceMeters(
      Number(task.latitude),
      Number(task.longitude),
      latitude,
      longitude
    )

    const MAX_METERS = 100
    const now = Date.now()
    const ts = new Date(device_timestamp).getTime()
    const clockSkewMs = Math.abs(now - ts)
    const TIMESTAMP_TOLERANCE_MS = 10 * 60 * 1000 // 10 minutes

    const withinRadius = distance <= MAX_METERS
    const timestampFresh = clockSkewMs <= TIMESTAMP_TOLERANCE_MS
    const valid = withinRadius && timestampFresh

    return new Response(
      JSON.stringify({
        valid,
        distance_meters: Math.round(distance),
        max_meters: MAX_METERS,
        within_radius: withinRadius,
        timestamp_fresh: timestampFresh,
        clock_skew_seconds: Math.round(clockSkewMs / 1000),
        accuracy_meters: accuracy ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
