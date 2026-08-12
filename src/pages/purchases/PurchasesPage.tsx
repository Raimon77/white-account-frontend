import axios from "axios";
import { useCallback, useEffect, useMemo, useState, type ElementType, type FormEvent } from "react";
import {
  Edit,
  Eye,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
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

type Product = {
  id: string;
  reference: string;
  name: string;
  purchase_price?: number | string | null;
  purchase_cost?: number | string | null;
  stock_quantity?: number | string | null;
};

type Supplier = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type Purchase = {
  id: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  supplier_email?: string | null;
  supplier_phone?: string | null;
  purchase_date?: string;
  date?: string;
  purchase_number?: string | null;
  invoice_number?: string | null;
  reference?: string | null;
  observation?: string | null;
  total_amount?: number | string | null;
  total?: number | string | null;
  created_at?: string;
};

type PurchaseItem = {
  id?: string;
  purchase_id?: string;
  product_id: string;
  reference?: string;
  product_name?: string;
  quantity: number | string;
  unit_price: number | string;
  purchase_price?: number | string | null;
  total_price?: number | string | null;
};

type PurchaseDetails = {
  purchase: Purchase;
  items: PurchaseItem[];
};

type PurchaseLine = {
  product_id: string;
  quantity: string;
  unit_price: string;
};

type PurchaseFormData = {
  supplier_id: string;
  purchase_date: string;
  observation: string;
  items: PurchaseLine[];
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: PurchaseFormData = {
  supplier_id: "",
  purchase_date: getTodayDate(),
  observation: "",
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

function formatDate(dateValue?: string) {
  if (!dateValue) return "-";

  return new Date(dateValue).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getPurchaseNumber(purchase: Purchase) {
  return (
    purchase.purchase_number ||
    purchase.invoice_number ||
    purchase.reference ||
    `ACH-${purchase.id.slice(0, 8)}`
  );
}

function getPurchaseAmount(purchase: Purchase) {
  return toNumber(purchase.total_amount ?? purchase.total);
}

function getProductPurchasePrice(product?: Product) {
  if (!product) return 0;
  return toNumber(product.purchase_price ?? product.purchase_cost);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || fallback;
  }

  return fallback;
}

function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState<PurchaseFormData>(emptyForm);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<PurchaseDetails | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [purchasesResponse, productsResponse, suppliersResponse] =
        await Promise.all([
          api.get("/purchases"),
          api.get("/products"),
          api.get("/suppliers"),
        ]);

      setPurchases(normalizeArray<Purchase>(purchasesResponse.data, "purchases"));
      setProducts(normalizeArray<Product>(productsResponse.data, "products"));
      setSuppliers(normalizeArray<Supplier>(suppliersResponse.data, "suppliers"));
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de charger les achats, produits ou fournisseurs."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const filteredPurchases = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return purchases.filter((purchase) => {
      const number = getPurchaseNumber(purchase);
      const matchesSearch =
        !keyword ||
        number.toLowerCase().includes(keyword) ||
        purchase.supplier_name?.toLowerCase().includes(keyword) ||
        purchase.observation?.toLowerCase().includes(keyword) ||
        purchase.id.toLowerCase().includes(keyword);

      return (
        matchesMonth(purchase.purchase_date || purchase.date, monthFilter) &&
        matchesSearch
      );
    });
  }, [purchases, search, monthFilter]);

  const totalPurchasesAmount = useMemo(() => {
    return filteredPurchases.reduce((total, purchase) => {
      return total + getPurchaseAmount(purchase);
    }, 0);
  }, [filteredPurchases]);

  const formTotal = useMemo(() => {
    return formData.items.reduce((total, item) => {
      return total + Number(item.quantity || 0) * Number(item.unit_price || 0);
    }, 0);
  }, [formData.items]);

  function openCreateModal() {
    setEditingPurchase(null);
    setFormData({
      ...emptyForm,
      purchase_date: getTodayDate(),
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

  async function openEditModal(purchase: Purchase) {
    try {
      setDetailsLoadingId(purchase.id);
      setError("");

      const response = await api.get<PurchaseDetails>(`/purchases/${purchase.id}`);
      const details = response.data;

      setEditingPurchase(details.purchase);
      setFormData({
        supplier_id: details.purchase.supplier_id || "",
        purchase_date: (details.purchase.purchase_date || details.purchase.date || getTodayDate()).slice(0, 10),
        observation: details.purchase.observation || "",
        items:
          details.items.length > 0
            ? details.items.map((item) => ({
                product_id: item.product_id,
                quantity: String(toNumber(item.quantity)),
                unit_price: String(toNumber(item.unit_price ?? item.purchase_price)),
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
      setError(getErrorMessage(error, "Impossible de charger l’achat à modifier."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  async function openDetailsModal(purchase: Purchase) {
    try {
      setDetailsLoadingId(purchase.id);
      setError("");

      const response = await api.get<PurchaseDetails>(`/purchases/${purchase.id}`);

      setSelectedDetails(response.data);
      setDetailsModalOpen(true);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger le détail de l’achat."));
    } finally {
      setDetailsLoadingId(null);
    }
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingPurchase(null);
    setFormData(emptyForm);
  }

  function closeDetailsModal() {
    setDetailsModalOpen(false);
    setSelectedDetails(null);
  }

  function updateForm(field: keyof PurchaseFormData, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateLine(index: number, field: keyof PurchaseLine, value: string) {
    setFormData((previous) => {
      const newItems = [...previous.items];

      newItems[index] = {
        ...newItems[index],
        [field]: value,
      };

      if (field === "product_id") {
        const selectedProduct = products.find((product) => product.id === value);
        newItems[index].unit_price = String(getProductPurchasePrice(selectedProduct));
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

    if (!formData.supplier_id) {
      setError("Le fournisseur est obligatoire.");
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
      setError("Ajoute au moins un produit valide dans l’achat.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        supplier_id: formData.supplier_id,
        purchase_date: formData.purchase_date,
        observation: formData.observation.trim() || null,
        note: formData.observation.trim() || null,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          quantity: Number(item.quantity || 0),
          unit_price: Number(item.unit_price || 0),
          purchase_price: Number(item.unit_price || 0),
          unit_cost: Number(item.unit_price || 0),
        })),
      };

      if (editingPurchase) {
        await api.put(`/purchases/${editingPurchase.id}`, payload);
      } else {
        await api.post("/purchases", payload);
      }

      await loadData();
      closeModal();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          editingPurchase
            ? "Impossible de modifier l’achat."
            : "Impossible de créer l’achat."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(purchase: Purchase) {
    const confirmed = window.confirm(
      `Supprimer l’achat "${getPurchaseNumber(purchase)}" ?\n\nLe stock ajouté par cet achat sera retiré automatiquement.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(purchase.id);
      setError("");

      await api.delete(`/purchases/${purchase.id}`);
      await loadData();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Impossible de supprimer cet achat. Le stock est peut-être insuffisant car des produits ont déjà été vendus."
        )
      );
    } finally {
      setDeletingId(null);
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
                Approvisionnement
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Achats
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Créez, modifiez ou supprimez les achats fournisseurs. Le stock
                est corrigé automatiquement côté backend.
              </p>
            </div>

            <Button
              onClick={openCreateModal}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Nouvel achat
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total achats"
          value={String(filteredPurchases.length)}
          icon={ShoppingCart}
          colorClassName="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="Montant achats"
          value={formatMoney(totalPurchasesAmount)}
          icon={Wallet}
          colorClassName="bg-green-50 text-green-700"
        />

        <StatCard
          title="Fournisseurs"
          value={String(suppliers.length)}
          icon={Truck}
          colorClassName="bg-orange-50 text-orange-600"
        />

        <StatCard
          title="Produits"
          value={String(products.length)}
          icon={Package}
          colorClassName="bg-violet-50 text-violet-700"
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
              placeholder="Rechercher par numéro, fournisseur ou observation..."
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

      <Card>
        <CardHeader>
          <CardTitle>Liste des achats</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {filteredPurchases.length} achat(s) affiché(s)
          </p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Chargement des achats...
              </div>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <EmptyPurchasesState onCreate={openCreateModal} />
          ) : (
            <>
              <div className="app-horizontal-scroll hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Achat</th>
                      <th className="px-4 py-3">Fournisseur</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPurchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                              <ShoppingCart size={20} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-950">
                                {getPurchaseNumber(purchase)}
                              </p>
                              <p className="text-xs text-slate-400">
                                ID : {purchase.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {purchase.supplier_name || "-"}
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          {formatDate(purchase.purchase_date || purchase.date)}
                        </td>

                        <td className="px-4 py-4 text-right font-bold text-slate-950">
                          {formatMoney(getPurchaseAmount(purchase))}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openDetailsModal(purchase)}
                              disabled={detailsLoadingId === purchase.id}
                            >
                              {detailsLoadingId === purchase.id ? (
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
                              onClick={() => openEditModal(purchase)}
                              disabled={detailsLoadingId === purchase.id}
                            >
                              <Edit size={15} />
                              Modifier
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                              onClick={() => handleDelete(purchase)}
                              disabled={deletingId === purchase.id}
                            >
                              {deletingId === purchase.id ? (
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

              <div className="space-y-3 lg:hidden">
                {filteredPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                        <ShoppingCart size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">
                          {getPurchaseNumber(purchase)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {purchase.supplier_name || "Fournisseur non renseigné"}
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <InfoBox
                            label="Date"
                            value={formatDate(purchase.purchase_date || purchase.date)}
                          />
                          <InfoBox
                            label="Montant"
                            value={formatMoney(getPurchaseAmount(purchase))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openDetailsModal(purchase)}
                      >
                        <Eye size={15} />
                        Voir
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openEditModal(purchase)}
                      >
                        <Edit size={15} />
                        Modifier
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                        onClick={() => handleDelete(purchase)}
                        disabled={deletingId === purchase.id}
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
        <PurchaseModal
          mode={editingPurchase ? "edit" : "create"}
          suppliers={suppliers}
          products={products}
          formData={formData}
          formTotal={formTotal}
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
        <PurchaseDetailsModal
          details={selectedDetails}
          onClose={closeDetailsModal}
          onEdit={() => {
            closeDetailsModal();
            openEditModal(selectedDetails.purchase);
          }}
        />
      )}
    </div>
  );
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

function StatCard({
  title,
  value,
  icon: Icon,
  colorClassName,
}: {
  title: string;
  value: string;
  icon: ElementType;
  colorClassName: string;
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
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
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

function EmptyPurchasesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <ShoppingCart size={28} />
      </div>

      <p className="font-semibold text-slate-950">Aucun achat trouvé</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ajoutez votre premier achat pour alimenter le stock et suivre vos coûts.
      </p>

      <Button
        onClick={onCreate}
        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus size={18} />
        Nouvel achat
      </Button>
    </div>
  );
}

type PurchaseModalProps = {
  mode: "create" | "edit";
  suppliers: Supplier[];
  products: Product[];
  formData: PurchaseFormData;
  formTotal: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof PurchaseFormData, value: string) => void;
  onLineChange: (index: number, field: keyof PurchaseLine, value: string) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
};

function PurchaseModal({
  mode,
  suppliers,
  products,
  formData,
  formTotal,
  saving,
  onClose,
  onSubmit,
  onChange,
  onLineChange,
  onAddLine,
  onRemoveLine,
}: PurchaseModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6 lg:p-10">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {mode === "edit" ? "Modifier l’achat" : "Nouvel achat"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "edit"
                ? "Le backend retire l’ancien impact stock puis applique les nouvelles lignes."
                : "Sélectionnez un fournisseur et ajoutez les produits achetés."}
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
            <FormField label="Fournisseur" required>
              <select
                value={formData.supplier_id}
                onChange={(event) => onChange("supplier_id", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              >
                <option value="">Choisir un fournisseur</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Date d’achat">
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(event) => onChange("purchase_date", event.target.value)}
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
                placeholder="Ex : Achat de réapprovisionnement"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </FormField>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-slate-950">Produits achetés</p>
                <p className="text-sm text-slate-500">
                  Le prix d’achat est modifiable sur chaque ligne.
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
                const lineTotal =
                  Number(item.quantity || 0) * Number(item.unit_price || 0);

                return (
                  <div
                    key={index}
                    className="grid gap-2 rounded-xl bg-slate-50 p-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(5rem,0.5fr)_minmax(7rem,0.7fr)_minmax(7rem,0.75fr)_auto]"
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
                            {product.reference} - {product.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <NumberField
                      label="Quantité"
                      value={item.quantity}
                      onChange={(value) => onLineChange(index, "quantity", value)}
                    />

                    <NumberField
                      label="Prix achat"
                      value={item.unit_price}
                      onChange={(value) => onLineChange(index, "unit_price", value)}
                    />

                    <FormField label="Total" small>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-950">
                        {formatMoney(lineTotal)}
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

          <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white md:flex-row md:items-center">
            <div>
              <p className="text-sm text-slate-300">Total de l’achat</p>
              <p className="mt-1 text-2xl font-bold">{formatMoney(formTotal)}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
                {mode === "edit" ? "Enregistrer les modifications" : "Enregistrer l’achat"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function PurchaseDetailsModal({
  details,
  onClose,
  onEdit,
}: {
  details: PurchaseDetails;
  onClose: () => void;
  onEdit: () => void;
}) {
  const purchase = details.purchase;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Détail achat {getPurchaseNumber(purchase)}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fournisseur : {purchase.supplier_name || "-"} · Date :{" "}
              {formatDate(purchase.purchase_date || purchase.date)}
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
          <div className="grid gap-4 md:grid-cols-3">
            <InfoBox label="Fournisseur" value={purchase.supplier_name || "-"} />
            <InfoBox
              label="Date"
              value={formatDate(purchase.purchase_date || purchase.date)}
            />
            <InfoBox
              label="Montant"
              value={formatMoney(getPurchaseAmount(purchase))}
            />
          </div>

          {purchase.observation && (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Observation
              </p>
              <p className="mt-1 text-sm text-slate-700">{purchase.observation}</p>
            </div>
          )}

          <div className="app-horizontal-scroll mt-5 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3 text-right">Quantité</th>
                  <th className="px-4 py-3 text-right">Prix achat</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {details.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">
                        {item.product_name || "-"}
                      </p>
                      <p className="text-xs text-slate-400">{item.reference || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {toNumber(item.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(item.unit_price ?? item.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {formatMoney(item.total_price)}
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

            <Button
              type="button"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={onEdit}
            >
              <Edit size={16} />
              Modifier cet achat
            </Button>
          </div>
        </div>
      </div>
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
  children: React.ReactNode;
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

export default PurchasesPage;
