// Static merchant database for common UK/IoM merchants
const MERCHANT_DATABASE: Record<string, string> = {
  // Groceries
  'tesco': 'Groceries / Food',
  'sainsbury': 'Groceries / Food',
  'asda': 'Groceries / Food',
  'morrisons': 'Groceries / Food',
  'waitrose': 'Groceries / Food',
  'aldi': 'Groceries / Food',
  'lidl': 'Groceries / Food',
  'co-op': 'Groceries / Food',
  'spar': 'Groceries / Food',
  'iceland': 'Groceries / Food',
  'shoprite': 'Groceries / Food',
  'marks spencer food': 'Groceries / Food',
  'm&s food': 'Groceries / Food',
  'ocado': 'Groceries / Food',
  'farmfoods': 'Groceries / Food',
  'heron foods': 'Groceries / Food',
  'jack\'s': 'Groceries / Food',

  // Shopping
  'amazon': 'Shopping',
  'ebay': 'Shopping',
  'argos': 'Shopping',
  'currys': 'Shopping',
  'john lewis': 'Shopping',
  'ikea': 'Shopping',
  'primark': 'Shopping',
  'tk maxx': 'Shopping',
  'next': 'Shopping',
  'boots': 'Shopping',
  'superdrug': 'Shopping',
  'wilko': 'Shopping',
  'the range': 'Shopping',
  'b&m': 'Shopping',
  'home bargains': 'Shopping',
  'poundland': 'Shopping',
  'sports direct': 'Shopping',
  'jd sports': 'Shopping',
  'asos': 'Shopping',
  'shein': 'Shopping',
  'temu': 'Shopping',
  'aliexpress': 'Shopping',
  'etsy': 'Shopping',
  'apple.com': 'Shopping',
  'apple store': 'Shopping',
  'google play': 'Shopping',
  'wh smith': 'Shopping',
  'waterstones': 'Shopping',
  'the works': 'Shopping',
  'post office': 'Shopping',
  'regatta': 'Shopping',
  'vertbaudet': 'Shopping',
  'zara': 'Shopping',
  'h&m': 'Shopping',
  'uniqlo': 'Shopping',

  // Takeaway / Restaurants
  'dominos': 'Takeaway',
  'pizza hut': 'Takeaway',
  'just eat': 'Takeaway',
  'deliveroo': 'Takeaway',
  'uber eats': 'Takeaway',
  'mcdonald': 'Takeaway',
  'burger king': 'Takeaway',
  'kfc': 'Takeaway',
  'subway': 'Takeaway',
  'greggs': 'Takeaway',
  'costa': 'Takeaway',
  'starbucks': 'Takeaway',
  'pret': 'Takeaway',
  'nandos': 'Takeaway',
  'wagamama': 'Takeaway',
  'five guys': 'Takeaway',
  'papa johns': 'Takeaway',
  'chinese': 'Takeaway',
  'indian': 'Takeaway',
  'kebab': 'Takeaway',
  'fish and chips': 'Takeaway',
  'chippy': 'Takeaway',
  'cafe': 'Takeaway',
  'restaurant': 'Takeaway',
  'bakery': 'Takeaway',

  // Transport
  'shell': 'Transport / Fuel',
  'bp': 'Transport / Fuel',
  'esso': 'Transport / Fuel',
  'texaco': 'Transport / Fuel',
  'total': 'Transport / Fuel',
  'jet': 'Transport / Fuel',
  'petrol': 'Transport / Fuel',
  'diesel': 'Transport / Fuel',
  'parking': 'Transport / Fuel',
  'ncp': 'Transport / Fuel',
  'steam packet': 'Transport / Fuel',
  'uber': 'Transport / Fuel',
  'bolt': 'Transport / Fuel',
  'trainline': 'Transport / Fuel',
  'national rail': 'Transport / Fuel',

  // Utilities
  'manx utilities': 'Utilities',
  'manx telecom': 'Utilities',
  'british gas': 'Utilities',
  'edf': 'Utilities',
  'eon': 'Utilities',
  'octopus energy': 'Utilities',
  'scottish power': 'Utilities',
  'bt': 'Utilities',
  'sky': 'Utilities',
  'virgin media': 'Utilities',
  'three': 'Utilities',
  'ee': 'Utilities',
  'o2': 'Utilities',
  'vodafone': 'Utilities',
  'tv licence': 'Utilities',
  'water': 'Utilities',
  'broadband': 'Utilities',
  'electricity': 'Utilities',

  // Entertainment
  'netflix': 'Entertainment',
  'cinema': 'Entertainment',
  'vue': 'Entertainment',
  'cineworld': 'Entertainment',
  'odeon': 'Entertainment',
  'palace cinema': 'Entertainment',
  'spotify': 'Subscriptions',
  'disney': 'Subscriptions',
  'apple music': 'Subscriptions',
  'youtube': 'Subscriptions',
  'playstation': 'Entertainment',
  'xbox': 'Entertainment',
  'steam': 'Entertainment',
  'nintendo': 'Entertainment',

  // Subscriptions
  'nordvpn': 'Subscriptions',
  'adobe': 'Subscriptions',
  'amazon prime': 'Subscriptions',
  'navigraph': 'Subscriptions',
  'lavazza': 'Subscriptions',
  'audible': 'Subscriptions',
  'crunchyroll': 'Subscriptions',
  'now tv': 'Subscriptions',

  // Health
  'dental': 'Health',
  'dentist': 'Health',
  'pharmacy': 'Health',
  'doctor': 'Health',
  'gp': 'Health',
  'optician': 'Health',
  'specsavers': 'Health',
  'boots pharmacy': 'Health',
  'lloyds pharmacy': 'Health',
  'hospital': 'Health',
  'beauty pie': 'Health',
  'gym': 'Health',
  'fitness': 'Health',

  // Finance
  'creation': 'Finance',
  'paypal': 'Finance',
  'klarna': 'Finance',
  'clearpay': 'Finance',

  // Insurance
  'aviva': 'Insurance',
  'direct line': 'Insurance',
  'admiral': 'Insurance',
  'compare the market': 'Insurance',
  'insurance': 'Insurance',

  // Services
  'voxi': 'Services',
  'lyca': 'Services',
  'revolut metal': 'Services',
  'natwest account': 'Services',
}

