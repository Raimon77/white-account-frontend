import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BarChart3,
  Calendar,
  Check,
  Eye,
  Loader2,
  Lock,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Closing = {
  id: string;
  period_key: string;
  operation_month: number;
  operation_year: number;
  total_purchases: number | string;
  total_sales: number | string;
  total_expenses: number | string;
  total_profit: number | string;
  remaining_stock_value: number | string;
  remaining_stock_quantity: number | string;
  status: string;
  closed_by_name?: string | null;
  created_at?: string;
};

type ClosingFormData = {
  period_key: string;
};

function getTodayPeriodKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

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
    hour: "2-digit",
    minute: "2-digit",
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

function ClosingsPage() {
  const [closings, setClosings] = useState<Closing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<ClosingFormData>({
    period_key: getTodayPeriodKey(),
  });

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<Closing | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/closings");
      setClosings(normalizeArray<Closing>(response.data, "closings"));
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les clôtures."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const filteredClosings = useMemo(() => {
    if (!search.trim()) return closings;
    const keyword = search.trim().toLowerCase();

    return closings.filter((c) => {
      return (
        c.period_key.includes(keyword) ||
        String(c.operation_year).includes(keyword) ||
        (c.closed_by_name || "").toLowerCase().includes(keyword)
      );
    });
  }, [closings, search]);

  const stats = useMemo(() => {
    const count = closings.length;
    const totalSalesClosed = closings.reduce((sum, c) => sum + toNumber(c.total_sales), 0);
    const totalProfitClosed = closings.reduce((sum, c) => sum + toNumber(c.total_profit), 0);

    return {
      count,
      totalSalesClosed,
      totalProfitClosed,
    };
  }, [closings]);

  function handleOpenCreate() {
    setFormData({
      period_key: getTodayPeriodKey(),
    });
    setModalOpen(true);
  }

  async function handleOpenDetails(closing: Closing) {
    try {
      setError("");
      // Fetch details of closing
      const response = await api.get(`/closings/${closing.period_key}`);
      setSelectedDetails(response.data as Closing);
      setDetailsModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Erreur de chargement de la clôture."));
    }
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();

    if (!formData.period_key.trim()) {
      setError("Veuillez saisir une période valide.");
      return;
    }

    const matches = formData.period_key.match(/^\d{4}-\d{2}$/);
    if (!matches) {
      setError("La période doit être au format AAAA-MM (Ex: 2026-07).");
      return;
    }

    const checkExists = closings.some((c) => c.period_key === formData.period_key);
    if (checkExists) {
      setError("Ce mois est déjà clôturé.");
      return;
    }

    if (
      !window.confirm(
        `AVERTISSEMENT CRITIQUE :\n\nLa clôture du mois ${formData.period_key} va figer les performances comptables de la période.\n\nToutes les quantités de stock actif des produits seront réinitialisées à 0.\n\nSouhaitez-vous continuer ?`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post("/closings/close", {
        period_key: formData.period_key,
      });

      setModalOpen(false);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la clôture comptable."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteClosing(period_key: string) {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la clôture du mois ${period_key} ?\n\nATTENTION : Cette action va restaurer toutes les quantités en stock qui avaient été mises à zéro lors de cette clôture.`)) return;

    try {
      setDeletingId(period_key);
      setError("");
      await api.delete(`/closings/${period_key}`);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la suppression de la clôture."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clôtures Mensuelles</h2>
          <p className="mt-1 text-slate-500">
            Fermeture des mois comptables, calcul des bénéfices nets et archivage de la valeur de stock.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 py-2 px-4 transition-all"
        >
          <Lock size={18} />
          Clôturer un mois
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

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Mois Clôturés
            </CardTitle>
            <Calendar className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats.count} périodes fígées
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Historique des archives comptables
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Cumul Chiffre d'Affaires Clôturé
            </CardTitle>
            <Check className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(stats.totalSalesClosed)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Somme des ventes archivées
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Cumul Bénéfices Clôturés
            </CardTitle>
            <BarChart3 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(stats.totalProfitClosed)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Bénéfice net consolidé (Ventes - Achats - Charges)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="bg-white border shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4 md:p-6 border-b flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par mois (Ex: 2026)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            className="p-2.5 rounded-xl border bg-white text-slate-700 shadow-sm"
          >
            <RefreshCcw size={16} />
          </Button>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Chargement des clôtures...</p>
            </div>
          ) : filteredClosings.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-slate-500">
              <Lock size={36} className="text-slate-300 mb-2" />
              <p className="text-sm">Aucun mois clôturé trouvé</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="app-horizontal-scroll hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-4">Mois / Période</th>
                      <th className="p-4 text-right">Total Achats</th>
                      <th className="p-4 text-right">Total Ventes</th>
                      <th className="p-4 text-right">Total Dépenses</th>
                      <th className="p-4 text-right">Bénéfice Net</th>
                      <th className="p-4 text-right">Valeur Stock Clôturé</th>
                      <th className="p-4">Clôturé par</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClosings.map((closing) => (
                      <tr key={closing.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-bold text-slate-900">
                          {closing.period_key}
                        </td>
                        <td className="p-4 text-right text-slate-600">{formatMoney(closing.total_purchases)}</td>
                        <td className="p-4 text-right text-emerald-600 font-semibold">{formatMoney(closing.total_sales)}</td>
                        <td className="p-4 text-right text-red-500">{formatMoney(closing.total_expenses)}</td>
                        <td className={`p-4 text-right font-bold ${toNumber(closing.total_profit) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {formatMoney(closing.total_profit)}
                        </td>
                        <td className="p-4 text-right text-slate-700 font-medium">
                          {formatMoney(closing.remaining_stock_value)} ({closing.remaining_stock_quantity} pièces)
                        </td>
                        <td className="p-4 text-slate-500 text-xs">{closing.closed_by_name || "Admin"}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenDetails(closing)}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                            >
                              <Eye size={16} />
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleDeleteClosing(closing.period_key)}
                              disabled={deletingId === closing.period_key}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-red-600 hover:bg-red-50 border-red-100 admin-only"
                            >
                              {deletingId === closing.period_key ? (
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
                {filteredClosings.map((closing) => (
                  <div key={closing.id} className="p-4 space-y-2.5 hover:bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-base">{closing.period_key}</span>
                      <span className="text-xs text-slate-400">Par {closing.closed_by_name || "Admin"}</span>
                    </div>

                    <div className="text-sm grid grid-cols-2 gap-y-1 gap-x-4">
                      <p className="text-slate-500">Achats : <span className="font-semibold text-slate-800">{formatMoney(closing.total_purchases)}</span></p>
                      <p className="text-slate-500">Ventes : <span className="font-semibold text-emerald-600">{formatMoney(closing.total_sales)}</span></p>
                      <p className="text-slate-500">Dépenses : <span className="font-semibold text-red-500">{formatMoney(closing.total_expenses)}</span></p>
                      <p className="text-slate-500">Stock restant : <span className="font-semibold text-slate-800">{closing.remaining_stock_quantity} pcs</span></p>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2.5">
                      <p className="text-sm font-bold">
                        Bénéfice :{" "}
                        <span className={toNumber(closing.total_profit) >= 0 ? "text-emerald-700" : "text-red-700"}>
                          {formatMoney(closing.total_profit)}
                        </span>
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => handleOpenDetails(closing)}
                        className="py-1 px-2.5 text-xs rounded-lg border bg-white"
                      >
                        Voir détails
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDeleteClosing(closing.period_key)}
                        disabled={deletingId === closing.period_key}
                        className="py-1 px-2.5 text-xs rounded-lg border border-red-100 bg-white text-red-600 admin-only"
                      >
                        {deletingId === closing.period_key ? "..." : "Supprimer"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {detailsModalOpen && selectedDetails && (
        <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Synthèse Clôture {selectedDetails.period_key}
              </h3>
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mois clôturé :</span>
                  <span className="font-bold text-slate-900">{selectedDetails.period_key}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fait le :</span>
                  <span className="font-medium text-slate-800">{formatDate(selectedDetails.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Par l'utilisateur :</span>
                  <span className="font-medium text-slate-800">{selectedDetails.closed_by_name || "l'administrateur"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">Résultats Comptables</p>
                <div className="divide-y border rounded-xl overflow-hidden bg-white">
                  <div className="p-3 flex justify-between">
                    <span className="text-slate-600">Total Ventes (A) :</span>
                    <span className="font-semibold text-emerald-600">{formatMoney(selectedDetails.total_sales)}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="text-slate-600">Total Achats (B) :</span>
                    <span className="font-semibold text-slate-700">{formatMoney(selectedDetails.total_purchases)}</span>
                  </div>
                  <div className="p-3 flex justify-between">
                    <span className="text-slate-600">Total Dépenses charges (C) :</span>
                    <span className="font-semibold text-red-500">{formatMoney(selectedDetails.total_expenses)}</span>
                  </div>
                  <div className="p-3 flex justify-between bg-slate-50/50 font-bold text-base">
                    <span>Bénéfice Net (A - B - C) :</span>
                    <span className={toNumber(selectedDetails.total_profit) >= 0 ? "text-emerald-700" : "text-red-700"}>
                      {formatMoney(selectedDetails.total_profit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2">
                <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">Stock Restant (Sortie en fin de mois)</p>
                <div className="p-3 bg-blue-50/30 border border-blue-100 rounded-xl flex justify-between text-slate-800">
                  <span>Stock résiduel :</span>
                  <span className="font-bold">
                    {selectedDetails.remaining_stock_quantity} pièces ({formatMoney(selectedDetails.remaining_stock_value)})
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() => setDetailsModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-1.5 px-4 rounded-xl"
              >
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitForm}
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Fermeture et Clôture Mensuelle
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="p-3.5 border border-amber-200 bg-amber-50 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-bold">ATTENTION : ACTION COMPTABLE DÉCISIVE</p>
                <p>
                  Clôturer un mois vide les quantités en stock de tous les produits (remises à 0) pour archiver leur valeur comptable et figer le résultat du mois.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Mois à clôturer (Format AAAA-MM)
                </label>
                <input
                  type="month"
                  required
                  value={formData.period_key}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, period_key: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
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
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-4 rounded-xl flex items-center gap-1.5"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Lancer la Clôture
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ClosingsPage;
