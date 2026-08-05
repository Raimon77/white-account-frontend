import { CalendarRange } from "lucide-react";

type MonthFilterProps = {
  value: string;
  onChange: (value: string) => void;
};

export function MonthFilter({ value, onChange }: MonthFilterProps) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
      <CalendarRange size={17} className="shrink-0 text-blue-600" />
      <input
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Filtrer par mois"
        className="min-w-32 flex-1 bg-transparent py-2 text-sm text-slate-700 outline-none"
      />
      <button
        type="button"
        onClick={() => onChange("")}
        disabled={!value}
        title={value ? "Afficher tous les mois" : "Tous les mois sont affichés"}
        className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-default disabled:text-slate-400"
      >
        {value ? "Tous" : "Tous les mois"}
      </button>
    </div>
  );
}
