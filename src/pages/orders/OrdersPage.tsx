import axios from "axios";
import { open } from '@tauri-apps/plugin-shell';
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Check,
  ClipboardList,
  Download,
  Edit,
  Eye,
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

type Order = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  order_number?: string | null;
  order_date?: string | null;
  expected_delivery_date?: string | null;
  customer_reference?: string | null;
  total_amount?: number | string | null;
  status?: string | null;
  note?: string | null;
  quote_id?: string | null;
  quote_number?: string | null;
  converted_sale_id?: string | null;
  converted_invoice_number?: string | null;
  converted_sale_status?: string | null;
  order_pdf_url?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at?: string;
};

type OrderItem = {
  id?: string;
  customer_order_id?: string;
  product_id: string;
  reference?: string;
  product_name?: string;
  quantity: number | string;
  unit_price: number | string;
  total_price?: number | string | null;
};

type OrderDetails = {
  order: Order;
  items: OrderItem[];
};

type OrderLine = {
  product_id: string;
  quantity: string;
  unit_price: string;
};

type OrderFormData = {
  client_id: string;
  order_date: string;
  expected_delivery_date: string;
  customer_reference: string;
  status: string;
  note: string;
  items: OrderLine[];
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getFutureDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const emptyForm: OrderFormData = {
  client_id: "",
  order_date: getTodayDate(),
  expected_delivery_date: getFutureDate(7),
  customer_reference: "",
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

function getOrderNumber(order: Order) {
  return order.order_number || `BC-${order.id.slice(0, 8)}`;
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
    "order_pdf_url",
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
  const nestedKeys = ["data", "order", "result"];
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

function orderStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    draft: "Brouillon",
    confirmed: "Confirmé",
    cancelled: "Annulé",
    converted: "Facturé",
  };
  return labels[status || ""] || status || "-";
}

function orderStatusBadgeClass(status?: string | null) {
  if (status === "converted") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (status === "confirmed") {
    return "bg-blue-50 text-blue-700 border border-blue-200";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-700 border border-red-200";
  }
  return "bg-slate-50 text-slate-700 border border-slate-200";
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<OrderFormData>(emptyForm);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<OrderDetails | null>(
    null
  );

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertingOrder, setConvertingOrder] = useState<Order | null>(null);
  const [convertFormData, setConvertFormData] = useState({
    sale_date: getTodayDate(),
    amount_paid: "0",
    payment_method: "cash",
    subscription_label: "",
    next_subscription_date: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [ordersResponse, clientsResponse, productsResponse] =
        await Promise.all([
          api.get("/customer-orders"),
          api.get("/clients"),
          api.get("/products"),
        ]);

      setOrders(normalizeArray<Order>(ordersResponse.data, "orders"));
      setClients(normalizeArray<Client>(clientsResponse.data, "clients"));
      setProducts(normalizeArray<Product>(productsResponse.data, "products"));
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de charger les bons de commande, clients ou produits."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const number = getOrderNumber(order);
      const matchesSearch =
        number.toLowerCase().includes(search.toLowerCase()) ||
        (order.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (order.customer_reference || "").toLowerCase().includes(search.toLowerCase()) ||
        (order.note || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.reduce((sum, o) => sum + toNumber(o.total_amount), 0);
    const converted = orders
      .filter((o) => o.status === "converted")
      .reduce((sum, o) => sum + toNumber(o.total_amount), 0);
    const confirmed = orders
      .filter((o) => o.status === "confirmed")
      .reduce((sum, o) => sum + toNumber(o.total_amount), 0);
    const pending = orders
      .filter((o) => o.status === "draft" || o.status === "cancelled")
      .reduce((sum, o) => sum + toNumber(o.total_amount), 0);

    return {
      total,
      totalCount: orders.length,
      converted,
      convertedCount: orders.filter((o) => o.status === "converted").length,
      confirmed,
      confirmedCount: orders.filter((o) => o.status === "confirmed").length,
      pending,
      pendingCount: orders.filter((o) => o.status === "draft" || o.status === "cancelled").length,
    };
  }, [orders]);

  const formTotal = useMemo(() => {
    return formData.items.reduce((total, item) => {
      return total + Number(item.quantity || 0) * Number(item.unit_price || 0);
    }, 0);
  }, [formData.items]);

  function handleOpenCreate() {
    setEditingOrder(null);
    setFormData({
      client_id: clients[0]?.id || "",
      order_date: getTodayDate(),
      expected_delivery_date: getFutureDate(7),
      customer_reference: "",
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

  async function handleOpenEdit(order: Order) {
    try {
      setDetailsLoadingId(order.id);
      setError("");
      const response = await api.get(`/customer-orders/${order.id}`);
      const data = response.data as OrderDetails;

      setEditingOrder(data.order);
      setFormData({
        client_id: data.order.client_id || "",
        order_date: data.order.order_date?.slice(0, 10) || getTodayDate(),
        expected_delivery_date: data.order.expected_delivery_date?.slice(0, 10) || getFutureDate(7),
        customer_reference: data.order.customer_reference || "",
        status: data.order.status || "draft",
        note: data.order.note || "",
        items: data.items.map((it) => ({
          product_id: it.product_id,
          quantity: String(it.quantity),
          unit_price: String(it.unit_price),
        })),
      });
      setModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les détails du bon de commande."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function handleOpenDetails(order: Order) {
    try {
      setDetailsLoadingId(order.id);
      setError("");
      const response = await api.get(`/customer-orders/${order.id}`);
      setSelectedDetails(response.data as OrderDetails);
      setDetailsModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les détails du bon de commande."));
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
    field: keyof OrderLine,
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

      if (editingOrder) {
        await api.put(`/customer-orders/${editingOrder.id}`, payload);
      } else {
        await api.post("/customer-orders", payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de l'enregistrement de la commande."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrder(id: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce bon de commande ?")) return;

    try {
      setDeletingId(id);
      setError("");
      await api.delete(`/customer-orders/${id}`);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la suppression de la commande."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownloadPdf(order: Order) {
    try {
      setPdfLoadingId(order.id);
      setError("");

      const response = await api.post(`/customer-orders/${order.id}/pdf`);
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
      await api.patch(`/customer-orders/${id}/status`, { status: newStatus });
      await loadData();
      if (selectedDetails && selectedDetails.order.id === id) {
        const response = await api.get(`/customer-orders/${id}`);
        setSelectedDetails(response.data as OrderDetails);
      }
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la mise à jour du statut."));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function handleOpenConvert(order: Order) {
    setConvertingOrder(order);
    setConvertFormData({
      sale_date: getTodayDate(),
      amount_paid: String(order.total_amount || 0),
      payment_method: "cash",
      subscription_label: "",
      next_subscription_date: "",
    });
    setConvertModalOpen(true);
  }

  async function handleConvertSubmit(e: FormEvent) {
    e.preventDefault();
    if (!convertingOrder) return;

    try {
      setConvertingId(convertingOrder.id);
      setError("");

      const payload = {
        sale_date: convertFormData.sale_date,
        amount_paid: toNumber(convertFormData.amount_paid),
        payment_method: convertFormData.payment_method,
        subscription_label: convertFormData.subscription_label || undefined,
        next_subscription_date: convertFormData.next_subscription_date || undefined,
      };

      await api.post(`/customer-orders/${convertingOrder.id}/convert-to-sale`, payload);

      setConvertModalOpen(false);
      setDetailsModalOpen(false);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de la conversion du bon de commande."));
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bons de Commande</h2>
          <p className="mt-1 text-slate-500">
            Enregistrement et facturation des commandes signées clients.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center gap-2 py-2 px-4 transition-all"
        >
          <Plus size={18} />
          Créer un bon de commande
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
              Total Commandes
            </CardTitle>
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatMoney(stats.total)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalCount} commandes reçues
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Commandes Facturées
            </CardTitle>
            <Check className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatMoney(stats.converted)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.convertedCount} converties en vente
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Commandes Confirmées
            </CardTitle>
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin-slow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatMoney(stats.confirmed)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.confirmedCount} en attente de facturation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border shadow-sm rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Brouillons / Annulés
            </CardTitle>
            <X className="h-5 w-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatMoney(stats.pending)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.pendingCount} commandes inactives
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
              placeholder="Numéro, référence, client, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="confirmed">Confirmé</option>
              <option value="converted">Facturé</option>
              <option value="cancelled">Annulé</option>
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
              <p className="text-sm text-slate-500">Chargement des commandes...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-slate-500">
              <ClipboardList size={36} className="text-slate-300 mb-2" />
              <p className="text-sm">Aucun bon de commande trouvé</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-4">Numéro BC</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Réf. Externe</th>
                      <th className="p-4">Date commande</th>
                      <th className="p-4">Livraison prévue</th>
                      <th className="p-4 text-right">Total</th>
                      <th className="p-4 text-center">Statut</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-semibold text-slate-900">
                          {getOrderNumber(order)}
                        </td>
                        <td className="p-4">{order.client_name || "Client inconnu"}</td>
                        <td className="p-4 text-slate-500">{order.customer_reference || "-"}</td>
                        <td className="p-4">{formatDate(order.order_date)}</td>
                        <td className="p-4 text-slate-500">{formatDate(order.expected_delivery_date)}</td>
                        <td className="p-4 text-right font-bold text-slate-950">
                          {formatMoney(order.total_amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${orderStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {orderStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              onClick={() => handleOpenDetails(order)}
                              disabled={detailsLoadingId === order.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                            >
                              {detailsLoadingId === order.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Eye size={16} />
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleDownloadPdf(order)}
                              disabled={pdfLoadingId === order.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-blue-600 hover:bg-blue-50 border-blue-100"
                            >
                              {pdfLoadingId === order.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Download size={16} />
                              )}
                            </Button>

                            {!order.converted_sale_id && (
                              <Button
                                variant="outline"
                                onClick={() => handleOpenEdit(order)}
                                disabled={detailsLoadingId === order.id}
                                className="p-2 h-9 w-9 rounded-lg border bg-white text-slate-700 hover:bg-slate-50"
                              >
                                <Edit size={16} />
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deletingId === order.id}
                              className="p-2 h-9 w-9 rounded-lg border bg-white text-red-600 hover:bg-red-50 border-red-100 admin-only"
                            >
                              {deletingId === order.id ? (
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
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {getOrderNumber(order)}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${orderStatusBadgeClass(
                          order.status
                        )}`}
                      >
                        {orderStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="text-slate-700">
                        <span className="text-slate-400">Client :</span>{" "}
                        {order.client_name || "Client inconnu"}
                      </p>
                      {order.customer_reference && (
                        <p className="text-slate-500 text-xs">Réf client : {order.customer_reference}</p>
                      )}
                      <p className="text-slate-500 text-xs">
                        Date : {formatDate(order.order_date)} | Livraison :{" "}
                        {formatDate(order.expected_delivery_date)}
                      </p>
                      <p className="font-bold text-slate-950">
                        Total : {formatMoney(order.total_amount)}
                      </p>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => handleOpenDetails(order)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border bg-white"
                      >
                        Détails
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleDownloadPdf(order)}
                        className="py-1.5 px-2.5 text-xs rounded-lg border border-blue-100 bg-white text-blue-600"
                      >
                        PDF
                      </Button>

                      {!order.converted_sale_id && (
                        <Button
                          variant="outline"
                          onClick={() => handleOpenEdit(order)}
                          className="py-1.5 px-2.5 text-xs rounded-lg border bg-white"
                        >
                          Modifier
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => handleDeleteOrder(order.id)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Détails du Bon de Commande {getOrderNumber(selectedDetails.order)}
                </h3>
                <p className="text-xs text-slate-500">
                  Créé le {formatDate(selectedDetails.order.order_date)} par{" "}
                  {selectedDetails.order.created_by_name || "l'administrateur"}
                </p>
              </div>

              <button
                onClick={() => setDetailsModalOpen(false)}
                className="rounded-xl border p-2 hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Order details */}
            <div className="grid gap-4 sm:grid-cols-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-slate-400">Client</p>
                <p className="font-bold text-slate-900">
                  {selectedDetails.order.client_name || "Client inconnu"}
                </p>
                {selectedDetails.order.client_phone && (
                  <p className="text-xs text-slate-600">Tél : {selectedDetails.order.client_phone}</p>
                )}
                {selectedDetails.order.client_email && (
                  <p className="text-xs text-slate-600">Email : {selectedDetails.order.client_email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Statut commande :</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${orderStatusBadgeClass(
                      selectedDetails.order.status
                    )}`}
                  >
                    {orderStatusLabel(selectedDetails.order.status)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Livraison estimée :</span>
                  <span className="font-semibold text-slate-900">
                    {formatDate(selectedDetails.order.expected_delivery_date)}
                  </span>
                </div>

                {selectedDetails.order.customer_reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Référence externe :</span>
                    <span className="font-semibold text-slate-900">
                      {selectedDetails.order.customer_reference}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-slate-400">Facturation :</span>
                  {selectedDetails.order.converted_sale_id ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      Facturé ({selectedDetails.order.converted_invoice_number})
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">Non facturé</span>
                  )}
                </div>
              </div>
            </div>

            {/* Items table */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-slate-900">Articles commandés</h4>
              <div className="overflow-x-auto border rounded-xl">
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
                  Total : {formatMoney(selectedDetails.order.total_amount)}
                </p>
              </div>
            </div>

            {selectedDetails.order.note && (
              <div className="text-sm space-y-1">
                <p className="text-slate-400">Note interne / Observation :</p>
                <p className="p-3 border rounded-xl bg-slate-50/50 text-slate-700 italic">
                  {selectedDetails.order.note}
                </p>
              </div>
            )}

            {/* Actions details */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex gap-2">
                {selectedDetails.order.status === "draft" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedDetails.order.id, "confirmed")}
                    disabled={statusUpdatingId === selectedDetails.order.id}
                    className="border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5"
                  >
                    {statusUpdatingId === selectedDetails.order.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Confirmer la commande
                  </Button>
                )}

                {selectedDetails.order.status !== "converted" &&
                  selectedDetails.order.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedDetails.order.id, "cancelled")}
                      disabled={statusUpdatingId === selectedDetails.order.id}
                      className="border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5 admin-only"
                    >
                      Annuler la commande
                    </Button>
                  )}
              </div>

              <div className="flex gap-2">
                {selectedDetails.order.status !== "converted" &&
                  selectedDetails.order.status !== "cancelled" && (
                    <Button
                      onClick={() => handleOpenConvert(selectedDetails.order)}
                      disabled={convertingId === selectedDetails.order.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1.5"
                    >
                      {convertingId === selectedDetails.order.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCcw size={14} />
                      )}
                      Facturer la commande
                    </Button>
                  )}

                <Button
                  variant="outline"
                  onClick={() => handleDownloadPdf(selectedDetails.order)}
                  disabled={pdfLoadingId === selectedDetails.order.id}
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
      {convertModalOpen && convertingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleConvertSubmit}
            className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Facturer la commande ({getOrderNumber(convertingOrder)})
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
                Cette commande sera convertie en facture définitive de vente. Le stock des produits sera déduit et la facture sera enregistrée dans le système.
              </p>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs space-y-1">
                <p className="font-semibold text-blue-800">Résumé financier :</p>
                <p className="text-blue-900">Total facture : {formatMoney(convertingOrder.total_amount)}</p>
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
                  max={Number(convertingOrder.total_amount || 0)}
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
                      placeholder="Ex: Trimestriel"
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
                disabled={convertingId === convertingOrder.id}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-3 rounded-xl flex items-center gap-1"
              >
                {convertingId === convertingOrder.id && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmitForm}
            className="w-full max-w-3xl rounded-2xl border bg-white p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingOrder ? "Modifier le Bon de Commande" : "Créer un Bon de Commande"}
              </h3>
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Référence client externe (Optionnelle)
                </label>
                <input
                  type="text"
                  placeholder="Ex: PO-99882"
                  value={formData.customer_reference}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, customer_reference: e.target.value }))
                  }
                  className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Date Commande</label>
                  <input
                    type="date"
                    required
                    value={formData.order_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, order_date: e.target.value }))
                    }
                    className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Livraison estimée</label>
                  <input
                    type="date"
                    required
                    value={formData.expected_delivery_date}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, expected_delivery_date: e.target.value }))
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
                  <option value="confirmed">Confirmé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>
            </div>

            {/* Form Items Grid */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Articles commandés</h4>
                <Button
                  type="button"
                  onClick={handleAddLine}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg py-1.5 px-3 flex items-center gap-1"
                >
                  <Plus size={14} /> Ajouter une ligne
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {formData.items.map((line, index) => (
                  <div key={index} className="flex gap-2 items-end border p-3 rounded-xl bg-slate-50/50">
                    <div className="flex-1 space-y-1">
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

                    <div className="w-20 space-y-1">
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

                    <div className="w-28 space-y-1">
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

                    <div className="w-28 space-y-1 text-right">
                      <p className="text-[10px] font-semibold text-slate-400">Total Ligne</p>
                      <p className="py-1.5 px-2 text-xs font-bold text-slate-900 bg-slate-100 rounded-lg">
                        {formatMoney(Number(line.quantity || 0) * Number(line.unit_price || 0))}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={formData.items.length <= 1}
                      onClick={() => handleRemoveLine(index)}
                      className="p-2 border rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-30 text-slate-400 admin-only"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Summary */}
            <div className="grid gap-4 sm:grid-cols-2 border-t pt-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Note interne / Observation</label>
                <textarea
                  placeholder="Notes affichées sur le bon..."
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex flex-col justify-end items-end p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
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
                {editingOrder ? "Enregistrer" : "Créer le bon de commande"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default OrdersPage;
