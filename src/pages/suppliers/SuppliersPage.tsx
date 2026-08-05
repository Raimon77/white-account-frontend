import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Edit,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
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

type Supplier = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string;
};

type SupplierFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const emptyForm: SupplierFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function SuppliersPage() {
  const [suppliers, setFournisseurs] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>(emptyForm);

  const loadFournisseurs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/suppliers");

      const data = response.data;

      if (Array.isArray(data)) {
        setFournisseurs(data);
      } else if (Array.isArray(data.suppliers)) {
        setFournisseurs(data.suppliers);
      } else if (Array.isArray(data.data)) {
        setFournisseurs(data.data);
      } else {
        setFournisseurs([]);
      }
    } catch {
      setError("Impossible de charger les fournisseurs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadFournisseurs(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadFournisseurs]);

  const filteredFournisseurs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return suppliers;

    return suppliers.filter((supplier) => {
      return (
        supplier.name?.toLowerCase().includes(keyword) ||
        supplier.email?.toLowerCase().includes(keyword) ||
        supplier.phone?.toLowerCase().includes(keyword) ||
        supplier.address?.toLowerCase().includes(keyword)
      );
    });
  }, [suppliers, search]);

  function openCreateModal() {
    setEditingSupplier(null);
    setFormData(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingSupplier(null);
    setFormData(emptyForm);
  }

  function updateForm(field: keyof SupplierFormData, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Le nom du supplier est obligatoire.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      };

      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }

      await loadFournisseurs();
      closeModal();
    } catch {
      setError(
        editingSupplier
          ? "Impossible de modifier le fournisseur."
          : "Impossible de créer le fournisseur."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = window.confirm(
      `Supprimer le fournisseur "${supplier.name}" ?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(supplier.id);
      setError("");

      await api.delete(`/suppliers/${supplier.id}`);

      await loadFournisseurs();
    } catch {
      setError("Impossible de supprimer ce fournisseur.");
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
                Module commercial
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Fournisseurs
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Gérez vos suppliers, leurs contacts, adresses et informations
                commerciales.
              </p>
            </div>

            <Button
              onClick={openCreateModal}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Nouveau fournisseur
            </Button>
          </div>
        </div>
      </div>

      {/* Stat + recherche */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Users size={26} />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">
                Total suppliers
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {suppliers.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par nom, email, téléphone ou adresse..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Liste */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Liste des suppliers</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {filteredFournisseurs.length} supplier(s) affiché(s)
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Chargement des suppliers...
              </div>
            </div>
          ) : filteredFournisseurs.length === 0 ? (
            <EmptyFournisseursState onCreate={openCreateModal} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="app-horizontal-scroll hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Adresse</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredFournisseurs.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                              {supplier.name.slice(0, 2).toUpperCase()}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-950">
                                {supplier.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                ID : {supplier.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <InfoText icon={Phone} value={supplier.phone} />
                            <InfoText icon={Mail} value={supplier.email} />
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          <InfoText icon={MapPin} value={supplier.address} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openEditModal(supplier)}
                            >
                              <Edit size={15} />
                              Modifier
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                              onClick={() => handleDelete(supplier)}
                              disabled={deletingId === supplier.id}
                            >
                              {deletingId === supplier.id ? (
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

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredFournisseurs.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                        {supplier.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">
                          {supplier.name}
                        </p>

                        <div className="mt-2 space-y-1">
                          <InfoText icon={Phone} value={supplier.phone} />
                          <InfoText icon={Mail} value={supplier.email} />
                          <InfoText icon={MapPin} value={supplier.address} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openEditModal(supplier)}
                      >
                        <Edit size={15} />
                        Modifier
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                        onClick={() => handleDelete(supplier)}
                        disabled={deletingId === supplier.id}
                      >
                        {deletingId === supplier.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
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
        <SupplierModal
          editingSupplier={editingSupplier}
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

function InfoText({
  icon: Icon,
  value,
}: {
  icon: React.ElementType;
  value?: string | null;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Icon size={15} className="shrink-0 text-slate-400" />
      <span className="truncate">{value || "-"}</span>
    </div>
  );
}

function EmptyFournisseursState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <UserPlus size={28} />
      </div>

      <p className="font-semibold text-slate-950">Aucun fournisseur trouvé</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ajoutez votre premier supplier pour commencer à créer des ventes,
        factures, devis et paiements.
      </p>

      <Button
        onClick={onCreate}
        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus size={18} />
        Nouveau fournisseur
      </Button>
    </div>
  );
}

type SupplierModalProps = {
  editingSupplier: Supplier | null;
  formData: SupplierFormData;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof SupplierFormData, value: string) => void;
};

function SupplierModal({
  editingSupplier,
  formData,
  saving,
  onClose,
  onSubmit,
  onChange,
}: SupplierModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {editingSupplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingSupplier
                ? "Mettez à jour les informations du supplier."
                : "Ajoutez un fournisseur à votre base commerciale."}
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
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Nom du fournisseur <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Ex : Supplier Test"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Téléphone
              </label>
              <input
                value={formData.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                placeholder="Ex : 770000000"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => onChange("email", event.target.value)}
                placeholder="supplier@email.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Adresse
            </label>
            <textarea
              value={formData.address}
              onChange={(event) => onChange("address", event.target.value)}
              placeholder="Ex : Dakar, Senegal"
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
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
              {editingSupplier ? "Enregistrer" : "Créer le fournisseur"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuppliersPage;
