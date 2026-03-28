import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { transaction_id, category_name, api_key } = await req.json()

    if (!transaction_id || !category_name || !api_key) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate API key
    const { data: settings } = await supabase
      .from('settings')
      .select('household_id')
      .eq('webhook_api_key', api_key)
      .single()

    if (!settings) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Find category by name
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('household_id', settings.household_id)
      .eq('name', category_name)
      .single()

    if (!category) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the transaction description for rule creation
    const { data: transaction } = await supabase
      .from('transactions')
      .select('description')
      .eq('id', transaction_id)
      .eq('household_id', settings.household_id)
      .single()

    if (!transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update transaction
    await supabase
      .from('transactions')
      .update({ category_id: category.id, needs_review: false })
      .eq('id', transaction_id)

    // Create keyword rule for future auto-categorisation
    const keyword = transaction.description.toLowerCase().trim()
    await supabase
      .from('category_rules')
      .upsert(
        {
          household_id: settings.household_id,
          keyword,
          category_id: category.id,
          priority: 50,
        },
        { onConflict: 'household_id,keyword' },
      )
      .select()

    // Bulk-update other matching uncategorised transactions
    await supabase
      .from('transactions')
      .update({ category_id: category.id, needs_review: false })
      .eq('household_id', settings.household_id)
      .eq('description', transaction.description)
      .is('category_id', null)

    return new Response(
      JSON.stringify({ status: 'ok', category: category_name }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
