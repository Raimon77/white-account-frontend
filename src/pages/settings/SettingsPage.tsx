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

type UserProfile = {
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

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "boutique">("profile");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [boutique, setBoutique] = useState<BoutiqueConfig>(DEFAULT_BOUTIQUE);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load logged-in user
    try {
      const userRaw = localStorage.getItem("white_account_user");
      if (userRaw) {
        setUser(JSON.parse(userRaw) as UserProfile);
      }
    } catch (e) {
      console.error(e);
    }

    // Load boutique config from localStorage if exists
    try {
      const boutiqueRaw = localStorage.getItem("white_account_boutique");
      if (boutiqueRaw) {
        setBoutique(JSON.parse(boutiqueRaw) as BoutiqueConfig);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  function handleSaveBoutique(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      localStorage.setItem("white_account_boutique", JSON.stringify(boutique));
      setSuccessMsg("Paramètres de la boutique enregistrés avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setErrorMsg("Impossible de sauvegarder localement les paramètres.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Settings Navigation Tabs */}
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
      </div>

      {/* Tabs Content */}
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

            <Card className="bg-white border shadow-sm rounded-2xl md:col-span-2">
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
          </div>
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
