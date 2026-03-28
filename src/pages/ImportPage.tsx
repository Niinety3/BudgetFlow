import { useState } from 'react'
import { FileDropZone } from '@/components/import/FileDropZone'
import { ImportPreview } from '@/components/import/ImportPreview'
import { ImportSummary } from '@/components/import/ImportSummary'
import { parseCSV, type BankType } from '@/lib/csv/parser'
import { categoriseTransaction } from '@/lib/csv/categoriser'
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
}

type Step = 'upload' | 'preview' | 'summary'

export default function ImportPage() {
  const { householdId } = useHousehold()
  const { categories, rules } = useCategories()
  const [step, setStep] = useState<Step>('upload')
  const [previewData, setPreviewData] = useState<{
    transactions: PreviewTransaction[]
    bankType: BankType
    incomeSkipped: number
    internalSkipped: number
  } | null>(null)
  const [summaryData, setSummaryData] = useState({
    imported: 0,
    duplicatesSkipped: 0,
    incomeSkipped: 0,
    uncategorised: 0,
  })
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleFileLoaded(csvText: string) {
    setError(null)
    const parsed = parseCSV(csvText)
    if (!parsed) {
      setError(
        'Could not detect bank format. Please check the CSV file is from Revolut or NatWest.',
      )
      return
    }

    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority)

    const transactions: PreviewTransaction[] = parsed.result.transactions.map(
      (t) => ({
        ...t,
        category_id: categoriseTransaction(t.description, sortedRules),
        who: 'shared' as const,
      }),
    )

    setPreviewData({
      transactions,
      bankType: parsed.bankType,
      incomeSkipped: parsed.result.incomeSkipped,
      internalSkipped: parsed.result.internalSkipped,
    })
    setStep('preview')
  }

  async function handleConfirm(transactions: PreviewTransaction[]) {
    if (!householdId) return
    setImporting(true)

    try {
      // Create import batch
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

      // Insert transactions one by one to catch duplicates
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

      // Update batch with counts
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
