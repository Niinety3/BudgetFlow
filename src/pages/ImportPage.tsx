import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { FileDropZone } from '@/components/import/FileDropZone'
import { ImportPreview } from '@/components/import/ImportPreview'
import { ImportSummary } from '@/components/import/ImportSummary'
import { parseCSV, type BankType } from '@/lib/csv/parser'
import type { SkippedTransaction } from '@/lib/csv/types'
import { categoriseTransaction } from '@/lib/csv/categoriser'
import { suggestCategory } from '@/lib/suggest-category'
import { useCategories } from '@/hooks/useCategories'
import { useHousehold } from '@/hooks/useHousehold'
import { supabase } from '@/lib/supabase'

interface PreviewTransaction {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest'
  category_id: string | null
  who: 'michael' | 'wife' | 'shared'
  aiSuggested?: boolean
}

type Step = 'upload' | 'suggesting' | 'preview' | 'summary'

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY ?? ''

export default function ImportPage() {
  const { householdId } = useHousehold()
  const { categories, rules } = useCategories()
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
            console.error('Insert error:', insertError)
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
          <ImportPreview
            transactions={previewData.transactions}
            categories={categories}
            bankType={previewData.bankType}
            incomeSkipped={previewData.incomeSkipped}
            internalSkipped={previewData.internalSkipped}
            skippedTransactions={previewData.skippedTransactions}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
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
