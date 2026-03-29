import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FileDropZone } from '@/components/import/FileDropZone'
import { ImportPreview } from '@/components/import/ImportPreview'
import { ImportSummary } from '@/components/import/ImportSummary'
import { parseCSV, type BankType } from '@/lib/csv/parser'
import type { SkippedTransaction, PotentialRefund } from '@/lib/csv/types'
import { categoriseTransaction } from '@/lib/csv/categoriser'
import { suggestCategory } from '@/lib/suggest-category'
import { useCategories } from '@/hooks/useCategories'
import { useHousehold } from '@/hooks/useHousehold'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PreviewTransaction {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest' | 'paypal'
  category_id: string | null
  who: 'michael' | 'wife' | 'shared'
  aiSuggested?: boolean
}

interface MatchedRefund {
  refund: PotentialRefund
  matchedTransaction: {
    id: string
    date: string
    description: string
    amount: number
  }
  status: 'pending' | 'confirmed' | 'skipped'
}

type Step = 'upload' | 'suggesting' | 'preview' | 'summary'

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY ?? ''

export default function ImportPage() {
  const { householdId } = useHousehold()
  const { categories, rules, addRule } = useCategories()
  const [step, setStep] = useState<Step>('upload')
  const [previewData, setPreviewData] = useState<{
    transactions: PreviewTransaction[]
    bankType: BankType
    incomeSkipped: number
    internalSkipped: number
    skippedTransactions: SkippedTransaction[]
  } | null>(null)
  const [summaryData, setSummaryData] = useState({
    imported: 0,
    duplicatesSkipped: 0,
    incomeSkipped: 0,
    uncategorised: 0,
  })
  const [matchedRefunds, setMatchedRefunds] = useState<MatchedRefund[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestProgress, setSuggestProgress] = useState({ done: 0, total: 0 })

  async function handleFileLoaded(csvText: string) {
    setError(null)
    const parsed = parseCSV(csvText)
    if (!parsed) {
      setError(
        'Could not detect bank format. Please check the CSV file is from Revolut or NatWest.',
      )
      return
    }

    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)
    const categoryNames = categories.map((c) => c.name)

    // First pass: apply keyword rules
    const transactions: PreviewTransaction[] = parsed.result.transactions.map(
      (t) => ({
        ...t,
        category_id: categoriseTransaction(t.description, sortedRules),
        who: 'shared' as const,
      }),
    )

    // Find uncategorised ones for AI suggestions
    const uncategorised = transactions.filter((t) => !t.category_id)

    if (uncategorised.length > 0 && groqApiKey) {
      setStep('suggesting')
      setSuggestProgress({ done: 0, total: uncategorised.length })

      // Deduplicate descriptions to avoid redundant API calls
      const uniqueDescs = [...new Set(uncategorised.map((t) => t.description))]
      const suggestionCache: Record<string, string | null> = {}

      let done = 0
      // Process in batches of 5 to avoid rate limits
      for (let i = 0; i < uniqueDescs.length; i += 5) {
        const batch = uniqueDescs.slice(i, i + 5)
        const results = await Promise.all(
          batch.map(async (desc) => {
            const suggestion = await suggestCategory(desc, categoryNames, groqApiKey)
            return { desc, suggestion }
          }),
        )
        for (const { desc, suggestion } of results) {
          suggestionCache[desc] = suggestion
        }
        done += batch.length
        setSuggestProgress({
          done: Math.min(done, uncategorised.length),
          total: uncategorised.length,
        })
      }

      // Apply suggestions
      for (const txn of transactions) {
        if (!txn.category_id && suggestionCache[txn.description]) {
          const suggestedName = suggestionCache[txn.description]
          const cat = categories.find((c) => c.name === suggestedName)
          if (cat) {
            txn.category_id = cat.id
            txn.aiSuggested = true
          }
        }
      }
    }

    // Match potential refunds against existing transactions in the database
    const refunds = parsed.result.potentialRefunds ?? []
    const matched: MatchedRefund[] = []
    if (refunds.length > 0 && householdId) {
      for (const refund of refunds) {
        const { data: matches } = await supabase
          .from('transactions')
          .select('id, date, description, amount')
          .eq('household_id', householdId)
          .ilike('description', `%${refund.description}%`)
          .order('date', { ascending: false })
          .limit(5)

        if (matches && matches.length > 0) {
          // Find the best match — prefer same amount, then closest amount
          const exactMatch = matches.find((m) => Math.abs(Number(m.amount) - refund.amount) < 0.01)
          const bestMatch = exactMatch ?? matches[0]
          matched.push({
            refund,
            matchedTransaction: {
              id: bestMatch.id,
              date: bestMatch.date,
              description: bestMatch.description,
              amount: Number(bestMatch.amount),
            },
            status: 'pending',
          })
        }
      }
    }
    setMatchedRefunds(matched)

    setPreviewData({
      transactions,
      bankType: parsed.bankType,
      incomeSkipped: parsed.result.incomeSkipped,
      internalSkipped: parsed.result.internalSkipped,
      skippedTransactions: parsed.result.skippedTransactions,
    })
    setStep('preview')
  }

  async function handleConfirm(transactions: PreviewTransaction[]) {
    if (!householdId) return
    setImporting(true)

    try {
      const { data: batch, error: batchError } = await supabase
        .from('import_batches')
        .insert({
          household_id: householdId,
          bank_type: previewData!.bankType,
          transactions_imported: 0,
          duplicates_skipped: 0,
        })
        .select('id')
        .single()

      if (batchError || !batch) throw batchError

      let imported = 0
      let duplicatesSkipped = 0

      for (const txn of transactions) {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            household_id: householdId,
            date: txn.date,
            description: txn.description,
            amount: txn.amount,
            category_id: txn.category_id,
            who: txn.who,
            source: txn.source,
            import_batch_id: batch.id,
          })

        if (insertError) {
          if (insertError.code === '23505') {
            duplicatesSkipped++
          } else {
            console.error('Insert error:', insertError.code, insertError.message, insertError.details, txn)
          }
        } else {
          imported++
        }
      }

      await supabase
        .from('import_batches')
        .update({
          transactions_imported: imported,
          duplicates_skipped: duplicatesSkipped,
        })
        .eq('id', batch.id)

      // Create rules for all categorised transactions (AI-suggested or manually set)
      // This ensures next import auto-categorises without needing AI again
      const seenDescriptions = new Set<string>()
      for (const txn of transactions) {
        if (txn.category_id && !seenDescriptions.has(txn.description)) {
          seenDescriptions.add(txn.description)
          try {
            await addRule({
              keyword: txn.description.toLowerCase().trim(),
              category_id: txn.category_id,
              priority: 50,
            })
          } catch {
            // Rule may already exist, that's fine
          }
        }
      }

      // Process confirmed refunds
      let refundsProcessed = 0
      for (const mr of matchedRefunds) {
        if (mr.status !== 'confirmed') continue
        const diff = mr.matchedTransaction.amount - mr.refund.amount
        if (diff < 0.01) {
          // Full refund — delete the original transaction
          await supabase.from('transactions').delete().eq('id', mr.matchedTransaction.id)
        } else {
          // Partial refund — reduce the original transaction amount
          await supabase.from('transactions').update({ amount: diff }).eq('id', mr.matchedTransaction.id)
        }
        refundsProcessed++
      }

      const uncategorised = transactions.filter((t) => !t.category_id).length

      setSummaryData({
        imported,
        duplicatesSkipped,
        incomeSkipped: previewData!.incomeSkipped,
        uncategorised,
      })
      setStep('summary')
    } catch (err) {
      console.error('Import error:', err)
      setError('Failed to import transactions. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  function handleCancel() {
    setPreviewData(null)
    setStep('upload')
  }

  function handleImportAnother() {
    setPreviewData(null)
    setSummaryData({ imported: 0, duplicatesSkipped: 0, incomeSkipped: 0, uncategorised: 0 })
    setStep('upload')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Import Transactions</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {step === 'upload' && <FileDropZone onFileLoaded={handleFileLoaded} />}

      {step === 'suggesting' && (
        <div className="flex flex-col items-center py-12 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium">Suggesting categories...</p>
          <p className="text-sm text-muted-foreground">
            Looking up {suggestProgress.total} unknown merchants ({suggestProgress.done} done)
          </p>
          <div className="w-64 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${suggestProgress.total > 0 ? (suggestProgress.done / suggestProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {step === 'preview' && previewData && (
        <>
          {importing && (
            <div className="mb-4 rounded-lg bg-muted p-3 text-center text-sm">
              Importing transactions...
            </div>
          )}
          {matchedRefunds.length > 0 && (
            <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-4 space-y-3">
              <h3 className="font-semibold text-sm">
                {matchedRefunds.filter((r) => r.status === 'pending').length} potential refund{matchedRefunds.filter((r) => r.status === 'pending').length !== 1 ? 's' : ''} found
              </h3>
              {matchedRefunds.map((mr, i) => (
                <div key={i} className="rounded-lg bg-card border border-border p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{mr.refund.description}</span>
                    <span className="text-sm font-semibold text-success">+{formatCurrency(mr.refund.amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Matches expense: {formatCurrency(mr.matchedTransaction.amount)} on {formatDate(mr.matchedTransaction.date)}
                    {mr.refund.amount < mr.matchedTransaction.amount
                      ? ` (partial refund — would reduce to ${formatCurrency(mr.matchedTransaction.amount - mr.refund.amount)})`
                      : ' (full refund — would delete expense)'}
                  </p>
                  {mr.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMatchedRefunds((prev) => prev.map((r, j) => j === i ? { ...r, status: 'confirmed' } : r))}
                        className="rounded-md bg-success px-3 py-1 text-xs font-medium text-success-foreground hover:bg-success/90"
                      >
                        Yes, it's a refund
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatchedRefunds((prev) => prev.map((r, j) => j === i ? { ...r, status: 'skipped' } : r))}
                        className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
                      >
                        No, skip
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs font-medium ${mr.status === 'confirmed' ? 'text-success' : 'text-muted-foreground'}`}>
                      {mr.status === 'confirmed' ? 'Will be refunded on import' : 'Skipped'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <ImportPreview
            transactions={previewData.transactions}
            categories={categories}
            bankType={previewData.bankType}
            incomeSkipped={previewData.incomeSkipped}
            internalSkipped={previewData.internalSkipped}
            skippedTransactions={previewData.skippedTransactions}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onRuleCreated={async (keyword, categoryId) => {
              try {
                await addRule({ keyword, category_id: categoryId, priority: 50 })
              } catch {
                // Rule may already exist
              }
            }}
          />
        </>
      )}

      {step === 'summary' && (
        <ImportSummary
          imported={summaryData.imported}
          duplicatesSkipped={summaryData.duplicatesSkipped}
          incomeSkipped={summaryData.incomeSkipped}
          uncategorised={summaryData.uncategorised}
          onImportAnother={handleImportAnother}
        />
      )}
    </div>
  )
}
