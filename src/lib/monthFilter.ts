export function matchesMonth(
  dateValue: string | null | undefined,
  selectedMonth: string
) {
  if (!selectedMonth) return true;
  return dateValue?.slice(0, 7) === selectedMonth;
}
