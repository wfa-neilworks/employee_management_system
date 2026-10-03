import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify the caller is an authenticated staff user (not anon)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create a client with the caller's JWT to verify their account type
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser()
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check the caller is ADMIN or HR
    const { data: account, error: accountErr } = await supabaseUser
      .from('accounts')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (accountErr || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allowedTypes = ['ADMIN', 'HR']
    if (!allowedTypes.includes(account.account_type)) {
      return new Response(JSON.stringify({ error: 'Forbidden: only ADMIN or HR can send invites' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { email, employeeId, redirectTo } = await req.json()
    if (!email || !employeeId) {
      return new Response(JSON.stringify({ error: 'email and employeeId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role to send invite
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: redirectTo || `${Deno.env.get('SITE_URL')}/employee-signup` }
    )

    if (inviteErr) throw inviteErr

    // Pre-create the accounts record as EMPLOYEE linked to this employee
    const { error: accountInsertErr } = await supabaseAdmin
      .from('accounts')
      .upsert({
        id: inviteData.user.id,
        email: email,
        account_type: 'EMPLOYEE',
        employee_id: employeeId,
      }, { onConflict: 'id' })

    if (accountInsertErr) throw accountInsertErr

    // Save email on the employee record
    const { error: empUpdateErr } = await supabaseAdmin
      .from('employees')
      .update({ email })
      .eq('id', employeeId)

    if (empUpdateErr) throw empUpdateErr

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
