import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Calendar,
  ChevronDown,
  Edit,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  label: string;
  amount: number | string;
  payment_method?: string | null;
  reference?: string | null;
  note?: string | null;
  created_by_name?: string | null;
  created_at?: string;
};

type ExpenseSummary = {
  period_key: string;
  total_expenses: number;
  by_category: {
    category: string;
    total_amount: number | string;
    expense_count: number | string;
  }[];
};

type ExpenseFormData = {
  expense_date: string;
  category: string;
  label: string;
  amount: string;
  payment_method: string;
  reference: string;
  note: string;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentPeriodKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

const emptyForm: ExpenseFormData = {
  expense_date: getTodayDate(),
  category: "Loyer",
  label: "",
  amount: "",
  payment_method: "cash",
  reference: "",
  note: "",
};

const CATEGORIES = [
  "Loyer",
  "Salaires",
  "Marketing & Publicité",
  "Transport & Déplacement",
  "Fournitures & Équipement",
  "Électricité & Eau",
  "Impôts & Taxes",
  "Autres Dépenses",
];

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

function formatMoney(value: number | string | null | undefined) {
  return `${toNumber(value).toLocaleString("fr-FR")} FCFA`;
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getBackendMessage(data: unknown): string | null {
  if (typeof data === "string") {
    return data.trim() || null;
  }
  if (Array.isArray(data)) {
    const messages = data
      .map((item) => getBackendMessage(item))
      .filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join(" ") : null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const directKeys = ["message", "error", "detail", "details"];
  for (const key of directKeys) {
    const message = getBackendMessage(record[key]);
    if (message) return message;
  }
  if (record.errors && typeof record.errors === "object") {
    const errors = record.errors as Record<string, unknown>;
    const messages = Object.entries(errors)
      .map(([field, value]) => {
        const message = getBackendMessage(value);
        return message ? `${field}: ${message}` : null;
      })
      .filter((message): message is string => Boolean(message));
    if (messages.length > 0) return messages.join(" ");
  }
  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return getBackendMessage(error.response?.data) || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function normalizeArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record[key])) return record[key] as T[];
    if (Array.isArray(record.data)) return record.data as T[];
  }
  return [];
}

function paymentMethodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    cash: "Espèces",
    wave: "Wave",
    orange_money: "Orange Money",
    bank_transfer: "Virement",
    card: "Carte",
    check: "Chèque",
    other: "Autre",
  };
  return labels[method || ""] || method || "-";
}

