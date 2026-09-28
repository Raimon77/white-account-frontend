import axios from "axios";
import { open } from '@tauri-apps/plugin-shell';
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  Download,
  Edit,
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
import { MonthFilter } from "@/components/filters/MonthFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { matchesMonth } from "@/lib/monthFilter";

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type Product = {
  id: string;
  reference: string;
  name: string;
  sale_price?: number | string | null;
  selling_price?: number | string | null;
  purchase_price?: number | string | null;
  purchase_cost?: number | string | null;
};

type Quote = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  quote_number?: string | null;
  quote_date?: string | null;
  valid_until?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  note?: string | null;
  converted_sale_id?: string | null;
  converted_invoice_number?: string | null;
  converted_sale_status?: string | null;
  quote_pdf_url?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
};

type QuoteItem = {
  id?: string;
  quote_id?: string;
  product_id: string;
  reference?: string;
  product_name?: string;
  quantity: number | string;
  unit_price: number | string;
  total_price?: number | string | null;
};

type QuoteDetails = {
  quote: Quote;
  items: QuoteItem[];
};

type QuoteLine = {
  product_id: string;
  quantity: string;
  unit_price: string;
};

type QuoteFormData = {
  client_id: string;
  quote_date: string;
  valid_until: string;
  status: string;
  note: string;
  items: QuoteLine[];
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getFutureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const emptyForm: QuoteFormData = {
  client_id: "",
  quote_date: getTodayDate(),
  valid_until: getFutureDate(30),
  status: "draft",
  note: "",
  items: [
    {
      product_id: "",
      quantity: "1",
      unit_price: "0",
    },
  ],
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

function getQuoteNumber(quote: Quote) {
  return quote.quote_number || `DEV-${quote.id.slice(0, 8)}`;
}

function getProductSalePrice(product?: Product) {
  if (!product) return 0;
  return toNumber(product.sale_price ?? product.selling_price);
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
    "quote_pdf_url",
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
  const nestedKeys = ["data", "quote", "result"];
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

function quoteStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    sent: "Envoyé",
    accepted: "Accepté",
    rejected: "Rejeté",
    expired: "Expiré",
  };
  return labels[status || ""] || status || "-";
}

function quoteStatusBadgeClass(status?: string | null) {
  if (status === "accepted") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (status === "sent") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (status === "rejected") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  if (status === "expired") {
    return "bg-orange-50 text-orange-700 border border-orange-200";
  }
  return "bg-slate-50 text-slate-700 border border-slate-200";
}

function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>(emptyForm);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<QuoteDetails | null>(
    null
  );

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [convertFormData, setConvertFormData] = useState({
    sale_date: getTodayDate(),
    amount_paid: "0",
    payment_method: "orange_money",
    subscription_label: "",
    next_subscription_date: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [quotesResponse, clientsResponse, productsResponse] =
        await Promise.all([
          api.get("/quotes"),
          api.get("/clients"),
          api.get("/products"),
        ]);

      setQuotes(normalizeArray<Quote>(quotesResponse.data, "quotes"));
      setClients(normalizeArray<Client>(clientsResponse.data, "clients"));
      setProducts(normalizeArray<Product>(productsResponse.data, "products"));
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de charger les devis, clients ou produits."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const number = getQuoteNumber(quote);
      const matchesSearch =
        number.toLowerCase().includes(search.toLowerCase()) ||
        (quote.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (quote.note || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || quote.status === statusFilter;

      return (
        matchesMonth(quote.quote_date, monthFilter) &&
        matchesSearch &&
        matchesStatus
      );
    });
  }, [quotes, search, statusFilter, monthFilter]);

  const stats = useMemo(() => {
    const activeQuotes = filteredQuotes;
    const total = activeQuotes.reduce(
      (sum, q) => sum + toNumber(q.total_amount),
      0
    );
    const accepted = activeQuotes
      .filter((q) => q.status === "accepted")
      .reduce((sum, q) => sum + toNumber(q.total_amount), 0);
    const pending = activeQuotes
      .filter((q) => q.status === "draft" || q.status === "sent")
      .reduce((sum, q) => sum + toNumber(q.total_amount), 0);
    const other = activeQuotes
      .filter((q) => q.status === "rejected" || q.status === "expired")
      .reduce((sum, q) => sum + toNumber(q.total_amount), 0);

    return {
      total,
      totalCount: activeQuotes.length,
      accepted,
      acceptedCount: activeQuotes.filter((q) => q.status === "accepted").length,
      pending,
      pendingCount: activeQuotes.filter(
        (q) => q.status === "draft" || q.status === "sent"
      ).length,
      other,
      otherCount: activeQuotes.filter(
        (q) => q.status === "rejected" || q.status === "expired"
      ).length,
    };
  }, [filteredQuotes]);

  const formTotal = useMemo(() => {
    return formData.items.reduce((total, item) => {
      return total + Number(item.quantity || 0) * Number(item.unit_price || 0);
    }, 0);
  }, [formData.items]);

  function handleOpenCreate() {
    setEditingQuote(null);
    setFormData({
      client_id: clients[0]?.id || "",
      quote_date: getTodayDate(),
      valid_until: getFutureDate(30),
      status: "draft",
      note: "",
      items: [
        {
          product_id: products[0]?.id || "",
          quantity: "1",
          unit_price: String(getProductSalePrice(products[0])),
        },
      ],
    });
    setModalOpen(true);
  }

  async function handleOpenEdit(quote: Quote) {
    try {
      setDetailsLoadingId(quote.id);
      setError("");
      const response = await api.get(`/quotes/${quote.id}`);
      const data = response.data as QuoteDetails;

      setEditingQuote(data.quote);
      setFormData({
        client_id: data.quote.client_id || "",
        quote_date: data.quote.quote_date?.slice(0, 10) || getTodayDate(),
        valid_until: data.quote.valid_until?.slice(0, 10) || getFutureDate(30),
        status: data.quote.status || "draft",
        note: data.quote.note || "",
        items: data.items.map((it) => ({
          product_id: it.product_id,
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
        })),
      });
      setModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les détails du devis."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function handleOpenDetails(quote: Quote) {
    try {
      setDetailsLoadingId(quote.id);
      setError("");
      const response = await api.get(`/quotes/${quote.id}`);
      setSelectedDetails(response.data as QuoteDetails);
      setDetailsModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les détails du devis."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  function handleAddLine() {
    const firstProduct = products[0];
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: firstProduct?.id || "",
          quantity: "1",
          unit_price: String(getProductSalePrice(firstProduct)),
        },
      ],
    }));
  }

  function handleRemoveLine(index: number) {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function handleLineChange(
    index: number,
    field: keyof QuoteLine,
    value: string
  ) {
    setFormData((prev) => {
      const items = [...prev.items];
      const current = { ...items[index] };

      if (field === "product_id") {
        current.product_id = value;
        const prod = products.find((p) => p.id === value);
        current.unit_price = String(getProductSalePrice(prod));
      } else {
        current[field] = value;
      }

      items[index] = current;
      return { ...prev, items };
    });
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!formData.client_id) {
      setError("Veuillez sélectionner un client.");
      return;
    }
    const hasEmptyProduct = formData.items.some((it) => !it.product_id);
    if (hasEmptyProduct) {
      setError("Veuillez sélectionner un produit pour chaque ligne.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...formData,
        items: formData.items.map((it) => ({
          product_id: it.product_id,
          quantity: toNumber(it.quantity),
          unit_price: toNumber(it.unit_price),
        })),
      };

      if (editingQuote) {
        await api.put(`/quotes/${editingQuote.id}`, payload);
      } else {
        await api.post("/quotes", payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de l'enregistrement du devis."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuote(id: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce devis ?")) return;

    try {
      setDeletingId(id);
      setError("");
      await api.delete(`/quotes/${id}`);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la suppression du devis."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadPdf(quote: Quote) {
    try {
      setPdfLoadingId(quote.id);
      setError("");

      const response = await api.post(`/quotes/${quote.id}/pdf`);
      const url = getPdfDownloadUrl(response.data);

      if (url) {
        open(buildBackendFileUrl(url));
      } else {
        setError("L'URL du PDF n'a pas été retournée par le serveur.");
      }
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la génération du PDF."));
    } finally {
      setPdfLoadingId(null);
    }
  }

  async function handleUpdateStatus(id: string, newStatus: string) {
    try {
      setStatusUpdatingId(id);
      setError("");
      await api.patch(`/quotes/${id}/status`, { status: newStatus });
      await loadData();
      if (selectedDetails && selectedDetails.quote.id === id) {
        const response = await api.get(`/quotes/${id}`);
        setSelectedDetails(response.data as QuoteDetails);
      }
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la mise à jour du statut."));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function handleOpenConvert(quote: Quote) {
    setConvertingQuote(quote);
    setConvertFormData({
      sale_date: getTodayDate(),
      amount_paid: String(quote.total_amount || 0),
      payment_method: "orange_money",
      subscription_label: "",
      next_subscription_date: "",
    });
    setConvertModalOpen(true);
  }

  async function handleConvertSubmit(e: FormEvent) {
    e.preventDefault();
    if (!convertingQuote) return;

    try {
      setConvertingId(convertingQuote.id);
      setError("");

      const payload = {
        sale_date: convertFormData.sale_date,
        amount_paid: toNumber(convertFormData.amount_paid),
        payment_method: convertFormData.payment_method,
        subscription_label: convertFormData.subscription_label || undefined,
        next_subscription_date: convertFormData.next_subscription_date || undefined,
      };

      await api.post(`/quotes/${convertingQuote.id}/convert-to-sale`, payload);

      setConvertModalOpen(false);
      setDetailsModalOpen(false);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la conversion du devis."));
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Devis</h2>
          <p className="mt-1 text-slate-500">
            Gestion, facturation et suivi de vos devis clients.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 py-2 px-4 transition-all"
        >
          <Plus size={18} />
          Créer un devis
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Devis
            </CardTitle>
            <FileText className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatMoney(stats.total)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalCount} devis au total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Devis Acceptés
            </CardTitle>
            <Check className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(stats.accepted)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.acceptedCount} devis acceptés
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              En Attente / Brouillons
            </CardTitle>
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin-slow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(stats.pending)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.pendingCount} devis en cours
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Refusés / Expirés
            </CardTitle>
            <X className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatMoney(stats.other)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.otherCount} devis inactifs
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
              placeholder="Rechercher par numéro, client, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <MonthFilter value={monthFilter} onChange={setMonthFilter} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="sent">Envoyé</option>
              <option value="accepted">Accepté</option>
              <option value="rejected">Rejeté</option>
              <option value="expired">Expiré</option>
            </select>

            <Button
              variant="outline"
              onClick={loadData}
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
              <p className="text-sm text-slate-500">Chargement des devis...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-slate-500">
              <FileText size={36} className="text-slate-300 mb-2" />
              <p className="text-sm">Aucun devis trouvé</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="app-horizontal-scroll hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-4">Numéro</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Date devis</th>
                      <th className="p-4">Validité</th>
                      <th className="p-4 text-right">Montant total</th>
                      <th className="p-4 text-center">Statut</th>
                      <th className="p-4 text-center">Facturé</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-semibold text-slate-900">
                          {getQuoteNumber(quote)}
                        </td>
                        <td className="p-4">{quote.client_name || "Client inconnu"}</td>
                        <td className="p-4">{formatDate(quote.quote_date)}</td>
                        <td className="p-4 text-slate-500">{formatDate(quote.valid_until)}</td>
                        <td className="p-4 text-right font-bold text-slate-950">
                          {formatMoney(quote.total_amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${quoteStatusBadgeClass(
                              quote.status
                            )}`}
                          >
                            {quoteStatusLabel(quote.status)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {quote.converted_sale_id ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                              {quote.converted_invoice_number || "Oui"}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">Non</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenDetails(quote)}
                              disabled={detailsLoadingId === quote.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                            >
                              {detailsLoadingId === quote.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleDownloadPdf(quote)}
                              disabled={pdfLoadingId === quote.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-blue-600 hover:bg-blue-50 border-blue-100"
                            >
                              {pdfLoadingId === quote.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                            </Button>

                            {!quote.converted_sale_id && (
                              <Button
                                variant="outline"
                                onClick={() => handleOpenEdit(quote)}
                                disabled={detailsLoadingId === quote.id}
                                className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                              >
                                <Edit size={16} />
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              onClick={() => handleDeleteQuote(quote.id)}
                              disabled={deletingId === quote.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-red-600 hover:bg-red-50 border-red-100 admin-only"
                            >
                              {deletingId === quote.id ? (
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
                {filteredQuotes.map((quote) => (
                  <div key={quote.id} className="p-4 space-y-3 hover:bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {getQuoteNumber(quote)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${quoteStatusBadgeClass(
                          quote.status
                        )}`}
                      >
                        {quoteStatusLabel(quote.status)}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="text-slate-700">
                        <span className="text-slate-400">Client :</span>{" "}
                        {quote.client_name || "Client inconnu"}
                      </p>
                      <p className="text-slate-500 text-xs">
                        Date : {formatDate(quote.quote_date)} | Validité :{" "}
                        {formatDate(quote.valid_until)}
                      </p>
                      <p className="font-bold text-slate-950">
                        Total : {formatMoney(quote.total_amount)}
                      </p>
                      {quote.converted_sale_id && (
                        <p className="text-xs text-emerald-600 font-medium">
                          Facturé : {quote.converted_invoice_number}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenDetails(quote)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border bg-white"
                      >
                        Détails
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDownloadPdf(quote)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border border-blue-100 bg-white text-blue-600"
                      >
                        PDF
                      </Button>

                      {!quote.converted_sale_id && (
                        <Button
                          variant="outline"
                          onClick={() => handleOpenEdit(quote)}
                          className="py-1.5 px-2.5 text-xs rounded-lg border bg-white"
                        >
                          Modifier
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => handleDeleteQuote(quote.id)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border border-red-100 bg-white text-red-600 admin-only"
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

      {/* Details Modal */}
      {detailsModalOpen && selectedDetails && (
        <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Détails du Devis {getQuoteNumber(selectedDetails.quote)}
                </h3>
                <p className="text-xs text-slate-500">
                  Créé le {formatDate(selectedDetails.quote.quote_date)} par{" "}
                  {selectedDetails.quote.created_by_name || "l'administrateur"}
                </p>
              </div>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-xl border p-2 hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quote details */}
            <div className="grid gap-4 sm:grid-cols-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-slate-400">Client</p>
                <p className="font-bold text-slate-900">
                  {selectedDetails.quote.client_name || "Client inconnu"}
                </p>
                {selectedDetails.quote.client_phone && (
                  <p className="text-xs text-slate-600">Tél : {selectedDetails.quote.client_phone}</p>
                )}
                {selectedDetails.quote.client_email && (
                  <p className="text-xs text-slate-600">Email : {selectedDetails.quote.client_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Statut devis :</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${quoteStatusBadgeClass(
                      selectedDetails.quote.status
                    )}`}
                  >
                    {quoteStatusLabel(selectedDetails.quote.status)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Valide jusqu'au :</span>
                  <span className="font-semibold text-slate-900">
                    {formatDate(selectedDetails.quote.valid_until)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">État de facturation :</span>
                  {selectedDetails.quote.converted_sale_id ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      Facturé ({selectedDetails.quote.converted_invoice_number})
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">Non facturé</span>
                  )}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900">Articles du devis</h4>
              <div className="app-horizontal-scroll overflow-x-auto rounded-xl border">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b font-medium text-slate-600">
                      <th className="p-3">Réf</th>
                      <th className="p-3">Produit</th>
                      <th className="p-3 text-center">Quantité</th>
                      <th className="p-3 text-right">Prix Unitaire</th>
                      <th className="p-3 text-right">Prix Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedDetails.items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-500 font-mono">{item.reference || "-"}</td>
                        <td className="p-3 font-medium text-slate-900">{item.product_name}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">{formatMoney(item.unit_price)}</td>
                        <td className="p-3 text-right font-bold">{formatMoney(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end p-2 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-sm font-bold text-slate-950">
                  Total : {formatMoney(selectedDetails.quote.total_amount)}
                </p>
              </div>
            </div>

            {selectedDetails.quote.note && (
              <div className="text-sm space-y-1">
                <p className="text-slate-400">Note interne / Observation :</p>
                <p className="p-3 border rounded-xl bg-slate-50/50 text-slate-700 italic">
                  {selectedDetails.quote.note}
                </p>
              </div>
            )}

            {/* Actions details */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex gap-2">
                {!selectedDetails.quote.converted_sale_id && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedDetails.quote.id, "accepted")}
                      disabled={statusUpdatingId === selectedDetails.quote.id}
                      className="border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5"
                    >
                      {statusUpdatingId === selectedDetails.quote.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Accepter devis
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedDetails.quote.id, "rejected")}
                      disabled={statusUpdatingId === selectedDetails.quote.id}
                      className="border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5 admin-only"
                    >
                      Refuser devis
                    </Button>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                {selectedDetails.quote.status === "accepted" &&
                  !selectedDetails.quote.converted_sale_id && (
                    <Button
                      onClick={() => handleOpenConvert(selectedDetails.quote)}
                      disabled={convertingId === selectedDetails.quote.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5"
                    >
                      {convertingId === selectedDetails.quote.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCcw size={14} />
                      )}
                      Convertir en Facture
                    </Button>
                  )}

                <Button
                  variant="outline"
                  onClick={() => handleDownloadPdf(selectedDetails.quote)}
                  disabled={pdfLoadingId === selectedDetails.quote.id}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium py-1.5 px-3 rounded-xl flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Télécharger PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {convertModalOpen && convertingQuote && (
        <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleConvertSubmit}
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Convertir en Facture ({getQuoteNumber(convertingQuote)})
              </h3>
              <button
                type="button"
                onClick={() => setConvertModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p className="text-slate-600">
                Vous êtes sur le point de convertir ce devis en facture finale de vente. Le stock sera déduit pour chaque produit.
              </p>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-blue-800">Résumé financier :</p>
                <p className="text-blue-900">Total facture : {formatMoney(convertingQuote.total_amount)}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Date de la facture
                </label>
                <input
                  type="date"
                  required
                  value={convertFormData.sale_date}
                  onChange={(e) =>
                    setConvertFormData((p) => ({ ...p, sale_date: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Acompte / Montant payé (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  max={Number(convertingQuote.total_amount || 0)}
                  value={convertFormData.amount_paid}
                  onChange={(e) =>
                    setConvertFormData((p) => ({ ...p, amount_paid: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Mode de paiement
                </label>
                <select
                  value={convertFormData.payment_method}
                  onChange={(e) =>
                    setConvertFormData((p) => ({ ...p, payment_method: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Espèces</option>
                  <option value="wave">Wave</option>
                  <option value="orange_money">Orange Money</option>
                  <option value="bank_transfer">Virement Bancaire</option>
                  <option value="card">Carte bancaire</option>
                  <option value="check">Chèque</option>
                </select>
              </div>

              <div className="border-t pt-2 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">
                  Optionnel : Paramètres d'Abonnement
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-700">
                      Libellé Abonnement
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Mensuel, Trimestriel"
                      value={convertFormData.subscription_label}
                      onChange={(e) =>
                        setConvertFormData((p) => ({
                          ...p,
                          subscription_label: e.target.value,
                        }))
                      }
                      className="w-full border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-700">
                      Prochaine facturation
                    </label>
                    <input
                      type="date"
                      value={convertFormData.next_subscription_date}
                      onChange={(e) =>
                        setConvertFormData((p) => ({
                          ...p,
                          next_subscription_date: e.target.value,
                        }))
                      }
                      className="w-full border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConvertModalOpen(false)}
                className="py-1.5 px-3 text-xs rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={convertingId === convertingQuote.id}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1"
              >
                {convertingId === convertingQuote.id && (
                  <Loader2 size={12} className="animate-spin" />
                )}
                Confirmer la facturation
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {modalOpen && (
        <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-6 lg:p-10">
          <form
            onSubmit={handleSubmitForm}
            className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl space-y-3 overflow-y-auto rounded-2xl border bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:p-5"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingQuote ? "Modifier le Devis" : "Créer un Devis"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Client</label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, client_id: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Sélectionner un client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date Devis</label>
                  <input
                    type="date"
                    required
                    value={formData.quote_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, quote_date: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Validité</label>
                  <input
                    type="date"
                    required
                    value={formData.valid_until}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, valid_until: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, status: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Brouillon</option>
                  <option value="sent">Envoyé</option>
                  <option value="accepted">Accepté</option>
                  <option value="rejected">Rejeté</option>
                  <option value="expired">Expiré</option>
                </select>
              </div>
            </div>

            {/* Form Items Grid */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-sm font-bold text-slate-900">Articles du devis</h4>
                <Button
                  type="button"
                  onClick={handleAddLine}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg py-1.5 px-3 flex items-center gap-1"
                >
                  <Plus size={14} /> Ajouter une ligne
                </Button>
              </div>

              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {formData.items.map((line, index) => (
                  <div key={index} className="grid gap-2 rounded-xl border bg-slate-50/50 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_7rem_auto] sm:items-end">
                    <div className="min-w-0 space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">Produit</label>
                      <select
                        value={line.product_id}
                        onChange={(e) => handleLineChange(index, "product_id", e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
                      >
                        <option value="" disabled>Produit...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.reference})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">Quantité</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) => handleLineChange(index, "quantity", e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">Prix unitaire (FCFA)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={line.unit_price}
                        onChange={(e) => handleLineChange(index, "unit_price", e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none font-semibold text-slate-900"
                      />
                    </div>

                    <div className="space-y-1 text-right">
                      <p className="text-[10px] font-semibold text-slate-400">Total Ligne</p>
                      <p className="py-1.5 px-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-lg">
                        {formatMoney(Number(line.quantity || 0) * Number(line.unit_price || 0))}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={formData.items.length <= 1}
                      onClick={() => handleRemoveLine(index)}
                      className="justify-self-end rounded-lg border p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 admin-only"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Summary */}
            <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Note interne</label>
                <textarea
                  placeholder="Note affichée sur le devis..."
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col items-end justify-end space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Montant total calculé</p>
                <p className="text-2xl font-bold text-slate-900">{formatMoney(formTotal)}</p>
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl flex items-center gap-1.5"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingQuote ? "Enregistrer" : "Créer le devis"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default QuotesPage;
