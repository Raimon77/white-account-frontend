import { useEffect, useMemo, useState, type FormEvent } from "react";
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

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string;
};

type ClientFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const emptyForm: ClientFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyForm);

  async function loadClients() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/clients");

      const data = response.data;

      if (Array.isArray(data)) {
        setClients(data);
      } else if (Array.isArray(data.clients)) {
        setClients(data.clients);
      } else if (Array.isArray(data.data)) {
        setClients(data.data);
      } else {
        setClients([]);
      }
    } catch {
      setError("Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return clients;

    return clients.filter((client) => {
      return (
        client.name?.toLowerCase().includes(keyword) ||
        client.email?.toLowerCase().includes(keyword) ||
        client.phone?.toLowerCase().includes(keyword) ||
        client.address?.toLowerCase().includes(keyword)
      );
    });
  }, [clients, search]);

  function openCreateModal() {
    setEditingClient(null);
    setFormData(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setFormData({
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingClient(null);
    setFormData(emptyForm);
  }

  function updateForm(field: keyof ClientFormData, value: string) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formData.name.trim()) {
      setError("Le nom du client est obligatoire.");
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

      if (editingClient) {
        await api.put(`/clients/${editingClient.id}`, payload);
      } else {
        await api.post("/clients", payload);
      }

      await loadClients();
      closeModal();
    } catch {
      setError(
        editingClient
          ? "Impossible de modifier le client."
          : "Impossible de créer le client."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `Supprimer le client "${client.name}" ?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(client.id);
      setError("");

      await api.delete(`/clients/${client.id}`);

      await loadClients();
    } catch {
      setError("Impossible de supprimer ce client.");
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
                Clients
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Gérez vos clients, leurs contacts, adresses et informations
                commerciales.
              </p>
            </div>

            <Button
              onClick={openCreateModal}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={18} />
              Nouveau client
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
                Total clients
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-950">
                {clients.length}
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
            <CardTitle>Liste des clients</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {filteredClients.length} client(s) affiché(s)
            </p>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-60 items-center justify-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Chargement des clients...
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <EmptyClientsState onCreate={openCreateModal} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Adresse</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-950">
                                {client.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                ID : {client.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <InfoText icon={Phone} value={client.phone} />
                            <InfoText icon={Mail} value={client.email} />
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-600">
                          <InfoText icon={MapPin} value={client.address} />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => openEditModal(client)}
                            >
                              <Edit size={15} />
                              Modifier
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                              onClick={() => handleDelete(client)}
                              disabled={deletingId === client.id}
                            >
                              {deletingId === client.id ? (
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
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-950">
                          {client.name}
                        </p>

                        <div className="mt-2 space-y-1">
                          <InfoText icon={Phone} value={client.phone} />
                          <InfoText icon={Mail} value={client.email} />
                          <InfoText icon={MapPin} value={client.address} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => openEditModal(client)}
                      >
                        <Edit size={15} />
                        Modifier
                      </Button>

                      <Button
                        variant="outline"
                        className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 admin-only"
                        onClick={() => handleDelete(client)}
                        disabled={deletingId === client.id}
                      >
                        {deletingId === client.id ? (
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
        <ClientModal
          editingClient={editingClient}
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

function EmptyClientsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <UserPlus size={28} />
      </div>

      <p className="font-semibold text-slate-950">Aucun client trouvé</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Ajoutez votre premier client pour commencer à créer des ventes,
        factures, devis et paiements.
      </p>

      <Button
        onClick={onCreate}
        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
      >
        <Plus size={18} />
        Nouveau client
      </Button>
    </div>
  );
}

type ClientModalProps = {
  editingClient: Client | null;
  formData: ClientFormData;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof ClientFormData, value: string) => void;
};

function ClientModal({
  editingClient,
  formData,
  saving,
  onClose,
  onSubmit,
  onChange,
}: ClientModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">
              {editingClient ? "Modifier le client" : "Nouveau client"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {editingClient
                ? "Mettez à jour les informations du client."
                : "Ajoutez un client à votre base commerciale."}
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
              Nom du client <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="Ex : Client Test"
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
                placeholder="client@email.com"
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
              {editingClient ? "Enregistrer" : "Créer le client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientsPage;