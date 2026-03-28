# BudgetFlow — Product Requirements Document

## Overview

BudgetFlow is a household budgeting web app for Michael and his wife, designed around how they actually manage their money. The app replaces a Google Sheets setup that became too cumbersome. It needs to be mobile-friendly (both phones and laptops), shared between two users, and hosted on Supabase.

## The User

Michael is self-employed (sole trader) living on the Isle of Man with his wife and young child. He receives a monthly salary of £4,532.50 (after NI, before income tax). His wife does not currently earn. They are jointly assessed for IoM income tax. They are planning to move to a larger home later in 2025/2026, which will increase their rent from ~£975 to ~£1,400-£1,600.

## Core Concept: The Pay-Day Flow

On pay day, Michael immediately moves money out of his current account into savings before spending anything. The app must model this exact flow:

```
PAY DAY (£4,532.50 after NI)
│
├── 1. Tax set-aside → savings account
│   (Annual IoM income tax ÷ 12)
│
├── 2. 10% savings → savings account
│   (10% of pay AFTER tax set-aside, not gross)
│
├── 3. Rent gap → savings account
│   (Future rent - current rent, e.g. £1,600 - £975 = £625)
│
└── = WHAT'S LEFT TO LIVE ON
    (This is the real budget — everything else comes from here)
```

The total moved to savings = tax + 10% savings + rent gap. The Dashboard must show this breakdown clearly.

## Isle of Man Income Tax Calculator

The app must calculate IoM income tax (NOT UK tax — they are different). Current 2025/26 rates for jointly assessed couple:

- Personal allowance: £29,500 (jointly assessed)
- Standard rate band: £13,000 (jointly assessed)
- Standard rate: 10%
- Higher rate: 21%
- No capital gains tax, no inheritance tax on IoM

Calculation:
1. Taxable income = Gross annual profit - Personal allowance
2. Tax at standard rate = MIN(taxable income, £13,000) × 10%
3. Tax at higher rate = MAX(taxable income - £13,000, 0) × 21%
4. Total annual tax = standard rate tax + higher rate tax
5. Monthly set-aside = Total annual tax ÷ 12

NI is already deducted before Michael receives his pay, so it is NOT part of this calculation.

The user must be able to change:
- Annual profit (currently £60,000)
- Monthly take-home (currently £4,532.50)
- Tax rates should be editable for when they change year to year

## Tax Year

The IoM tax year runs 6 April to 5 April. The app should operate on a tax year basis (April to March), not calendar year. The current tax year is 2025/26 (April 2025 - March 2026).

## Spending Categories

Based on Michael's actual spending data over the past 22 months, these are the categories:

| Category | 6-Month Average | Notes |
|----------|----------------|-------|
| Rent / Mortgage | £975 | Will increase on move |
| Utilities | £267 | Electricity, Manx Telecom, etc. |
| Groceries / Food | £659 | Tesco, M&S Food, Shoprite, etc. |
| Shopping | £933 | Amazon, M&S, Boots, general retail — biggest variable cost |
| Transport / Fuel | £55 | Diesel, motorbike costs |
| Takeaway | £89 | Dominos, Pizza Hut, Indian restaurants |
| Health | £216 | Boots, dental, prescriptions — spiky and unpredictable |
| Entertainment | £72 | Netflix, cinema, gaming (flight sims, etc.) |
| Subscriptions | £24 | NordVPN, streaming services |
| Finance | £51 | Creation (credit), PayPal payments |
| Services | £29 | Voxi, Revolut Metal, NatWest account fees |
| Insurance | £47 | Car insurance, Aviva — irregular/annual |

Additional non-budget categories:
- **Special** — One-off costs paid FROM savings (not monthly budget). Examples: new glasses, car insurance lump sum, big one-offs. These must be tracked but shown separately from regular spending. They eat into savings, not the monthly budget.
- **Bank Transfers** — Transfers between own accounts (e.g. NatWest to Revolut). Must be ignored in all totals.
- **Uncategorised** — Default for transactions the auto-categoriser doesn't recognise.

