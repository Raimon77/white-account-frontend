import axios from "axios";
import { open } from '@tauri-apps/plugin-shell';
import {
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CreditCard,
  Download,
  Edit,
  Eye,
  FileText,
  Loader2,
  Mail,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import api from "@/api/api";
import { MonthFilter } from "@/components/filters/MonthFilter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  stock_quantity?: number | string | null;
};

type Sale = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  invoice_number?: string | null;
  sale_date?: string;
  total_amount?: number | string | null;
  total_profit?: number | string | null;
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  payment_status?: string | null;
  sale_status?: string | null;
  observation?: string | null;
  subscription_label?: string | null;
  next_subscription_date?: string | null;
  invoice_pdf_url?: string | null;
  invoice_email_sent_at?: string | null;
  invoice_email_sent_to?: string | null;
  created_at?: string;
};

type SaleItem = {
  id?: string;
  sale_id?: string;
  product_id: string;
  reference?: string;
  product_name?: string;
  quantity: number | string;
  unit_price: number | string;
  sale_price?: number | string | null;
  purchase_cost?: number | string | null;
  total_price?: number | string | null;
  profit?: number | string | null;
};

type SaleDetails = {
  sale: Sale;
  items: SaleItem[];
};

type SaleLine = {
  product_id: string;
  quantity: string;
  unit_price: string;
};