/**
 * Try to match a description against the static merchant database
 */
export function suggestFromDatabase(description: string): string | null {
  const lower = description.toLowerCase()
  for (const [keyword, category] of Object.entries(MERCHANT_DATABASE)) {
    if (lower.includes(keyword)) {
      return category
    }
  }
  return null
}

/**
 * Use Groq API to suggest a category for an unknown merchant
 */
export async function suggestFromAI(
  description: string,
  categories: string[],
  groqApiKey: string,
): Promise<string | null> {
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
            content: `You are a transaction categoriser. Given a merchant/transaction description, respond with ONLY the category name that best matches. Available categories: ${categories.join(', ')}. If unsure, respond with "Uncategorised". Respond with just the category name, nothing else.`,
          },
          {
            role: 'user',
            content: `What category is this transaction: "${description}"`,
          },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    })

    if (!response.ok) return null

    const data = await response.json()
    const suggestion = data.choices?.[0]?.message?.content?.trim()

    // Verify the suggestion is actually one of our categories
    if (suggestion && categories.includes(suggestion)) {
      return suggestion
    }

    // Try fuzzy match
    if (suggestion) {
      const match = categories.find(
        (c) => c.toLowerCase() === suggestion.toLowerCase(),
      )
      if (match) return match
    }

    return null
  } catch {
    return null
  }
}

/**
 * Suggest a category: try static DB first, then AI
 */
export async function suggestCategory(
  description: string,
  categoryNames: string[],
  groqApiKey: string,
): Promise<string | null> {
  // Try static database first
  const dbSuggestion = suggestFromDatabase(description)
  if (dbSuggestion && categoryNames.includes(dbSuggestion)) {
    return dbSuggestion
  }

  // Fall back to AI
  return suggestFromAI(description, categoryNames, groqApiKey)
}
