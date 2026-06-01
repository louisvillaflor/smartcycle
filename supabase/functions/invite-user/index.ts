import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface ReqPayload {
  email: string;
  role: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests smoothly
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extract the Authorization token forwarded from your user.js frontend
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }), 
        { status: 401, headers: corsHeaders }
      )
    }

    // 2. Initialize a standard Supabase client inside the container
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // 3. Authenticate the session against the system engine (Handles ES256/HS256 automatically)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token validation context' }), 
        { status: 401, headers: corsHeaders }
      )
    }

    // --- Beyond this line, your operating user session is safely validated ---
    console.log(`Authenticated request initiated by administrator: ${user.id}`)

    // 4. Read and validate incoming request body parameters
    const body = await req.json().catch(() => null)
    if (!body || !body.email || !body.role) {
      return new Response(
        JSON.stringify({ error: "Missing email or role parameter." }), 
        { status: 400, headers: corsHeaders } 
      )
    }
    const { email, role } = body as ReqPayload

    // 5. Initialize your Admin client to execute privileged actions
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, 
      { auth: { persistSession: false } }
    )

    // 6. Trigger the authentication invitation
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (inviteError) throw inviteError

    if (!authData || !authData.user) {
      throw new Error("Failed to process profile sync due to an invalid authentication response object.")
    }

    // 7. Sync user profile safely (omitting the sequence 'id' field so your DB sequence increments naturally)
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          auth_id: authData.user.id,   
          name: email.split('@')[0],
          type: role,
          category: 'Admin'
        }
      ])

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ success: true, message: `Invitation sent and profile records synced for ${email}!` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 400, headers: corsHeaders }
    )
  }
})