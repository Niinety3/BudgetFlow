import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const groqApiKey = Deno.env.get('GROQ_API_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Ambiguous merchants that need manual review
const AMBIGUOUS_MERCHANTS: Record<string, string[]> = {
  'm&s': ['Groceries / Food', 'Shopping'],
  'marks and spencer': ['Groceries / Food', 'Shopping'],
  'boots': ['Health', 'Shopping'],
  'post office': ['Shopping', 'Services'],
  'amazon': ['Shopping', 'Entertainment', 'Subscriptions'],
}

function parseNotification(text: string): { merchant: string; amount: number } | null {
  // Pattern: "You paid £34.50 at M&S" or "Paid £8.50 at Costa Coffee"
  const patterns = [
    /(?:You )?[Pp]aid\s+£(\d+\.?\d*)\s+at\s+(.+?)(?:\s+with\s+[•*]+\d{4})?$/,
    /£(\d+\.?\d*)\s+(?:paid\s+)?(?:at|to)\s+(.+?)(?:\s+with\s+[•*]+\d{4})?$/,
    /(?:Payment|Charge)\s+of\s+£(\d+\.?\d*)\s+(?:at|to)\s+(.+?)$/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return {
        amount: parseFloat(match[1]),
        merchant: match[2].trim(),
      }
    }
  }
  return null
}

function extractCardDigits(text: string): string | null {
  const match = text.match(/with\s+[•*]+(\d{4})/)
  return match ? match[1] : null
}

function isAmbiguous(merchant: string): string[] | null {
  const lower = merchant.toLowerCase()
  for (const [keyword, categories] of Object.entries(AMBIGUOUS_MERCHANTS)) {
    if (lower.includes(keyword)) {
      return categories
    }
  }
  return null
}

async function suggestCategoryFromAI(merchant: string, categoryNames: string[]): Promise<string | null> {
  if (!groqApiKey) return null
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You categorise transactions. Given a merchant name, respond with ONLY the category name. Available: ${categoryNames.join(', ')}. If unsure, say "Uncategorised". Just the category name, nothing else.`,
          },
          { role: 'user', content: merchant },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const suggestion = data.choices?.[0]?.message?.content?.trim()
    return categoryNames.find((c) => c.toLowerCase() === suggestion?.toLowerCase()) ?? null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { text, merchant: rawMerchant, amount: rawAmount, card_digits, api_key } = await req.json()

    // Parse notification text OR accept pre-parsed merchant+amount
    let merchant: string
    let amount: number

    if (rawMerchant && rawAmount) {
      merchant = rawMerchant
      amount = parseFloat(rawAmount)
    } else if (text) {
      const parsed = parseNotification(text)
      if (!parsed) {
        return new Response(JSON.stringify({ error: 'Could not parse notification' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      merchant = parsed.merchant
      amount = parsed.amount
    } else {
      return new Response(JSON.stringify({ error: 'Missing text or merchant+amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const digits = card_digits ?? extractCardDigits(text ?? '')

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Look up household from API key
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('household_id, michael_card_digits, klaudia_card_digits')
      .eq('webhook_api_key', api_key)
      .single()

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const householdId = settings.household_id

    // Determine who
    let who = 'shared'
    if (digits) {
      if (settings.michael_card_digits && digits === settings.michael_card_digits) {
        who = 'michael'
      } else if (settings.klaudia_card_digits && digits === settings.klaudia_card_digits) {
        who = 'wife'
      }
    }

    // Auto-categorise: check keyword rules
    const { data: rules } = await supabase
      .from('category_rules')
      .select('keyword, category_id')
      .eq('household_id', householdId)
      .order('priority', { ascending: true })

    let categoryId: string | null = null
    let needsReview = false
    const merchantLower = merchant.toLowerCase()

    // Check ambiguous merchants first
    const ambiguousOptions = isAmbiguous(merchant)
    if (ambiguousOptions) {
      needsReview = true
    } else if (rules) {
      // Try keyword rules
      for (const rule of rules) {
        if (merchantLower.includes(rule.keyword.toLowerCase())) {
          categoryId = rule.category_id
          break
        }
      }

      // If no rule matched, try AI
      if (!categoryId) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .eq('household_id', householdId)

        if (categories) {
          const categoryNames = categories.map((c: { name: string }) => c.name)
          const aiSuggestion = await suggestCategoryFromAI(merchant, categoryNames)
          if (aiSuggestion) {
            const cat = categories.find((c: { name: string }) => c.name === aiSuggestion)
            if (cat) categoryId = cat.id
          }
        }
      }
    }

    // Insert transaction (ON CONFLICT DO NOTHING for dedup)
    const today = new Date().toISOString().slice(0, 10)
    const { data: inserted, error: insertError } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        date: today,
        description: merchant,
        amount,
        category_id: categoryId,
        who,
        source: 'notification',
        needs_review: needsReview,
      })
      .select('id')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ status: 'duplicate', merchant, amount }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw insertError
    }

    // If needs review, send FCM push notification
    if (needsReview && inserted) {
      const { data: tokens } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('household_id', householdId)

      if (tokens && tokens.length > 0) {
        const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')
        if (fcmServerKey) {
          for (const { token } of tokens) {
            await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Authorization': `key=${fcmServerKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: token,
                data: {
                  type: 'needs_review',
                  transaction_id: inserted.id,
                  merchant,
                  amount: amount.toString(),
                  categories: JSON.stringify(ambiguousOptions ?? []),
                },
                notification: {
                  title: 'BudgetFlow',
                  body: `${merchant} £${amount.toFixed(2)} — ${ambiguousOptions?.join(' or ')?}`,
                },
              }),
            })
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        transaction_id: inserted?.id,
        merchant,
        amount,
        category_id: categoryId,
        needs_review: needsReview,
        who,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
