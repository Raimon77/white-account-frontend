import axios from "axios";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/api/api";

type UserType = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    return typeof data?.message === "string" ? data.message : fallback;
  }

  return fallback;
}

export default function UsersSettings() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ full_name: "", email: "", password: "", role: "employee" });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await api.get("/users");
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/users", formData);
      setShowForm(false);
      setFormData({ full_name: "", email: "", password: "", role: "employee" });
      fetchUsers();
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, "Erreur lors de la création"));
    }
  }

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    if (!window.confirm(`Voulez-vous vraiment ${currentStatus ? 'désactiver' : 'réactiver'} cet utilisateur ?`)) return;
    try {
      const endpoint = currentStatus ? `/users/${userId}/deactivate` : `/users/${userId}/activate`;
      await api.patch(endpoint);
      fetchUsers();
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, "Erreur de statut"));
    }
  }

  async function handleDeleteUser(user: UserType) {
    const confirmed = window.confirm(
      `Supprimer définitivement le compte de ${user.full_name} ?\n\nSon accès sera supprimé immédiatement. L'historique des opérations sera conservé.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(user.id);
      await api.delete(`/users/${user.id}`);
      await fetchUsers();
    } catch (error: unknown) {
      alert(getApiErrorMessage(error, "Erreur lors de la suppression"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Gestion de l'équipe</h3>
          <p className="text-sm text-slate-500">Ajoutez et gérez les accès de vos employés.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus size={16} className="mr-2" />
            Nouvel employé
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-blue-100 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base">Créer un compte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Nom complet</label>
                <input required className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Email</label>
                <input required type="email" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Mot de passe provisoire</label>
                <input required type="password" minLength={8} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Rôle</label>
                <select className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="employee">Vendeur (Consultation & Vente)</option>
                  <option value="manager">Manager (Gestion avancée)</option>
                  <option value="admin">Administrateur (Contrôle total)</option>
                </select>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Créer le compte</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {users.map(u => (
          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border rounded-xl shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 flex items-center justify-center rounded-full font-bold text-lg ${u.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                {u.full_name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900">{u.full_name}</p>
                <p className="text-xs text-slate-500">{u.email} • <span className="capitalize font-semibold text-blue-600">{u.role}</span></p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {u.role !== 'admin' && (
                <>
                  <Button
                    variant={u.is_active ? "destructive" : "outline"}
                    size="sm"
                    className={!u.is_active ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : ""}
                    onClick={() => handleToggleStatus(u.id, u.is_active)}
                    disabled={deletingId === u.id}
                  >
                    {u.is_active ? <UserX size={14} className="mr-1.5"/> : <UserCheck size={14} className="mr-1.5"/>}
                    {u.is_active ? "Désactiver" : "Réactiver"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDeleteUser(u)}
                    disabled={deletingId === u.id}
                  >
                    {deletingId === u.id ? (
                      <Loader2 size={14} className="mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 size={14} className="mr-1.5" />
                    )}
                    Supprimer
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-center text-slate-500 py-4 text-sm">Chargement de l'équipe...</p>}
      </div>
    </div>
  )
}
