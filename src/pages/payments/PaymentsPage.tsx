import axios from "axios";
import { open } from '@tauri-apps/plugin-shell';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CreditCard,
  Download,
  Edit,
  FileText,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
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

type Payment = {
  id: string;
  sale_id: string;
  payment_date?: string | null;
  amount?: number | string | null;
  payment_method?: string | null;
  reference?: string | null;
  note?: string | null;
  receipt_number?: string | null;
  receipt_pdf_url?: string | null;
  invoice_number?: string | null;
  sale_date?: string | null;
  total_amount?: number | string | null;
  amount_paid?: number | string | null;
  balance_due?: number | string | null;
  payment_status?: string | null;
  client_name?: string | null;
  client_phone?: string | null;
  created_at?: string | null;
};

type PaymentFormData = {
  sale_id: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  reference: string;
  note: string;
};

const emptyForm: PaymentFormData = {
  sale_id: "",
  payment_date: getTodayDate(),
  amount: "",
  payment_method: "cash",
  reference: "",
  note: "",
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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
  });
}

function getSaleNumber(sale: Sale | Payment) {
  const fallbackId = "sale_id" in sale ? sale.sale_id : sale.id;

  return sale.invoice_number || `FAC-${fallbackId.slice(0, 8)}`;
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

  for (const key of ["message", "error", "detail", "details"]) {
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

function getDownloadUrl(data: unknown): string | null {
  if (typeof data === "string") {
    return data.trim() || null;
  }

  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;

  for (const key of [
    "download_url",
    "receipt_pdf_url",
    "pdf_url",
    "pdfUrl",
    "url",
    "file_url",
    "fileUrl",
  ]) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  for (const key of ["data", "payment", "receipt", "result"]) {
    const nestedUrl = getDownloadUrl(record[key]);

    if (nestedUrl) return nestedUrl;
  }

  return null;
}

function paymentMethodLabel(method?: string | null) {
  const labels: Record<string, string> = {
    cash: "Especes",
    wave: "Wave",
    orange_money: "Orange Money",
    bank_transfer: "Virement",
    card: "Carte",
    check: "Cheque",
    other: "Autre",
  };

  return labels[method || ""] || method || "-";
}

function paymentStatusLabel(status?: string | null) {
  if (status === "paid") return "Paye";
  if (status === "partial") return "Partiel";
  if (status === "unpaid") return "Impayee";
  if (status === "cancelled") return "Annulee";

  return status || "-";
}

function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>(emptyForm);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [paymentsResponse, salesResponse] = await Promise.all([
        api.get("/sale-payments"),
        api.get("/sales"),
      ]);

      setPayments(normalizeArray<Payment>(paymentsResponse.data, "payments"));
      setSales(normalizeArray<Sale>(salesResponse.data, "sales"));
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de charger les paiements et les ventes."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return payments;

    return payments.filter((payment) => {
      return (
        getSaleNumber(payment).toLowerCase().includes(keyword) ||
        payment.receipt_number?.toLowerCase().includes(keyword) ||
        payment.client_name?.toLowerCase().includes(keyword) ||
        payment.reference?.toLowerCase().includes(keyword) ||
        paymentMethodLabel(payment.payment_method).toLowerCase().includes(keyword)
      );
    });
  }, [payments, search]);

  const totalPaid = useMemo(() => {
    return payments.reduce((total, payment) => total + toNumber(payment.amount), 0);
  }, [payments]);

  const paymentsWithReceipt = useMemo(() => {
    return payments.filter((payment) => payment.receipt_pdf_url).length;
  }, [payments]);

  const pendingSales = useMemo(() => {
    return sales.filter((sale) => {
      return sale.sale_status !== "cancelled" && toNumber(sale.balance_due) > 0;
    });
  }, [sales]);

  function openCreateModal() {
    const firstPendingSale = pendingSales[0];

    setEditingPayment(null);
    setFormData({
      ...emptyForm,
      payment_date: getTodayDate(),
      sale_id: firstPendingSale?.id || "",
      amount: firstPendingSale ? String(toNumber(firstPendingSale.balance_due)) : "",
    });
    setModalOpen(true);
  }

  function openEditModal(payment: Payment) {
    setEditingPayment(payment);
    setFormData({
      sale_id: payment.sale_id,
      payment_date: (payment.payment_date || getTodayDate()).slice(0, 10),
      amount: String(toNumber(payment.amount)),
      payment_method: payment.payment_method || "cash",
      reference: payment.reference || "",
      note: payment.note || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingPayment(null);
    setFormData(emptyForm);
  }

  function updateForm(field: keyof PaymentFormData, value: string) {
    setFormData((previous) => {
      if (field !== "sale_id") {
        return {
          ...previous,
          [field]: value,
        };
      }

      const selectedSale = sales.find((sale) => sale.id === value);

      return {
        ...previous,
        sale_id: value,
        amount: selectedSale ? String(toNumber(selectedSale.balance_due)) : previous.amount,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.sale_id) {
      setError("La facture est obligatoire.");
      return;
    }

    if (Number(formData.amount || 0) <= 0) {
      setError("Le montant du paiement doit etre superieur a 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        sale_id: formData.sale_id,
        payment_date: formData.payment_date || getTodayDate(),
        amount: Number(formData.amount || 0),
        payment_method: formData.payment_method,
        reference: formData.reference.trim() || null,
        note: formData.note.trim() || null,
      };

      if (editingPayment) {
        await api.put(`/sale-payments/${editingPayment.id}`, {
          payment_date: payload.payment_date,
          amount: payload.amount,
          payment_method: payload.payment_method,
          reference: payload.reference,
          note: payload.note,
        });
      } else {
        await api.post("/sale-payments", payload);
      }

      await loadData();
      closeModal();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          editingPayment
            ? "Impossible de modifier le paiement."
            : "Impossible d'ajouter le paiement."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(payment: Payment) {
    const confirmed = window.confirm(
      `Supprimer ce paiement de ${formatMoney(payment.amount)} ?\n\nLa facture sera recalcaclee automatiquement par le backend.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(payment.id);
      setError("");

      await api.delete(`/sale-payments/${payment.id}`);
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de supprimer ce paiement."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleReceiptPdf(payment: Payment) {
    try {
      setReceiptLoadingId(payment.id);
      setError("");

      const response = await api.post(`/sale-payments/${payment.id}/receipt-pdf`);
      const downloadUrl = getDownloadUrl(response.data);

      if (!downloadUrl) {
        throw new Error(
          "Le backend a repondu, mais aucune URL de recu PDF n'a ete retournee."
        );
      }

      open(buildBackendFileUrl(downloadUrl));
      await loadData();
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de generer le recu PDF."));
    } finally {
      setReceiptLoadingId(null);
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
                Encaissements
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Paiements
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Suivez les paiements clients, corrigez les encaissements et
                genereez les recus PDF depuis les factures.
              </p>
            </div>

            <Button
              onClick={openCreateModal}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Nouveau paiement
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Paiements"
          value={String(payments.length)}
          icon={Receipt}
          colorClassName="bg-blue-50 text-blue-700"
        />
        <StatCard
          title="Total encaisse"
          value={formatMoney(totalPaid)}
          icon={Wallet}
          colorClassName="bg-green-50 text-green-700"
        />
        <StatCard
          title="Recus generes"
          value={String(paymentsWithReceipt)}
          icon={FileText}
          colorClassName="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Factures a solder"
          value={String(pendingSales.length)}
          icon={CreditCard}
          colorClassName="bg-slate-100 text-slate-700"
          danger={pendingSales.length > 0}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par facture, client, recu, reference ou mode..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Liste des paiements</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {filteredPayments.length} paiement(s) affiche(s)
          </p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Chargement des paiements...
              </div>
            </div>
          ) : filteredPayments.length === 0 ? (
            <EmptyPaymentsState onCreate={openCreateModal} />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 xl:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Recu</th>
                      <th className="px-4 py-3">Facture</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-right">Mode</th>
                      <th className="px-4 py-3 text-right">Solde facture</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-950">
                            {payment.receipt_number || "A generer"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {payment.reference || "Sans reference"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-blue-700">
                            {getSaleNumber(payment)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {paymentStatusLabel(payment.payment_status)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-700">
                            {payment.client_name || "-"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {payment.client_phone || ""}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-green-700">
                          {formatMoney(payment.amount)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <MethodPill method={payment.payment_method} />
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-orange-600">
                          {formatMoney(payment.balance_due)}
                        </td>
                        <td className="px-4 py-4">
                          <PaymentActions
                            payment={payment}
                            deletingId={deletingId}
                            receiptLoadingId={receiptLoadingId}
                            onEdit={openEditModal}
                            onReceipt={handleReceiptPdf}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 xl:hidden">
                {filteredPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    deletingId={deletingId}
                    receiptLoadingId={receiptLoadingId}
                    onEdit={openEditModal}
                    onReceipt={handleReceiptPdf}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <PaymentModal
          mode={editingPayment ? "edit" : "create"}
          sales={sales}
          formData={formData}
          saving={saving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={updateForm}
        />
      )}
    </div>
  );
}

function PaymentActions({
  payment,
  deletingId,
  receiptLoadingId,
  onEdit,
  onReceipt,
  onDelete,
}: {
  payment: Payment;
  deletingId: string | null;
  receiptLoadingId: string | null;
  onEdit: (payment: Payment) => void;
  onReceipt: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onEdit(payment)}
      >
        <Edit size={15} />
        Modifier
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => onReceipt(payment)}
        disabled={receiptLoadingId === payment.id}
      >
        {receiptLoadingId === payment.id ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Download size={15} />
        )}
        PDF
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
        onClick={() => onDelete(payment)}
        disabled={deletingId === payment.id}
      >
        {deletingId === payment.id ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <Trash2 size={15} />
        )}
        Supprimer
      </Button>
    </div>
  );
}

function PaymentCard({
  payment,
  deletingId,
  receiptLoadingId,
  onEdit,
  onReceipt,
  onDelete,
}: {
  payment: Payment;
  deletingId: string | null;
  receiptLoadingId: string | null;
  onEdit: (payment: Payment) => void;
  onReceipt: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
          <CreditCard size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">
                {formatMoney(payment.amount)}
              </p>
              <p className="text-xs font-medium text-slate-400">
                {getSaleNumber(payment)} - {payment.client_name || "Client"}
              </p>
            </div>

            <MethodPill method={payment.payment_method} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoBox label="Date" value={formatDate(payment.payment_date)} />
            <InfoBox label="Recu" value={payment.receipt_number || "A generer"} />
            <InfoBox label="Reference" value={payment.reference || "-"} />
            <InfoBox label="Solde" value={formatMoney(payment.balance_due)} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="outline" className="gap-2" onClick={() => onEdit(payment)}>
          <Edit size={15} />
          Modifier
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => onReceipt(payment)}
          disabled={receiptLoadingId === payment.id}
        >
          {receiptLoadingId === payment.id ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Download size={15} />
          )}
          PDF
        </Button>
        <Button
          variant="outline"
          className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
          onClick={() => onDelete(payment)}
          disabled={deletingId === payment.id}
        >
          {deletingId === payment.id ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Trash2 size={15} />
          )}
          Supprimer
        </Button>
      </div>
    </div>
  );
}

function PaymentModal({
  mode,
  sales,
  formData,
  saving,
  onClose,
  onSubmit,
  onChange,
}: {
  mode: "create" | "edit";
  sales: Sale[];
  formData: PaymentFormData;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof PaymentFormData, value: string) => void;
}) {
  const selectedSale = sales.find((sale) => sale.id === formData.sale_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {mode === "edit" ? "Modifier le paiement" : "Nouveau paiement"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Le backend recalculera automatiquement le solde de la facture.
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

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <FormField label="Facture" required>
            <select
              value={formData.sale_id}
              onChange={(event) => onChange("sale_id", event.target.value)}
              disabled={mode === "edit"}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            >
              <option value="">Choisir une facture</option>
              {sales.map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {getSaleNumber(sale)} - {sale.client_name || "Client"} - Solde{" "}
                  {formatMoney(sale.balance_due)}
                </option>
              ))}
            </select>
          </FormField>

          {selectedSale && (
            <div className="grid gap-3 rounded-2xl bg-slate-950 p-4 text-sm text-white md:grid-cols-3">
              <TotalBox label="Total facture" value={formatMoney(selectedSale.total_amount)} />
              <TotalBox label="Deja paye" value={formatMoney(selectedSale.amount_paid)} />
              <TotalBox label="Solde actuel" value={formatMoney(selectedSale.balance_due)} />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Date paiement">
              <input
                type="date"
                value={formData.payment_date}
                onChange={(event) => onChange("payment_date", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>

            <FormField label="Montant" required>
              <input
                type="number"
                min="0"
                value={formData.amount}
                onChange={(event) => onChange("amount", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Mode de paiement">
              <select
                value={formData.payment_method}
                onChange={(event) => onChange("payment_method", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="cash">Especes</option>
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="bank_transfer">Virement bancaire</option>
                <option value="card">Carte bancaire</option>
                <option value="check">Cheque</option>
                <option value="other">Autre</option>
              </select>
            </FormField>

            <FormField label="Reference">
              <input
                value={formData.reference}
                onChange={(event) => onChange("reference", event.target.value)}
                placeholder="Ex : Wave, cheque, virement..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>
          </div>

          <FormField label="Note">
            <textarea
              value={formData.note}
              onChange={(event) => onChange("note", event.target.value)}
              rows={3}
              placeholder="Note interne ou precision sur le paiement"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </FormField>

          {mode === "edit" && (
            <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-800">
              Modifier un paiement annule son ancien recu PDF. Generez un nouveau
              recu apres enregistrement.
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {mode === "edit" ? "Enregistrer" : "Ajouter paiement"}
            </Button>
          </div>
        </form>
      </div>
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
  icon: React.ElementType;
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

function MethodPill({ method }: { method?: string | null }) {
  return (
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {paymentMethodLabel(method)}
    </span>
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

function TotalBox({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function EmptyPaymentsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <CreditCard size={28} />
      </div>
      <p className="font-semibold text-slate-950">Aucun paiement trouve</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ajoutez un paiement pour solder une facture et generer un recu client.
      </p>
      <Button
        onClick={onCreate}
        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus size={18} />
        Nouveau paiement
      </Button>
    </div>
  );
}

export default PaymentsPage;
