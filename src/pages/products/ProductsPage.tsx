import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  Edit,
  Loader2,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import api from "@/api/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Product = {
  id: string;
  reference: string;
  name: string;
  purchase_price?: number | string | null;
  sale_price?: number | string | null;
  selling_price?: number | string | null;
  purchase_cost?: number | string | null;
  stock_quantity?: number | string | null;
  alert_threshold?: number | string | null;
  created_at?: string;
  track_stock?: boolean;
};

type ProductFormData = {
  reference: string;
  name: string;
  purchase_price: string;
  sale_price: string;
  stock_quantity: string;
  alert_threshold: string;
};

const emptyForm: ProductFormData = {
  reference: "",
  name: "",
  purchase_price: "0",
  sale_price: "0",
  stock_quantity: "0",
  alert_threshold: "0",
};

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

function formatMoney(value: number | string | null | undefined) {
  return `${toNumber(value).toLocaleString("fr-FR")} FCFA`;
}

function getPurchasePrice(product: Product) {
  return toNumber(product.purchase_price ?? product.purchase_cost);
}

function getSalePrice(product: Product) {
  return toNumber(product.sale_price ?? product.selling_price);
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/products");
      const data = response.data;

      if (Array.isArray(data)) {
        setProducts(data);
      } else if (Array.isArray(data.products)) {
        setProducts(data.products);
      } else if (Array.isArray(data.data)) {
        setProducts(data.data);
      } else {
        setProducts([]);
      }
    } catch {
      setError("Impossible de charger les produits.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadProducts(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return products;

    return products.filter((product) => {
      return (
        product.reference?.toLowerCase().includes(keyword) ||
        product.name?.toLowerCase().includes(keyword)
      );
    });
  }, [products, search]);

  const serviceProducts = useMemo(
    () => products.filter((product) => product.track_stock === false),
    [products]
  );

  function openCreateModal() {
    setEditingProduct(null);
    setFormData(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);

    setFormData({
      reference: product.reference || "",
      name: product.name || "",
      purchase_price: String(getPurchasePrice(product)),
      sale_price: String(getSalePrice(product)),
      stock_quantity: String(toNumber(product.stock_quantity)),
      alert_threshold: String(toNumber(product.alert_threshold)),
    });

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
    setFormData(emptyForm);
  }

  function updateForm(field: keyof ProductFormData, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.reference.trim()) {
      setError("La référence du produit est obligatoire.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Le nom du produit est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        reference: formData.reference.trim(),
        name: formData.name.trim(),
        purchase_price: 0,
        sale_price: Number(formData.sale_price || 0),
        stock_quantity: 0,
        alert_threshold: 0,
        track_stock: false,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post("/products", payload);
      }

      await loadProducts();
      closeModal();
    } catch {
      setError(
        editingProduct
          ? "Impossible de modifier le produit."
          : "Impossible de créer le produit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Supprimer le produit "${product.name}" ?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(product.id);
      setError("");

      await api.delete(`/products/${product.id}`);

      await loadProducts();
    } catch {
      setError(
        "Impossible de supprimer ce produit. Il est peut-être déjà utilisé dans une vente ou un achat."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-blue-50" />
          <div className="absolute bottom-0 right-24 h-20 w-20 rounded-full bg-orange-50" />

          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Catalogue de services
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Produits
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Gérez vos références, prix d’achat, prix de vente, stock et
                seuils d’alerte.
              </p>
            </div>

            <Button
              onClick={openCreateModal}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Nouveau service
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total produits"
          value={String(products.length)}
          icon={Package}
          colorClassName="bg-blue-50 text-blue-700"
        />

        <StatCard
          title="Services sans stock"
          value={String(serviceProducts.length)}
          icon={AlertTriangle}
          colorClassName="bg-orange-50 text-orange-600"
          danger={false}
        />

        <StatCard
          title="Produits physiques"
          value={String(products.length - serviceProducts.length)}
          icon={Boxes}
          colorClassName="bg-green-50 text-green-700"
        />

        <StatCard
          title="Produits affichés"
          value={String(filteredProducts.length)}
          icon={Tag}
          colorClassName="bg-violet-50 text-violet-700"
        />
      </div>

      {/* Search */}
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
              placeholder="Rechercher par référence ou nom du produit..."
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

      {/* Liste */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Liste des produits</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {filteredProducts.length} produit(s) affiché(s)
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Chargement des produits...
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyProductsState onCreate={openCreateModal} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="app-horizontal-scroll hidden overflow-x-auto rounded-2xl border border-slate-200 lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Produit</th>
                      <th className="px-4 py-3 text-right">Type</th>
                      <th className="px-4 py-3 text-right">Prix vente</th>
                      <th className="px-4 py-3 text-right">Stock</th>
                      <th className="px-4 py-3 text-right">Seuil</th>
                      <th className="px-4 py-3 text-right">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredProducts.map((product) => {
                      const stock = toNumber(product.stock_quantity);
                      const threshold = toNumber(product.alert_threshold);
                      const lowStock = threshold > 0 && stock <= threshold;

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                <Package size={20} />
                              </div>

                              <div>
                                <p className="font-semibold text-slate-950">
                                  {product.name}
                                </p>
                                <p className="text-xs font-medium text-slate-400">
                                  {product.reference}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-right font-medium text-slate-700">
                            {product.track_stock === false ? "Service" : "Produit"}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold text-green-700">
                            {formatMoney(getSalePrice(product))}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-slate-950">
                            {product.track_stock === false ? "—" : stock}
                          </td>

                          <td className="px-4 py-4 text-right text-slate-600">
                            {product.track_stock === false ? "—" : threshold}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <StockStatus lowStock={lowStock} tracked={product.track_stock !== false} />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => openEditModal(product)}
                              >
                                <Edit size={15} />
                                Modifier
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                                onClick={() => handleDelete(product)}
                                disabled={deletingId === product.id}
                              >
                                {deletingId === product.id ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
                                )}
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 lg:hidden">
                {filteredProducts.map((product) => {
                  const stock = toNumber(product.stock_quantity);
                  const threshold = toNumber(product.alert_threshold);
                  const lowStock = threshold > 0 && stock <= threshold;

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <Package size={21} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">
                                {product.name}
                              </p>
                              <p className="text-xs font-medium text-slate-400">
                                {product.reference}
                              </p>
                            </div>

                            <StockStatus lowStock={lowStock} tracked={product.track_stock !== false} />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <InfoBox
                              label="Type"
                              value={product.track_stock === false ? "Service" : "Produit"}
                            />
                            <InfoBox
                              label="Prix vente"
                              value={formatMoney(getSalePrice(product))}
                            />
                            {product.track_stock !== false && <InfoBox label="Stock" value={String(stock)} />}
                            {product.track_stock !== false && <InfoBox label="Seuil" value={String(threshold)} />}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => openEditModal(product)}
                        >
                          <Edit size={15} />
                          Modifier
                        </Button>

                        <Button
                          variant="outline"
                          className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                          onClick={() => handleDelete(product)}
                          disabled={deletingId === product.id}
                        >
                          {deletingId === product.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <ProductModal
          editingProduct={editingProduct}
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

function StockStatus({ lowStock, tracked }: { lowStock: boolean; tracked: boolean }) {
  if (!tracked) {
    return <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Sans stock</span>;
  }
  return lowStock ? (
    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">
      Stock bas
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
      Stock OK
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

function EmptyProductsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <Package size={28} />
      </div>

      <p className="font-semibold text-slate-950">Aucun produit trouvé</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ajoutez votre premier produit pour commencer à gérer le stock, les
        achats et les ventes.
      </p>

      <Button
        onClick={onCreate}
        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus size={18} />
        Nouveau produit
      </Button>
    </div>
  );
}

type ProductModalProps = {
  editingProduct: Product | null;
  formData: ProductFormData;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof ProductFormData, value: string) => void;
};

function ProductModal({
  editingProduct,
  formData,
  saving,
  onClose,
  onSubmit,
  onChange,
}: ProductModalProps) {
  return (
    <div className="pwa-modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {editingProduct ? "Modifier le service" : "Nouveau service"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingProduct
                ? "Mettez à jour les informations du service."
                : "Ajoutez un abonnement vendu sans gestion de stock."}
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Référence <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.reference}
                onChange={(event) =>
                  onChange("reference", event.target.value)
                }
                placeholder="Ex : PRD-001"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                value={formData.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Ex : Produit Test"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div>
            <NumberInput
              label="Prix de vente par défaut"
              value={formData.sale_price}
              onChange={(value) => onChange("sale_price", value)}
            />
          </div>

          <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
            Les ventes de ce service ne nécessitent aucun achat préalable et ne modifient aucun stock.
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Annuler
            </Button>

            <Button
              type="submit"
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {editingProduct ? "Enregistrer" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

export default ProductsPage;