type SaleFormData = {
  client_id: string;
  sale_date: string;
  amount_paid: string;
  payment_method: string;
  observation: string;
  subscription_label: string;
  next_subscription_date: string;
  items: SaleLine[];
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: SaleFormData = {
  client_id: "",
  sale_date: getTodayDate(),
  amount_paid: "0",
  payment_method: "orange_money",
  observation: "",
  subscription_label: "",
  next_subscription_date: "",
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

function getSaleNumber(sale: Sale) {
  return sale.invoice_number || `FAC-${sale.id.slice(0, 8)}`;
}

function getProductSalePrice(product?: Product) {
  if (!product) return 0;

  return toNumber(product.sale_price ?? product.selling_price);
}

function getProductPurchaseCost(product?: Product) {
  if (!product) return 0;

  return toNumber(product.purchase_price ?? product.purchase_cost);
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
    return getBackendMessage(error.response?.data) || fallback;
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
    "invoice_pdf_url",
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

  const nestedKeys = ["data", "sale", "invoice", "result"];

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

function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [emailLoadingId, setEmailLoadingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<SaleFormData>(emptyForm);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<SaleDetails | null>(
    null
  );

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [salesResponse, clientsResponse, productsResponse] =
        await Promise.all([
          api.get("/sales"),
          api.get("/clients"),
          api.get("/products"),
        ]);

      setSales(normalizeArray<Sale>(salesResponse.data, "sales"));
      setClients(normalizeArray<Client>(clientsResponse.data, "clients"));
      setProducts(normalizeArray<Product>(productsResponse.data, "products"));
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de charger les ventes, clients ou produits."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const filteredSales = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const number = getSaleNumber(sale);
      const matchesSearch =
        !keyword ||
        number.toLowerCase().includes(keyword) ||
        sale.client_name?.toLowerCase().includes(keyword) ||
        sale.payment_status?.toLowerCase().includes(keyword) ||
        sale.sale_status?.toLowerCase().includes(keyword) ||
        sale.observation?.toLowerCase().includes(keyword) ||
        sale.id.toLowerCase().includes(keyword);

      return matchesMonth(sale.sale_date, monthFilter) && matchesSearch;
    });
  }, [sales, search, monthFilter]);

  const totalSalesAmount = useMemo(() => {
    return filteredSales
      .filter((sale) => sale.sale_status !== "cancelled")
      .reduce((total, sale) => total + toNumber(sale.total_amount), 0);
  }, [filteredSales]);

  const totalPaidAmount = useMemo(() => {
    return filteredSales
      .filter((sale) => sale.sale_status !== "cancelled")
      .reduce((total, sale) => total + toNumber(sale.amount_paid), 0);
  }, [filteredSales]);

  const totalDueAmount = useMemo(() => {
    return filteredSales
      .filter((sale) => sale.sale_status !== "cancelled")
      .reduce((total, sale) => total + toNumber(sale.balance_due), 0);
  }, [filteredSales]);

  const activeSalesCount = useMemo(() => {
    return filteredSales.filter((sale) => sale.sale_status !== "cancelled").length;
  }, [filteredSales]);

  const formTotal = useMemo(() => {
    return formData.items.reduce((total, item) => {
      return total + Number(item.quantity || 0) * Number(item.unit_price || 0);
    }, 0);
  }, [formData.items]);

  const formProfit = useMemo(() => {
    return formData.items.reduce((total, item) => {
      const product = products.find((product) => product.id === item.product_id);
      const purchaseCost = getProductPurchaseCost(product);

      return (
        total +
        (Number(item.unit_price || 0) - purchaseCost) *
          Number(item.quantity || 0)
      );
    }, 0);
  }, [formData.items, products]);

  const formBalance = Math.max(formTotal - Number(formData.amount_paid || 0), 0);

  function openCreateModal() {
    setEditingSale(null);
    setFormData({
      ...emptyForm,
      sale_date: getTodayDate(),
      items: [
        {
          product_id: "",
          quantity: "1",
          unit_price: "0",
        },
      ],
    });
    setModalOpen(true);
  }

  async function openEditModal(sale: Sale) {
    try {
      setDetailsLoadingId(sale.id);
      setError("");

      const response = await api.get<SaleDetails>(`/sales/${sale.id}`);
      const details = response.data;

      setEditingSale(details.sale);
      setFormData({
        client_id: details.sale.client_id || "",
        sale_date: (details.sale.sale_date || getTodayDate()).slice(0, 10),
        amount_paid: String(toNumber(details.sale.amount_paid)),
        payment_method: "orange_money",
        observation: details.sale.observation || "",
        subscription_label: details.sale.subscription_label || "",
        next_subscription_date: details.sale.next_subscription_date
          ? details.sale.next_subscription_date.slice(0, 10)
          : "",
        items:
          details.items.length > 0
            ? details.items.map((item) => ({
                product_id: item.product_id,
                quantity: String(toNumber(item.quantity)),
                unit_price: String(toNumber(item.unit_price ?? item.sale_price)),
              }))
            : [
                {
                  product_id: "",
                  quantity: "1",
                  unit_price: "0",
                },
              ],
      });

      setModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger la vente à modifier."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function openDetailsModal(sale: Sale) {
    try {
      setDetailsLoadingId(sale.id);
      setError("");

      const response = await api.get<SaleDetails>(`/sales/${sale.id}`);

      setSelectedDetails(response.data);
      setDetailsModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger le détail de la vente."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingSale(null);
    setFormData(emptyForm);
  }

  function closeDetailsModal() {
    setDetailsModalOpen(false);
    setSelectedDetails(null);
  }

  function updateForm(field: keyof SaleFormData, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateLine(index: number, field: keyof SaleLine, value: string) {
    setFormData((previous) => {
      const newItems = [...previous.items];

      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };

      if (field === "product_id") {
        const selectedProduct = products.find((product) => product.id === value);

        newItems[index].unit_price = String(
          getProductSalePrice(selectedProduct)
        );
      }

      return {
        ...previous,
        items: newItems,
      };
    });
  }

  function addLine() {
    setFormData((previous) => ({
      ...previous,
      items: [
        ...previous.items,
        {
          product_id: "",
          quantity: "1",
          unit_price: "0",
        },
      ],
    }));
  }

  function removeLine(index: number) {
    setFormData((previous) => {
      if (previous.items.length === 1) return previous;

      return {
        ...previous,
        items: previous.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.client_id) {
      setError("Le client est obligatoire.");
      return;
    }

    const validItems = formData.items.filter((item) => {
      return (
        item.product_id &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unit_price || 0) >= 0
      );
    });

    if (validItems.length === 0) {
      setError("Ajoute au moins un produit valide dans la vente.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        client_id: formData.client_id,
        sale_date: formData.sale_date,
        amount_paid: Number(formData.amount_paid || 0),
        payment_method: formData.payment_method,
        observation: formData.observation.trim() || null,
        subscription_label: formData.subscription_label.trim() || null,
        next_subscription_date: formData.next_subscription_date || null,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity || 0),

          // Prix réellement appliqué à la vente.
          // Il peut être différent du prix par défaut du produit.
          unit_price: Number(item.unit_price || 0),
          sale_price: Number(item.unit_price || 0),
          price: Number(item.unit_price || 0),
        })),
      };

      if (editingSale) {
        await api.put(`/sales/${editingSale.id}`, payload);
      } else {
        await api.post("/sales", payload);
      }

      await loadData();
      closeModal();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          editingSale
            ? "Impossible de modifier la vente."
            : "Impossible de créer la vente."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sale: Sale) {
    const confirmed = window.confirm(
      `Supprimer la vente "${getSaleNumber(sale)}" ?\n\nLe stock sera restauré automatiquement. Les paiements et avoirs liés seront aussi supprimés.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(sale.id);
      setError("");

      await api.delete(`/sales/${sale.id}`);

      await loadData();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de supprimer cette vente. Vérifie le stock ou les avoirs liés."
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleGeneratePdf(sale: Sale) {
    try {
      setPdfLoadingId(sale.id);
      setError("");

      const response = await api.post(`/sales/${sale.id}/invoice-pdf`);
      const downloadUrl = getPdfDownloadUrl(response.data);

      if (!downloadUrl) {
        throw new Error(
          "Le backend a répondu, mais aucune URL de facture PDF n'a été retournée."
        );
      }

      open(buildBackendFileUrl(downloadUrl));
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de générer la facture PDF."));
    } finally {
      setPdfLoadingId(null);
    }
  }

  async function handleSendInvoice(sale: Sale) {
    let recipient = sale.client_email?.trim() || "";
    const resend = Boolean(sale.invoice_email_sent_at);

    if (!recipient) {
      recipient =
        window.prompt(
          `Adresse email pour envoyer la facture ${getSaleNumber(sale)} :`
        )?.trim() || "";
    }

    if (!recipient) return;

    if (
      resend &&
      !window.confirm(
        `Renvoyer la facture ${getSaleNumber(sale)} à ${recipient} ?`
      )
    ) {
      return;
    }

    try {
      setEmailLoadingId(sale.id);
      setError("");
      setSuccess("");

      const response = await api.post(`/sales/${sale.id}/send-invoice-email`, {
        email: recipient,
        resend,
      });

      setSuccess(response.data?.message || `Facture envoyée à ${recipient}.`);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Impossible d’envoyer la facture par email."));
    } finally {
      setEmailLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-blue-50" />
          <div className="absolute bottom-0 right-24 h-20 w-20 rounded-full bg-orange-50" />

          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Facturation
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Ventes
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Créez, modifiez ou supprimez les ventes. Le prix appliqué par
                produit reste modifiable à chaque facture.
              </p>
            </div>

            <Button
              onClick={openCreateModal}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Nouvelle vente
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventes actives"
          value={String(activeSalesCount)}
          icon={Receipt}
          colorClassName="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="Montant ventes"
          value={formatMoney(totalSalesAmount)}
          icon={Wallet}
          colorClassName="bg-green-50 text-green-700"
        />

        <StatCard
          title="Encaissé"
          value={formatMoney(totalPaidAmount)}
          icon={CreditCard}
          colorClassName="bg-violet-50 text-violet-700"
        />

        <StatCard
          title="Reste à encaisser"
          value={formatMoney(totalDueAmount)}
          icon={FileText}
          colorClassName="bg-orange-50 text-orange-600"
          danger={totalDueAmount > 0}
        />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par facture, client, statut ou observation..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
          <MonthFilter value={monthFilter} onChange={setMonthFilter} />
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Liste des ventes</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {filteredSales.length} vente(s) affichée(s)
          </p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Chargement des ventes...
              </div>
            </div>
          ) : filteredSales.length === 0 ? (
            <EmptySalesState onCreate={openCreateModal} />
          ) : (
            <>
              <div className="app-horizontal-scroll hidden overflow-x-auto rounded-2xl border border-slate-200 xl:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Facture</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Payé</th>
                      <th className="px-4 py-3 text-right">Solde</th>
                      <th className="px-4 py-3 text-right">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                              <Receipt size={20} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-950">
                                {getSaleNumber(sale)}
                              </p>
                              <p className="text-xs text-slate-400">
                                ID : {sale.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {sale.client_name || "-"}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(sale.sale_date)}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-slate-950">
                          {formatMoney(sale.total_amount)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-green-700">
                          {formatMoney(sale.amount_paid)}
                        </td>

                        <td className="px-4 py-4 text-right font-semibold text-orange-600">
                          {formatMoney(sale.balance_due)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <PaymentStatusPill status={sale.payment_status} />
                            <SaleStatusPill status={sale.sale_status} />
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openDetailsModal(sale)}
                              disabled={detailsLoadingId === sale.id}
                            >
                              {detailsLoadingId === sale.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Eye size={15} />
                              )}
                              Voir
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openEditModal(sale)}
                              disabled={detailsLoadingId === sale.id}
                            >
                              <Edit size={15} />
                              Modifier
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleGeneratePdf(sale)}
                              disabled={pdfLoadingId === sale.id}
                            >
                              {pdfLoadingId === sale.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Download size={15} />
                              )}
                              PDF
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                              onClick={() => handleSendInvoice(sale)}
                              disabled={emailLoadingId === sale.id}
                            >
                              {emailLoadingId === sale.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Mail size={15} />
                              )}
                              {sale.invoice_email_sent_at ? "Renvoyer" : "Envoyer"}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                              onClick={() => handleDelete(sale)}
                              disabled={deletingId === sale.id}
                            >
                              {deletingId === sale.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                              Supprimer
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 xl:hidden">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <Receipt size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">
                          {getSaleNumber(sale)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {sale.client_name || "Client non renseigné"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <PaymentStatusPill status={sale.payment_status} />
                          <SaleStatusPill status={sale.sale_status} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <InfoBox
                            label="Date"
                            value={formatDate(sale.sale_date)}
                          />
                          <InfoBox
                            label="Total"
                            value={formatMoney(sale.total_amount)}
                          />
                          <InfoBox
                            label="Payé"
                            value={formatMoney(sale.amount_paid)}
                          />
                          <InfoBox
                            label="Solde"
                            value={formatMoney(sale.balance_due)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openDetailsModal(sale)}
                      >
                        <Eye size={15} />
                        Voir
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openEditModal(sale)}
                      >
                        <Edit size={15} />
                        Modifier
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleGeneratePdf(sale)}
                        disabled={pdfLoadingId === sale.id}
                      >
                        <Download size={15} />
                        PDF
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
                        onClick={() => handleSendInvoice(sale)}
                        disabled={emailLoadingId === sale.id}
                      >
                        {emailLoadingId === sale.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Mail size={15} />
                        )}
                        {sale.invoice_email_sent_at ? "Renvoyer" : "Envoyer"}
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                        onClick={() => handleDelete(sale)}
                        disabled={deletingId === sale.id}
                      >
                        <Trash2 size={15} />
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

      {modalOpen && (
        <SaleModal
          mode={editingSale ? "edit" : "create"}
          clients={clients}
          products={products}
          formData={formData}
          formTotal={formTotal}
          formProfit={formProfit}
          formBalance={formBalance}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={updateForm}
          onLineChange={updateLine}
          onAddLine={addLine}
          onRemoveLine={removeLine}
        />
      )}

      {detailsModalOpen && selectedDetails && (
        <SaleDetailsModal
          details={selectedDetails}
          onClose={closeDetailsModal}
          onEdit={() => {
            closeDetailsModal();
            openEditModal(selectedDetails.sale);
          }}
          onPdf={() => handleGeneratePdf(selectedDetails.sale)}
          onEmail={() => handleSendInvoice(selectedDetails.sale)}
          emailLoading={emailLoadingId === selectedDetails.sale.id}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  colorClassName,
  danger,
}: {
  title: string;
  value: string;
  icon: ElementType;
  colorClassName: string;
  danger?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${colorClassName}`}
        >
          <Icon size={26} />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              danger ? "text-orange-600" : "text-slate-950"
            }`}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function PaymentStatusPill({ status }: { status?: string | null }) {
  const label =
    status === "paid"
      ? "Payée"
      : status === "partial"
      ? "Partielle"
      : status === "unpaid"
      ? "Impayée"
      : status === "cancelled"
      ? "Annulée"
      : status || "Statut";

  const className =
    status === "paid"
      ? "bg-green-50 text-green-700"
      : status === "partial"
      ? "bg-orange-50 text-orange-700"
      : status === "cancelled"
      ? "bg-red-50 text-red-700"
      : "bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function SaleStatusPill({ status }: { status?: string | null }) {
  if (!status || status === "active") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
        Active
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Annulée
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {status}
    </span>
  );
}

function EmptySalesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <Receipt size={28} />
      </div>

      <p className="font-semibold text-slate-950">Aucune vente trouvée</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ajoutez votre première vente pour générer une facture et suivre les
        encaissements.
      </p>

      <Button
        onClick={onCreate}
        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus size={18} />
        Nouvelle vente
      </Button>
    </div>
  );
}

type SaleModalProps = {
  mode: "create" | "edit";
  clients: Client[];
  products: Product[];
  formData: SaleFormData;
  formTotal: number;
  formProfit: number;
  formBalance: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof SaleFormData, value: string) => void;
  onLineChange: (index: number, field: keyof SaleLine, value: string) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
};

function SaleModal({
  mode,
  clients,
  products,
  formData,
  formTotal,
  formProfit,
  formBalance,
  saving,
  onClose,
  onSubmit,
  onChange,
  onLineChange,
  onAddLine,
  onRemoveLine,
}: SaleModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6 lg:p-10">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {mode === "edit" ? "Modifier la vente" : "Nouvelle vente"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Le prix de vente est modifiable par ligne, même s’il est différent
              du prix par défaut du produit.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[calc(100dvh-6.5rem)] overflow-y-auto px-5 py-4 sm:max-h-[calc(100dvh-8rem)]"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Client" required>
              <select
                value={formData.client_id}
                onChange={(event) => onChange("client_id", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Choisir un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Date de vente">
              <input
                type="date"
                value={formData.sale_date}
                onChange={(event) => onChange("sale_date", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <FormField label="Montant payé">
              <input
                type="number"
                min="0"
                value={formData.amount_paid}
                onChange={(event) => onChange("amount_paid", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>

            <FormField label="Mode de paiement">
              <select
                value={formData.payment_method}
                onChange={(event) =>
                  onChange("payment_method", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="cash">Espèces</option>
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="bank_transfer">Virement bancaire</option>
                <option value="card">Carte bancaire</option>
                <option value="other">Autre</option>
              </select>
            </FormField>
          </div>

          {mode === "edit" && (
            <div className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-800">
              Si la vente possède déjà des paiements liés, la modification de la
              vente recalcule le solde selon les paiements existants. La
              correction détaillée des paiements se fera dans le module
              Paiements.
            </div>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <FormField label="Libellé abonnement">
              <input
                value={formData.subscription_label}
                onChange={(event) =>
                  onChange("subscription_label", event.target.value)
                }
                placeholder="Ex : Renouvellement Netflix"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>

            <FormField label="Prochaine date abonnement">
              <input
                type="date"
                value={formData.next_subscription_date}
                onChange={(event) =>
                  onChange("next_subscription_date", event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>
          </div>

          <div className="mt-3">
            <FormField label="Observation">
              <textarea
                value={formData.observation}
                onChange={(event) => onChange("observation", event.target.value)}
                rows={2}
                placeholder="Ex : Remise client ou note interne"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-950">Produits vendus</p>
                <p className="text-sm text-slate-500">
                  Le prix par défaut est rempli automatiquement, mais reste
                  modifiable.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={onAddLine}
              >
                <Plus size={16} />
                Ajouter ligne
              </Button>
            </div>

            <div className="space-y-2 p-3">
              {formData.items.map((item, index) => {
                const product = products.find(
                  (product) => product.id === item.product_id
                );

                const lineTotal =
                  Number(item.quantity || 0) * Number(item.unit_price || 0);

                const lineProfit =
                  (Number(item.unit_price || 0) -
                    getProductPurchaseCost(product)) *
                  Number(item.quantity || 0);

                return (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(4.5rem,0.45fr)_minmax(6.5rem,0.7fr)_minmax(6.5rem,0.7fr)_minmax(6.5rem,0.7fr)_auto]"
                  >
                    <FormField label="Produit" small>
                      <select
                        value={item.product_id}
                        onChange={(event) =>
                          onLineChange(index, "product_id", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                      >
                        <option value="">Choisir un produit</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.reference} - {product.name} | Stock{" "}
                            {toNumber(product.stock_quantity)}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <NumberField
                      label="Qté"
                      value={item.quantity}
                      onChange={(value) => onLineChange(index, "quantity", value)}
                    />

                    <NumberField
                      label="Prix vente"
                      value={item.unit_price}
                      onChange={(value) =>
                        onLineChange(index, "unit_price", value)
                      }
                    />

                    <FormField label="Total" small>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950">
                        {formatMoney(lineTotal)}
                      </div>
                    </FormField>

                    <FormField label="Bénéfice" small>
                      <div
                        className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold ${
                          lineProfit >= 0 ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {formatMoney(lineProfit)}
                      </div>
                    </FormField>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onRemoveLine(index)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl bg-slate-950 p-4 text-white sm:grid-cols-2 lg:grid-cols-4">
            <TotalBox label="Total vente" value={formatMoney(formTotal)} />
            <TotalBox label="Bénéfice estimé" value={formatMoney(formProfit)} />
            <TotalBox
              label="Montant payé"
              value={formatMoney(formData.amount_paid)}
            />
            <TotalBox label="Solde" value={formatMoney(formBalance)} />

            <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="w-full border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white sm:w-auto"
              >
                Annuler
              </Button>

              <Button
                type="submit"
                disabled={saving}
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700 sm:w-auto"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {mode === "edit"
                  ? "Enregistrer les modifications"
                  : "Enregistrer la vente"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SaleDetailsModal({
  details,
  onClose,
  onEdit,
  onPdf,
  onEmail,
  emailLoading,
}: {
  details: SaleDetails;
  onClose: () => void;
  onEdit: () => void;
  onPdf: () => void;
  onEmail: () => void;
  emailLoading: boolean;
}) {
  const sale = details.sale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Détail vente {getSaleNumber(sale)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Client : {sale.client_name || "-"} · Date :{" "}
              {formatDate(sale.sale_date)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-90px)] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-4">
            <InfoBox label="Client" value={sale.client_name || "-"} />
            <InfoBox label="Total" value={formatMoney(sale.total_amount)} />
            <InfoBox label="Payé" value={formatMoney(sale.amount_paid)} />
            <InfoBox label="Solde" value={formatMoney(sale.balance_due)} />
          </div>

          {sale.observation && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Observation
              </p>
              <p className="mt-1 text-sm text-slate-700">{sale.observation}</p>
            </div>
          )}

          <div className="app-horizontal-scroll mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3 text-right">Quantité</th>
                  <th className="px-4 py-3 text-right">Prix vente</th>
                  <th className="px-4 py-3 text-right">Coût achat</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Bénéfice</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {details.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">
                        {item.product_name || "-"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.reference || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {toNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(item.unit_price ?? item.sale_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(item.purchase_cost)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatMoney(item.total_price)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        toNumber(item.profit) >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatMoney(item.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>

            <Button type="button" variant="outline" className="gap-2" onClick={onPdf}>
              <Download size={16} />
              Facture PDF
            </Button>

            <Button
              type="button"
              variant="outline"
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
              onClick={onEmail}
              disabled={emailLoading}
            >
              {emailLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Mail size={16} />
              )}
              {sale.invoice_email_sent_at ? "Renvoyer la facture" : "Envoyer par email"}
            </Button>

            <Button
              type="button"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={onEdit}
            >
              <Edit size={16} />
              Modifier cette vente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
  required,
  small,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  small?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        className={`font-semibold text-slate-700 ${
          small ? "text-xs" : "text-sm"
        }`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label} small>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </FormField>
  );
}

export default SalesPage;
