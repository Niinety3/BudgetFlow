import { CheckCircle } from 'lucide-react'

interface ImportSummaryProps {
  imported: number
  duplicatesSkipped: number
  incomeSkipped: number
  uncategorised: number
  onImportAnother: () => void
}

export function ImportSummary({
  imported,
  duplicatesSkipped,
  incomeSkipped,
  uncategorised,
  onImportAnother,
}: ImportSummaryProps) {
  return (
    <div className="flex flex-col items-center py-8">
      <CheckCircle className="mb-4 h-16 w-16 text-success" />
      <h3 className="mb-6 text-xl font-semibold">Import Complete</h3>

      <div className="mb-8 w-full max-w-sm space-y-3">
        <div className="flex justify-between rounded-lg bg-card p-3 border border-border">
          <span className="text-muted-foreground">Transactions imported</span>
          <span className="font-semibold">{imported}</span>
        </div>
        {duplicatesSkipped > 0 && (
          <div className="flex justify-between rounded-lg bg-card p-3 border border-border">
            <span className="text-muted-foreground">Duplicates skipped</span>
            <span className="font-semibold">{duplicatesSkipped}</span>
          </div>
        )}
        <div className="flex justify-between rounded-lg bg-card p-3 border border-border">
          <span className="text-muted-foreground">Income skipped</span>
          <span className="font-semibold">{incomeSkipped}</span>
        </div>
        {uncategorised > 0 && (
          <div className="flex justify-between rounded-lg bg-card p-3 border border-border">
            <span className="text-muted-foreground">Uncategorised</span>
            <span className="font-semibold text-warning">{uncategorised}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onImportAnother}
        className="rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
      >
        Import Another
      </button>
    </div>
  )
}
