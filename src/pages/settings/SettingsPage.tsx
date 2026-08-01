import axios from "axios";
import { useEffect, useState } from "react";
import {
  Boxes,
  Building2,
  Lock,
  Mail,
  Phone,
  Save,
  Shield,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import api from "@/api/api";
import UsersSettings from "./UsersSettings";

type UserProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  role?: string;
};

type BoutiqueConfig = {
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  taxNumber: string;
};

const DEFAULT_BOUTIQUE: BoutiqueConfig = {
  name: "Ma Boutique Principal",
  address: "Abidjan, Côte d'Ivoire",
  phone: "+225 07 00 00 00 00",
  email: "contact@maboutique.com",
  currency: "FCFA",
  taxNumber: "CI-ABJ-03-2026-B12-00452",
};

function getStoredUser(): UserProfile | null {
  try {
    const userRaw = localStorage.getItem("white_account_user");
    return userRaw ? (JSON.parse(userRaw) as UserProfile) : null;
  } catch {
    localStorage.removeItem("white_account_user");
    return null;
  }
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    return typeof data?.message === "string" ? data.message : fallback;
  }

  return fallback;
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "boutique" | "team">("profile");
  const [user] = useState<UserProfile | null>(getStoredUser);
  const [boutique, setBoutique] = useState<BoutiqueConfig>(DEFAULT_BOUTIQUE);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Password state
  const [pwdData, setPwdData] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data) {
          const newBoutique = {
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            currency: data.currency || "FCFA",
            taxNumber: data.taxNumber || ""
          };
          setBoutique(newBoutique);
          localStorage.setItem("white_account_boutique", JSON.stringify(newBoutique));
        }
      } catch (e) {
        console.error("Could not fetch settings from server", e);
        try {
          const boutiqueRaw = localStorage.getItem("white_account_boutique");
          if (boutiqueRaw) {
            setBoutique(JSON.parse(boutiqueRaw) as BoutiqueConfig);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    
    fetchSettings();
  }, []);

  async function handleSaveBoutique(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await api.put('/settings', boutique);
      localStorage.setItem("white_account_boutique", JSON.stringify(boutique));
      setSuccessMsg("Paramètres de la boutique enregistrés avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error: unknown) {
      setErrorMsg(
        getApiErrorMessage(
          error,
          "Erreur lors de la sauvegarde sur le serveur."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    
    if (pwdData.new_password !== pwdData.confirm_password) {
      setErrorMsg("Les nouveaux mots de passe ne correspondent pas.");
      setTimeout(() => setErrorMsg(""), 4000);
      return;
    }

    setSavingPwd(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      await api.patch("/auth/me/password", {
        current_password: pwdData.current_password,
        new_password: pwdData.new_password
      });
      setSuccessMsg("Votre mot de passe a été modifié avec succès !");
      setPwdData({ current_password: "", new_password: "", confirm_password: "" });
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (error: unknown) {
      setErrorMsg(
        getApiErrorMessage(
          error,
          "Erreur lors du changement de mot de passe."
        )
      );
      setTimeout(() => setErrorMsg(""), 4000);
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Paramètres</h2>
        <p className="mt-1 text-slate-500">
          Gérez votre profil utilisateur et configurez les informations de votre entreprise.
        </p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      <div className="flex border-b border-slate-200 gap-6 text-sm">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 font-semibold transition ${
            activeTab === "profile"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Profil Utilisateur
        </button>
        <button
          onClick={() => setActiveTab("boutique")}
          className={`pb-3 font-semibold transition ${
            activeTab === "boutique"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Informations Boutique
        </button>
        {user?.role === "admin" && (
          <button
            onClick={() => setActiveTab("team")}
            className={`pb-3 font-semibold transition flex items-center gap-1.5 ${
              activeTab === "team"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Shield size={14} /> Mon Équipe
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {activeTab === "profile" && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-white border shadow-sm rounded-2xl md:col-span-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-600 font-bold text-2xl shadow-inner mb-4">
                {(user?.full_name || "AD").slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-bold text-lg text-slate-900">{user?.full_name || "Admin User"}</h3>
              <p className="text-sm text-slate-500 mt-1 capitalize font-medium">{user?.role || "Administrateur"}</p>
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Shield size={12} /> Compte Actif
              </div>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <Card className="bg-white border shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Détails du compte
                  </CardTitle>
                  <CardDescription>
                    Vos informations de connexion et habilitations système.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 text-sm">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-slate-400 text-xs flex items-center gap-1">
                        <User size={13} /> Nom complet
                      </p>
                      <p className="font-semibold text-slate-800">{user?.full_name || "-"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-slate-400 text-xs flex items-center gap-1">
                        <Mail size={13} /> Adresse Email
                      </p>
                      <p className="font-semibold text-slate-800">{user?.email || "-"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-slate-400 text-xs flex items-center gap-1">
                        <Shield size={13} /> Rôle d'accès
                      </p>
                      <p className="font-bold text-blue-700 capitalize">{user?.role || "-"}</p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <p className="text-slate-400 text-xs flex items-center gap-1">
                        <Lock size={13} /> Sécurité
                      </p>
                      <p className="font-semibold text-slate-800">Authentification JWT</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Changer de mot de passe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Mot de passe actuel</label>
                        <input type="password" required className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={pwdData.current_password} onChange={e => setPwdData({...pwdData, current_password: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Nouveau mot de passe</label>
                        <input type="password" minLength={8} required className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={pwdData.new_password} onChange={e => setPwdData({...pwdData, new_password: e.target.value})} />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Confirmer le nouveau mot de passe</label>
                        <input type="password" minLength={8} required className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={pwdData.confirm_password} onChange={e => setPwdData({...pwdData, confirm_password: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={savingPwd} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                        Mettre à jour le mot de passe
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "team" && user?.role === "admin" && (
          <UsersSettings />
        )}

        {activeTab === "boutique" && (
          <form onSubmit={handleSaveBoutique} className="grid gap-6">
            <Card className="bg-white border shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-900">
                  Coordonnées de l'entreprise
                </CardTitle>
                <CardDescription>
                  Ces détails figureront sur les entêtes et bas de page des documents PDF générés (Factures, Devis, Bons).
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Building2 size={13} /> Nom de la boutique / Entreprise
                    </label>
                    <input
                      type="text"
                      required
                      value={boutique.name}
                      onChange={(e) => setBoutique((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Boxes size={13} /> Numéro d'Identifiant Fiscal (NIF/RCCM)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: CI-ABJ-..."
                      value={boutique.taxNumber}
                      onChange={(e) => setBoutique((p) => ({ ...p, taxNumber: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Phone size={13} /> Téléphone de contact
                    </label>
                    <input
                      type="text"
                      required
                      value={boutique.phone}
                      onChange={(e) => setBoutique((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Mail size={13} /> Email de contact
                    </label>
                    <input
                      type="email"
                      required
                      value={boutique.email}
                      onChange={(e) => setBoutique((p) => ({ ...p, email: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">
                      Adresse Géographique
                    </label>
                    <input
                      type="text"
                      required
                      value={boutique.address}
                      onChange={(e) => setBoutique((p) => ({ ...p, address: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Devise principale
                    </label>
                    <select
                      value={boutique.currency}
                      onChange={(e) => setBoutique((p) => ({ ...p, currency: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="FCFA">Franc CFA (FCFA)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollar ($)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-xl flex items-center gap-1.5"
                  >
                    <Save size={16} />
                    Sauvegarder les paramètres
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
