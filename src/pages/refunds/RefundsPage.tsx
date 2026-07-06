import axios from "axios";
import { open } from '@tauri-apps/plugin-shell';
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import api from "@/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Sale = {
  id: string;
  invoice_number?: string | null;
  client_name?: string | null;
  sale_date?: string | null;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  payment_status?: string | null;
  sale_status?: string | null;
};

type SaleItem = {
  id: string;
  product_id: string;
  product_name?: string;
  reference?: string;
  quantity: number | string;
  unit_price: number | string;
  total_price?: number | string | null;
};

type Refund = {
  id: string;
  sale_id: string;
  refund_number?: string | null;
  refund_date?: string | null;
  refund_type?: string | null;
  amount?: number | string | null;
  reason?: string | null;
  restore_stock?: boolean | null;
  refund_pdf_url?: string | null;
  invoice_number?: string | null;
  sale_date?: string | null;
  client_name?: string | null;
  created_by_name?: string | null;
  created_at?: string;
};

type RefundItem = {
  id?: string;
  refund_id?: string;
  sale_item_id?: string;
  product_id: string;
  product_name?: string;
  reference?: string;
  quantity: number | string;
  unit_price: number | string;
  total_price?: number | string | null;
};

type RefundDetails = {
  refund: Refund;
  items: RefundItem[];
};

type RefundFormData = {
  sale_id: string;
  refund_date: string;
  refund_type: string;
  reason: string;
  restore_stock: boolean;
  items: {
    product_id: string;
    sale_item_id: string;
    product_name?: string;
    max_quantity: number;
    quantity: string;
    unit_price: string;
    selected: boolean;
  }[];
};

const emptyForm: RefundFormData = {
  sale_id: "",
  refund_date: new Date().toISOString().slice(0, 10),
  refund_type: "standard",
  reason: "",
  restore_stock: true,
  items: [],
};

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