function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);

  const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey());
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseFormData>(emptyForm);

  async function loadExpenses() {
    try {
      setLoading(true);
      setError("");

      const params: Record<string, string> = { period_key: periodKey };
      if (categoryFilter !== "all") {
        params.category = categoryFilter;
      }

      const response = await api.get("/expenses", { params });
      setExpenses(normalizeArray<Expense>(response.data, "expenses"));
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les dépenses."));
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      setSummaryLoading(true);
      const response = await api.get("/expenses/summary", {
        params: { period_key: periodKey },
      });
      setSummary(response.data as ExpenseSummary);
    } catch (error) {
      // Ignored for now or logged to console
      console.error("Erreur résumé:", error);
    } finally {
      setSummaryLoading(false);
    }
  }

  function reloadAll() {
    void Promise.all([loadExpenses(), loadSummary()]);
  }

  useEffect(() => {
    reloadAll();
  }, [periodKey, categoryFilter]);

  const filteredExpenses = useMemo(() => {
    if (!search.trim()) return expenses;
    const keyword = search.trim().toLowerCase();

    return expenses.filter((e) => {
      return (
        e.label.toLowerCase().includes(keyword) ||
        (e.reference || "").toLowerCase().includes(keyword) ||
        (e.note || "").toLowerCase().includes(keyword) ||
        e.category.toLowerCase().includes(keyword)
      );
    });
  }, [expenses, search]);

  const totalPeriodExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + toNumber(e.amount), 0);
  }, [expenses]);

  function handleOpenCreate() {
    setEditingExpense(null);
    setFormData({
      expense_date: getTodayDate(),
      category: CATEGORIES[0],
      label: "",
      amount: "",
      payment_method: "cash",
      reference: "",
      note: "",
    });
    setModalOpen(true);
  }

  function handleOpenEdit(expense: Expense) {
    setEditingExpense(expense);
    setFormData({
      expense_date: expense.expense_date?.slice(0, 10) || getTodayDate(),
      category: expense.category,
      label: expense.label,
      amount: String(expense.amount),
      payment_method: expense.payment_method || "cash",
      reference: expense.reference || "",
      note: expense.note || "",
    });
    setModalOpen(true);
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (toNumber(formData.amount) <= 0) {
      setError("Le montant doit être supérieur à 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        amount: toNumber(formData.amount),
      };

      if (editingExpense) {
        await api.put(`/expenses/${editingExpense.id}`, payload);
      } else {
        await api.post("/expenses", payload);
      }

      setModalOpen(false);
      reloadAll();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de l'enregistrement de la dépense."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;

    try {
      setDeletingId(id);
      setError("");
      await api.delete(`/expenses/${id}`);
      reloadAll();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la suppression de la dépense."));
    } finally {
      setDeletingId(null);
    }
  }

  function handlePeriodChange(step: number) {
    const [year, month] = periodKey.split("-").map(Number);
    const date = new Date(year, month - 1 + step, 1);
    const newKey = date.toISOString().slice(0, 7);
    setPeriodKey(newKey);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dépenses</h2>
          <p className="mt-1 text-slate-500">
            Suivi des charges, salaires, loyers et autres frais de fonctionnement.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 py-2 px-4 transition-all"
        >
          <Plus size={18} />
          Enregistrer une dépense
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex justify-between items-start">
          <p className="font-medium">{error}</p>
          <button onClick={() => setError("")} className="text-red-700 hover:text-red-900">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Period Selector & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white border shadow-sm rounded-2xl md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Période d'activité
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <Button variant="outline" className="px-2.5 rounded-lg" onClick={() => handlePeriodChange(-1)}>
              &larr;
            </Button>
            <span className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              {periodKey}
            </span>
            <Button variant="outline" className="px-2.5 rounded-lg" onClick={() => handlePeriodChange(1)}>
              &rarr;
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Dépenses Mensuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-1.5">
              <Wallet className="h-5 w-5 text-red-500" />
              {formatMoney(totalPeriodExpenses)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pour le mois de {periodKey}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Nombre de transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {expenses.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Frais enregistrés cette période
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main layout with Summary breakdown and Table list */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Summary Breakdown by Category */}
        <Card className="bg-white border shadow-sm rounded-2xl lg:col-span-1 h-fit">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Répartition par catégorie</span>
              {summaryLoading && <Loader2 size={14} className="animate-spin text-slate-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {!summary || summary.by_category.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center italic">
                Aucune charge enregistrée pour cette période
              </p>
            ) : (
              <div className="space-y-3.5">
                {summary.by_category.map((cat, idx) => {
                  const percent =
                    summary.total_expenses > 0
                      ? (toNumber(cat.total_amount) / summary.total_expenses) * 100
                      : 0;

                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-800">{cat.category}</span>
                        <span className="text-slate-900 font-bold">
                          {formatMoney(cat.total_amount)} ({percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {cat.expense_count} transaction(s)
                      </p>
                    </div>
                  );
                })}

                <div className="border-t pt-3 flex justify-between font-bold text-sm text-slate-950">
                  <span>Total charges :</span>
                  <span>{formatMoney(summary.total_expenses)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: List of Expenses */}
        <Card className="bg-white border shadow-sm rounded-2xl lg:col-span-2 overflow-hidden">
          <div className="p-4 md:p-6 border-b flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par libellé, référence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les catégories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <Button
                variant="outline"
                onClick={reloadAll}
                className="p-2.5 rounded-xl border bg-white text-slate-700 shadow-sm"
              >
                <RefreshCcw size={16} />
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-500">Chargement des dépenses...</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-slate-500">
                <Wallet size={36} className="text-slate-300 mb-2" />
                <p className="text-sm">Aucune dépense sur cette période</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="p-4">Date</th>
                        <th className="p-4">Catégorie</th>
                        <th className="p-4">Libellé</th>
                        <th className="p-4">Paiement</th>
                        <th className="p-4 text-right">Montant</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4">{formatDate(expense.expense_date)}</td>
                          <td className="p-4 font-medium text-slate-900">{expense.category}</td>
                          <td className="p-4 text-slate-700">
                            <div>
                              <p className="font-semibold">{expense.label}</p>
                              {expense.note && <p className="text-xs text-slate-400 italic mt-0.5">{expense.note}</p>}
                            </div>
                          </td>
                          <td className="p-4 text-slate-500">
                            <div>
                              <p className="text-xs">{paymentMethodLabel(expense.payment_method)}</p>
                              {expense.reference && <p className="text-[10px] text-slate-400 font-mono mt-0.5">Réf: {expense.reference}</p>}
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-red-600">
                            -{formatMoney(expense.amount)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                variant="outline"
                                onClick={() => handleOpenEdit(expense)}
                                className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                              >
                                <Edit size={16} />
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => handleDeleteExpense(expense.id)}
                                disabled={deletingId === expense.id}
                                className="p-2 h-9 w-9 rounded-lg border bg-white text-red-600 hover:bg-red-50 border-red-100"
                              >
                                {deletingId === expense.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Trash2 size={16} />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards List */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 space-y-2.5 hover:bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{expense.category}</span>
                        <span className="text-xs text-slate-400">{formatDate(expense.expense_date)}</span>
                      </div>

                      <div className="text-sm space-y-0.5 text-slate-700">
                        <p className="font-semibold">{expense.label}</p>
                        <p className="text-xs text-slate-500">
                          Réglement : {paymentMethodLabel(expense.payment_method)}
                          {expense.reference && ` (${expense.reference})`}
                        </p>
                        {expense.note && <p className="text-xs italic text-slate-400">"{expense.note}"</p>}
                        <p className="font-bold text-red-600 text-base pt-1">
                          -{formatMoney(expense.amount)}
                        </p>
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenEdit(expense)}
                          className="py-1 px-2 text-xs rounded-lg border bg-white"
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="py-1 px-2 text-xs rounded-lg border border-red-100 text-red-600 bg-white"
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitForm}
            className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingExpense ? "Modifier la Dépense" : "Enregistrer une Dépense"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date de la dépense</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, expense_date: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, category: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Libellé / Désignation</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Facture CIE Boutique Principal, Achat ramettes..."
                  value={formData.label}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, label: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Montant (FCFA)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Montant..."
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, amount: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-red-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Mode de règlement</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, payment_method: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Espèces</option>
                    <option value="wave">Wave</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="bank_transfer">Virement Bancaire</option>
                    <option value="card">Carte bancaire</option>
                    <option value="check">Chèque</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Référence de paiement (Optionnelle)</label>
                <input
                  type="text"
                  placeholder="Ex: Numéro chèque, ID Wave..."
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, reference: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Note additionnelle / Commentaire</label>
                <textarea
                  placeholder="Informations complémentaires..."
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="py-1.5 px-3 text-xs rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {editingExpense ? "Enregistrer" : "Enregistrer la charge"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ExpensesPage;