Users must be able to add, edit, and remove categories.

## CSV Import

The app must support importing bank statement CSVs from two banks:

### Revolut Personal CSV
Columns: Type, Product, Started Date, Completed Date, Description, Amount, Fee, Currency, State, Balance

- Only import transactions where State = "completed"
- Skip transaction types: "topup", "exchange" (internal transfers)
- Negative amounts = money out (expenses) — import these
- Positive amounts = money in (income/refunds) — skip these
- Date format varies: YYYY-MM-DD HH:MM:SS or similar

### NatWest CSV
Columns: Date, Type, Description, Value, Balance, Account Name, Account Number

- Negative values = money out (expenses) — import these
- Positive values = money in — skip these
- Date format: DD/MM/YYYY

### Import Behaviour
- Drag-and-drop file upload (not copy-paste)
- Auto-detect which bank from the header row
- Auto-categorise using keyword matching rules
- Duplicate detection (same date + description + amount = skip)
- Show summary after import: X imported, X duplicates skipped, X income skipped, X uncategorised
- Support importing multiple months at once
- Support importing Revolut and NatWest in the same session

## Auto-Categorisation Rules

A keyword-to-category mapping system. When a transaction description contains a keyword, it gets assigned that category. Rules are checked in order — first match wins.

Default rules (based on Michael's actual transaction data):

### Rent / Mortgage
harmony homes, rent, landlord

### Utilities
manx utilities, manx telecom, electricity, electric, water, broadband, tv licence

### Groceries / Food
tesco, shoprite, m&s food, co-op, spar, aldi, lidl, iceland

### Shopping
amazon, m&s, marks and spencer, primark, tk maxx, argos, ebay, boots, wh smith, the works, waterstones, ikea, currys, john lewis, next, regatta, vertbaudet, post office

### Transport / Fuel
shell, bp, esso, petrol, diesel, fuel, parking, motorbike, steam packet, blackhorse

### Takeaway
dominos, pizza hut, just eat, deliveroo, uber eats, mcdonald, indian, takeaway, terrys tatos, 1886 bar

### Health
dental, doctor, pharmacy, beauty pie, vitamins, medicine

### Entertainment
palace cinema, villa marina, netflix, ifly, flight sim, hogwarts, inibuilds, spad.next, now tv

### Subscriptions
navigraph, nordvpn, adobe, spotify, disney+, amazon prime, lavazza

### Finance
creation, paypal - liverpool

### Services
voxi, lyca, sure - klaudia, revolut metal, natwest account

### Insurance
aviva, car insurance

### Special
specsavers, glasses, castletown golf

### Bank Transfers
revolut (when appearing in NatWest statement — these are transfers between own accounts)

Users must be able to add, edit, and remove rules. The rules should be keyword (case-insensitive partial match on description) → category.

Note on M&S: "m&s food" should match to Groceries before the generic "m&s" matches to Shopping. More specific rules must be checked first, or rules should be ordered with most specific first.

## Dashboard

The main view. Shows the full tax year (April to March) at a glance.

### Pay-Day Section (top)
For each month:
- Pay day amount (after NI)
- 1. Tax set-aside (from tax calculator)
- 2. 10% savings (10% of pay minus tax)
- 3. Rent gap (future rent - current rent, user-editable)
- Total to savings account
- **What's left to live on** (highlighted — this is the real number)

### Budget vs Actual
For each month, for each category:
- Budget limit (user sets these)
- Actual spending (from imported transactions)
- Over/under (budget minus actual)
- Total budget, total spent, remaining

### Specials Section (separate from budget)
- Specials this month
- Cumulative specials year to date
- Net savings (amount transferred to savings minus specials spent from savings)

### Summary Stats
- % of living money spent
- Remaining for the month

## Who Tracking

Each transaction can be tagged as: Michael, Wife, or Shared. Default to "Shared" on import. This is informational — no separate budgets per person, just visibility into who's spending what.

## Savings Goals

A simple goal tracker:
- Goal name (e.g. "Moving Fund", "Emergency Fund")
- Target amount
- Saved so far
- Remaining (calculated)
- Progress % (calculated)

Pre-filled suggestion: "Moving Fund (deposit + costs)" with £2,500 target.

## User Settings

Editable values that feed into calculations:
- Annual profit (before tax, after NI)
- Monthly take-home (after NI)
- Current rent
- Future rent (for rent gap calculation)
- Savings percentage (currently 10%)
- Tax year rates (personal allowance, standard band, standard rate, higher rate)

## Technical Requirements

### Stack
- **Frontend**: React (mobile-first responsive design)
- **Backend/Database**: Supabase (Postgres + Auth + Storage)
- **Hosting**: Supabase / Vercel / similar
- **Auth**: Supabase Auth — email login for Michael and his wife

### Data Model (suggested)

**users** — Supabase auth handles this

**households**
- id, name, created_at

**household_members**
- household_id, user_id, name

**settings**
- household_id, annual_profit, monthly_takehome, current_rent, future_rent, savings_pct, tax_personal_allowance, tax_standard_band, tax_standard_rate, tax_higher_rate, tax_year_start

**categories**
- id, household_id, name, is_budget_category (boolean — false for Special, Bank Transfers, Uncategorised), sort_order

**category_rules**
- id, household_id, keyword, category_id, priority (for ordering)

**transactions**
- id, household_id, date, description, amount, category_id, who (michael/wife/shared), source (revolut/natwest/manual), import_batch_id, created_at

**budget_limits**
- household_id, category_id, month (1-12), year, amount

**savings_goals**
- id, household_id, name, target_amount, saved_amount

**import_batches**
- id, household_id, bank_type, imported_at, transactions_imported, duplicates_skipped

### Key Behaviours
- All money values in GBP (£)
- Dates in DD/MM/YYYY format for display
- Tax year runs April to March
- Dashboard defaults to current tax year
- Mobile-first: must work well on phone screens
- Both users see the same data (household-level, not per-user)
- Localhost only for development — never push to GitHub without permission

### CSV Import Flow
1. User clicks "Import" and drops a CSV file
2. App auto-detects bank from header row
3. Parses transactions, applies category rules
4. Shows preview: "42 expenses found, 12 income skipped, 3 uncategorised"
5. User confirms import
6. Transactions written to database
7. Dashboard updates automatically

### What NOT to Build
- No bank API connections (Open Banking) — CSV import only
- No recurring transaction detection
- No bill splitting
- No multi-currency support
- No budget notifications/alerts (maybe later)

## Actual Spending Data (for reference)

From Michael's existing spreadsheet, last 6 months of actual spending:

| Month | Rent | Utilities | Groceries | Shopping | Transport | Takeaway | Health | Entertainment | Subscriptions | Finance | Services | Insurance | TOTAL |
|-------|------|-----------|-----------|----------|-----------|----------|--------|---------------|---------------|---------|----------|-----------|-------|
| Sep 25 | 950 | 515 | 603 | 920 | 3 | 31 | 143 | 181 | 2 | 66 | 30 | 0 | 3,444 |
| Oct 25 | 975 | 0 | 691 | 613 | 0 | 146 | 154 | 32 | 50 | 45 | 30 | 281 | 3,017 |
| Nov 25 | 975 | 261 | 566 | 967 | 41 | 57 | 77 | 32 | 2 | 45 | 34 | 0 | 3,057 |
| Dec 25 | 975 | 357 | 848 | 1,376 | 249 | 104 | 230 | 146 | 12 | 75 | 40 | 0 | 4,412 |
| Jan 26 | 1,025 | 261 | 515 | 946 | 35 | 104 | 440 | 40 | 76 | 75 | 35 | 0 | 3,552 |
| Feb 26 | 0 | 209 | 731 | 774 | 0 | 91 | 251 | 0 | 0 | 0 | 5 | 0 | 2,062 |

Monthly income: £4,532.50
Average regular spending: ~£3,257/month
After pay-day set-asides (~£1,451): ~£3,081 left to live on

This data can be used to set initial budget limits and validate the app is working correctly.