function getRefundNumber(refund: Refund) {
  return refund.refund_number || `AV-${refund.id.slice(0, 8)}`;
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

function getBackendOrigin() {
  const baseUrl = api.defaults.baseURL || window.location.origin;
  try {
    const url = new URL(baseUrl, window.location.origin);
    url.pathname = url.pathname.replace(/\/api\/?$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:5000";
  }
}

function buildBackendFileUrl(value: string) {
  const cleanValue = value.trim();
  if (/^https?:\/\//i.test(cleanValue)) {
    return cleanValue;
  }
  return `${getBackendOrigin()}${
    cleanValue.startsWith("/") ? cleanValue : `/${cleanValue}`
  }`;
}

function getPdfDownloadUrl(data: unknown): string | null {
  if (typeof data === "string") {
    return data.trim() || null;
  }
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const urlKeys = [
    "download_url",
    "refund_pdf_url",
    "pdf_url",
    "pdfUrl",
    "url",
    "file_url",
    "fileUrl",
  ];
  for (const key of urlKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  const nestedKeys = ["data", "refund", "result"];
  for (const key of nestedKeys) {
    const nestedUrl = getPdfDownloadUrl(record[key]);
    if (nestedUrl) return nestedUrl;
  }
  return null;
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

function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saleLoading, setSaleLoading] = useState(false);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<RefundFormData>(emptyForm);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<RefundDetails | null>(
    null
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [refundsResponse, salesResponse] = await Promise.all([
        api.get("/sale-refunds"),
        api.get("/sales"),
      ]);

      setRefunds(normalizeArray<Refund>(refundsResponse.data, "refunds"));
      // filter sales that have paid amount > 0 and are not cancelled
      const allSales = normalizeArray<Sale>(salesResponse.data, "sales");
      const eligibleSales = allSales.filter(
        (s) => s.sale_status !== "cancelled" && toNumber(s.amount_paid) > 0
      );
      setSales(eligibleSales);
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de charger les avoirs ou les factures."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((refund) => {
      const number = getRefundNumber(refund);
      const matchesSearch =
        number.toLowerCase().includes(search.toLowerCase()) ||
        (refund.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (refund.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (refund.reason || "").toLowerCase().includes(search.toLowerCase());

      return matchesSearch;
    });
  }, [refunds, search]);

  const stats = useMemo(() => {
    const total = refunds.reduce((sum, r) => sum + toNumber(r.amount), 0);
    const count = refunds.length;
    const restoredStockCount = refunds.filter((r) => r.restore_stock).length;

    return {
      total,
      count,
      restoredStockCount,
    };
  }, [refunds]);

  const formTotal = useMemo(() => {
    return formData.items
      .filter((it) => it.selected)
      .reduce((total, item) => {
        return total + Number(item.quantity || 0) * Number(item.unit_price || 0);
      }, 0);
  }, [formData.items]);

  function handleOpenCreate() {
    setFormData({
      sale_id: "",
      refund_date: new Date().toISOString().slice(0, 10),
      refund_type: "standard",
      reason: "",
      restore_stock: true,
      items: [],
    });
    setModalOpen(true);
  }

  async function handleSaleChange(saleId: string) {
    if (!saleId) return;
    try {
      setSaleLoading(true);
      setError("");
      // Fetch selected sale details to get its items
      const response = await api.get(`/sales/${saleId}`);
      const data = response.data as { sale: Sale; items: SaleItem[] };

      setFormData((prev) => ({
        ...prev,
        sale_id: saleId,
        items: data.items.map((it) => ({
          product_id: it.product_id,
          sale_item_id: it.id,
          product_name: it.product_name,
          max_quantity: toNumber(it.quantity),
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
          selected: true,
        })),
      }));
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors du chargement des articles de la facture."));
    } finally {
      setSaleLoading(false);
    }
  }

  function handleItemToggle(index: number) {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index].selected = !items[index].selected;
      return { ...prev, items };
    });
  }

  function handleItemChange(index: number, field: "quantity" | "unit_price", value: string) {
    setFormData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  async function handleOpenDetails(refund: Refund) {
    try {
      setDetailsLoadingId(refund.id);
      setError("");
      const response = await api.get(`/sale-refunds/${refund.id}`);
      setSelectedDetails(response.data as RefundDetails);
      setDetailsModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les détails de l'avoir."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!formData.sale_id) {
      setError("Veuillez sélectionner une facture.");
      return;
    }
    const selectedItems = formData.items.filter((it) => it.selected);
    if (selectedItems.length === 0) {
      setError("Veuillez sélectionner au moins un article à rembourser.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        sale_id: formData.sale_id,
        refund_date: formData.refund_date,
        refund_type: formData.refund_type,
        reason: formData.reason,
        restore_stock: formData.restore_stock,
        items: selectedItems.map((it) => ({
          product_id: it.product_id,
          sale_item_id: it.sale_item_id,
          quantity: toNumber(it.quantity),
          unit_price: toNumber(it.unit_price),
        })),
      };

      await api.post("/sale-refunds", payload);
      setModalOpen(false);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la création de l'avoir."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf(refund: Refund) {
    try {
      setPdfLoadingId(refund.id);
      setError("");

      // Backend supports ensure-pdf or pdf
      const response = await api.post(`/sale-refunds/${refund.id}/ensure-pdf`);
      const url = getPdfDownloadUrl(response.data);

      if (url) {
        open(buildBackendFileUrl(url));
      } else {
        setError("L'URL du PDF n'a pas été retournée par le serveur.");
      }
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la génération du PDF d'avoir."));
    } finally {
      setPdfLoadingId(null);
    }
  }

  async function handleDeleteRefund(id: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet avoir ? Attention : si l'avoir retournait des articles en stock, ces articles seront retirés du stock.")) return;

    try {
      setDeletingId(id);
      setError("");
      await api.delete(`/sale-refunds/${id}`);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la suppression de l'avoir."));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Avoirs & Remboursements</h2>
          <p className="mt-1 text-slate-500">
            Gestion des retours marchandises, avoirs clients et restitutions de stock.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 py-2 px-4 transition-all"
        >
          <Plus size={18} />
          Créer un avoir
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
              Total Avoirs Émis
            </CardTitle>
            <FileText className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatMoney(stats.total)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.count} avoirs au total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Avoirs avec Retour Stock
            </CardTitle>
            <Check className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats.restoredStockCount} avoirs
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Articles réintégrés dans le stock actif
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Ratio Avoirs / Ventes
            </CardTitle>
            <RefreshCcw className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.count > 0 ? `${((stats.total / 1000000) * 100).toFixed(1)}%` : "0.0%"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sur la base de l'activité globale
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
              placeholder="Rechercher par numéro d'avoir, facture, client..."
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
              <p className="text-sm text-slate-500">Chargement des avoirs...</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-slate-500">
              <FileText size={36} className="text-slate-300 mb-2" />
              <p className="text-sm">Aucun avoir trouvé</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-4">Numéro Avoir</th>
                      <th className="p-4">Facture Liée</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Date Avoir</th>
                      <th className="p-4">Réintégration Stock</th>
                      <th className="p-4">Motif</th>
                      <th className="p-4 text-right">Montant Avoir</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRefunds.map((refund) => (
                      <tr key={refund.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-semibold text-slate-900">
                          {getRefundNumber(refund)}
                        </td>
                        <td className="p-4 font-semibold text-slate-700">{refund.invoice_number}</td>
                        <td className="p-4">{refund.client_name}</td>
                        <td className="p-4">{formatDate(refund.refund_date)}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              refund.restore_stock
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-50 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {refund.restore_stock ? "Oui" : "Non"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs truncate">{refund.reason || "-"}</td>
                        <td className="p-4 text-right font-bold text-red-600 admin-only">
                          -{formatMoney(refund.amount)}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenDetails(refund)}
                              disabled={detailsLoadingId === refund.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                            >
                              {detailsLoadingId === refund.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleDownloadPdf(refund)}
                              disabled={pdfLoadingId === refund.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-blue-600 hover:bg-blue-50 border-blue-100"
                            >
                              {pdfLoadingId === refund.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleDeleteRefund(refund.id)}
                              disabled={deletingId === refund.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-red-600 hover:bg-red-50 border-red-100 admin-only"
                            >
                              {deletingId === refund.id ? (
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

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRefunds.map((refund) => (
                  <div key={refund.id} className="p-4 space-y-3 hover:bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {getRefundNumber(refund)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          refund.restore_stock
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        Stock: {refund.restore_stock ? "Oui" : "Non"}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="text-slate-700">
                        <span className="text-slate-400">Facture :</span> {refund.invoice_number}
                      </p>
                      <p className="text-slate-700">
                        <span className="text-slate-400">Client :</span> {refund.client_name}
                      </p>
                      <p className="text-slate-500 text-xs">Date : {formatDate(refund.refund_date)}</p>
                      {refund.reason && (
                        <p className="text-slate-500 text-xs italic">Motif : {refund.reason}</p>
                      )}
                      <p className="font-bold text-red-600 admin-only">
                        Montant : -{formatMoney(refund.amount)}
                      </p>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenDetails(refund)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border bg-white"
                      >
                        Détails
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDownloadPdf(refund)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border border-blue-100 bg-white text-blue-600"
                      >
                        PDF
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDeleteRefund(refund.id)}
                        disabled={deletingId === refund.id}
                        className="py-1.5 px-2.5 text-xs rounded-lg border border-red-100 bg-white text-red-600 admin-only"
                      >
                        {deletingId === refund.id ? "..." : "Supprimer"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Détails de l'Avoir {getRefundNumber(selectedDetails.refund)}
                </h3>
                <p className="text-xs text-slate-500">
                  Créé le {formatDate(selectedDetails.refund.refund_date)} par{" "}
                  {selectedDetails.refund.created_by_name || "l'administrateur"}
                </p>
              </div>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-xl border p-2 hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Refund info */}
            <div className="grid gap-4 sm:grid-cols-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-slate-400">Facture originale</p>
                <p className="font-semibold text-slate-900">{selectedDetails.refund.invoice_number}</p>
                <p className="text-xs text-slate-500">
                  Date de vente : {formatDate(selectedDetails.refund.sale_date)}
                </p>
                <p className="text-slate-500">Client : {selectedDetails.refund.client_name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type d'avoir :</span>
                  <span className="font-semibold capitalize text-slate-900">
                    {selectedDetails.refund.refund_type}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Réintégration Stock :</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedDetails.refund.restore_stock
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selectedDetails.refund.restore_stock ? "Oui" : "Non"}
                  </span>
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900">Articles retournés</h4>
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b font-medium text-slate-600">
                      <th className="p-3">Réf</th>
                      <th className="p-3">Produit</th>
                      <th className="p-3 text-center">Quantité retournée</th>
                      <th className="p-3 text-right">Prix Unitaire d'Avoir</th>
                      <th className="p-3 text-right">Total Avoir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedDetails.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-500 font-mono">{item.reference || "-"}</td>
                        <td className="p-3 font-medium text-slate-900">{item.product_name}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">{formatMoney(item.unit_price)}</td>
                        <td className="p-3 text-right font-bold text-red-600 admin-only">
                          -{formatMoney(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-2 bg-red-50 rounded-xl border border-red-100">
                <p className="text-sm font-bold text-red-700">
                  Montant total remboursé : {formatMoney(selectedDetails.refund.amount)}
                </p>
              </div>
            </div>

            {selectedDetails.refund.reason && (
              <div className="text-sm space-y-1">
                <p className="text-slate-400">Motif de l'avoir :</p>
                <p className="p-3 border rounded-xl bg-slate-50/50 text-slate-700 italic">
                  {selectedDetails.refund.reason}
                </p>
              </div>
            )}

            <div className="flex justify-end border-t pt-4">
              <Button
                variant="outline"
                onClick={() => handleDownloadPdf(selectedDetails.refund)}
                disabled={pdfLoadingId === selectedDetails.refund.id}
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium py-1.5 px-3 rounded-xl flex items-center gap-1.5"
              >
                <Download size={14} />
                Télécharger PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitForm}
            className="w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Créer un Avoir / Retour</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sélectionner la Facture de Vente</label>
                <select
                  required
                  value={formData.sale_id}
                  onChange={(e) => handleSaleChange(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une facture...</option>
                  {sales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.invoice_number || `FAC-${s.id.slice(0, 8)}`} - {s.client_name} (Payé : {formatMoney(s.amount_paid)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Date de l'Avoir</label>
                <input
                  type="date"
                  required
                  value={formData.refund_date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, refund_date: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Type d'Avoir</label>
                <select
                  value={formData.refund_type}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, refund_type: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Remboursement Standard</option>
                  <option value="commercial_gesture">Geste Commercial</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="restore_stock"
                  checked={formData.restore_stock}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, restore_stock: e.target.checked }))
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="restore_stock" className="text-xs font-semibold text-slate-700">
                  Réintégrer les articles retournés dans le stock
                </label>
              </div>
            </div>

            {/* Sale Items Checklist */}
            <div className="space-y-2 border-t pt-3">
              <h4 className="text-sm font-bold text-slate-900">Articles à retourner</h4>
              {saleLoading ? (
                <div className="flex py-6 justify-center items-center gap-2">
                  <Loader2 className="animate-spin text-blue-600" size={16} />
                  <p className="text-xs text-slate-500">Chargement des articles de la facture...</p>
                </div>
              ) : formData.items.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 italic text-center">
                  Veuillez sélectionner une facture pour afficher ses articles.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {formData.items.map((line, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 items-center border p-3 rounded-xl transition ${
                        line.selected ? "bg-red-50/20 border-red-100" : "bg-slate-50/50 border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={() => handleItemToggle(index)}
                        className="h-4 w-4 text-red-600 border-slate-300 rounded focus:ring-red-500 admin-only"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {line.product_name}
                        </p>
                        <p className="text-[10px] text-slate-400">Acheté : Qté {line.max_quantity}</p>
                      </div>

                      <div className="w-20 space-y-1">
                        <label className="text-[9px] font-semibold text-slate-400 uppercase">Qté retour</label>
                        <input
                          type="number"
                          min="1"
                          max={line.max_quantity}
                          disabled={!line.selected}
                          value={line.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                          className="w-full border rounded-lg px-2 py-1 text-xs text-center focus:outline-none bg-white disabled:bg-slate-100"
                        />
                      </div>

                      <div className="w-28 space-y-1">
                        <label className="text-[9px] font-semibold text-slate-400 uppercase">P.U. Avoir</label>
                        <input
                          type="number"
                          min="0"
                          disabled={!line.selected}
                          value={line.unit_price}
                          onChange={(e) => handleItemChange(index, "unit_price", e.target.value)}
                          className="w-full border rounded-lg px-2 py-1 text-xs text-right focus:outline-none bg-white font-semibold disabled:bg-slate-100"
                        />
                      </div>

                      <div className="w-28 space-y-1 text-right">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase">Sous-total</p>
                        <p className="py-1 px-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg admin-only">
                          -{formatMoney(line.selected ? Number(line.quantity || 0) * Number(line.unit_price || 0) : 0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes & Summary */}
            <div className="grid gap-4 sm:grid-cols-2 border-t pt-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Raison / Motif de l'avoir</label>
                <textarea
                  placeholder="Expliquer la raison du retour (ex: produit défectueux, erreur de commande...)"
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end items-end p-4 bg-red-50/50 rounded-xl border border-red-100/50 space-y-1">
                <p className="text-xs text-red-500">Montant total de l'avoir</p>
                <p className="text-2xl font-bold text-red-600 admin-only">-{formatMoney(formTotal)}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="py-2 px-4 rounded-xl text-sm"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Créer l'avoir
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default RefundsPage;
