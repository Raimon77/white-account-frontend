import { CalendarRange } from "lucide-react";

type MonthFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getMonthOptions() {
  const current = new Date();

  return Array.from({ length: 72 }, (_, offset) => {
    const date = new Date(current.getFullYear(), current.getMonth() - offset, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return {
      value: `${date.getFullYear()}-${month}`,
      label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
    };
  });
}

const MONTH_OPTIONS = getMonthOptions();

export function MonthFilter({ value, onChange }: MonthFilterProps) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
      <CalendarRange size={17} className="shrink-0 text-blue-600" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Filtrer par mois"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-700 outline-none"
      >
        <option value="">Tous les mois</option>
        {value && !MONTH_OPTIONS.some((month) => month.value === value) && (
          <option value={value}>{value}</option>
        )}
        {MONTH_OPTIONS.map((month) => (
          <option key={month.value} value={month.value}>{month.label}</option>
        ))}
      </select>
    </div>
  );
}
