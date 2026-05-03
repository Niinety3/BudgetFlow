export function getCurrentTaxYear(): number {
  return getTaxYearForDate(new Date())
}

export function getTaxYearForDate(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-based
  const day = date.getDate()

  // Tax year starts April 6. Before April 6 => previous year's tax year.
  if (month < 4 || (month === 4 && day < 6)) {
    return year - 1
  }
  return year
}

export function getTaxYearMonths(taxYear: number): Array<{ month: number; year: number; label: string }> {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months: Array<{ month: number; year: number; label: string }> = []

  // April (4) through December (12) of taxYear
  for (let m = 4; m <= 12; m++) {
    const shortYear = String(taxYear).slice(2)
    months.push({ month: m, year: taxYear, label: `${monthNames[m - 1]} ${shortYear}` })
  }

  // January (1) through March (3) of taxYear+1
  for (let m = 1; m <= 3; m++) {
    const shortYear = String(taxYear + 1).slice(2)
    months.push({ month: m, year: taxYear + 1, label: `${monthNames[m - 1]} ${shortYear}` })
  }

  return months
}

export function getTaxYearDateRange(taxYear: number): { start: Date; end: Date; startStr: string; endStr: string } {
  const start = new Date(taxYear, 3, 6)
  const end = new Date(taxYear + 1, 3, 5)
  const startStr = `${taxYear}-04-06`
  const endStr = `${taxYear + 1}-04-05`
  return { start, end, startStr, endStr }
}

export function getMonthDateRange(month: number, year: number): { start: Date; end: Date; startStr: string; endStr: string } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0)
  // Build date strings directly to avoid timezone issues
  const startStr = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end, startStr, endStr }
}

export function formatTaxYear(taxYear: number): string {
  const nextYearShort = String(taxYear + 1).slice(2)
  return `${taxYear}/${nextYearShort}`
}
