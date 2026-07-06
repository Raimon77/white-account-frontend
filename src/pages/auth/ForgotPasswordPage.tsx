import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck, ArrowLeft, KeyRound, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.post("/auth/forgot-password", { email });
      setSuccess("Si ce compte existe, un code à 6 chiffres a été envoyé à votre adresse email.");
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.post("/auth/reset-password", { email, code, new_password: newPassword });
      setSuccess("Votre mot de passe a été réinitialisé avec succès !");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur de réinitialisation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F8FAFC" }}>
      {/* Arrière-plan "Minimalist Mesh" avec le bleu principal */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-200/50 blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-blue-50/50 blur-[100px]"></div>
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F172A] shadow-lg shadow-slate-300">
            <ShieldCheck size={28} className="text-white" />
          </div>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/60 rounded-[1.5rem] bg-white/80 backdrop-blur-xl">
          <CardHeader className="space-y-2 pb-6">
            <CardTitle className="text-center text-2xl font-bold text-[#0F172A]">
              {step === 1 ? "Mot de passe oublié" : "Nouveau mot de passe"}
            </CardTitle>
            <CardDescription className="text-center text-slate-500 font-medium">
              {step === 1 
                ? "Saisissez votre email pour recevoir un code à 6 chiffres." 
                : "Saisissez le code reçu et votre nouveau mot de passe."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 shadow-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 shadow-sm">
                {success}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleRequestCode} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                    Adresse Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="admin@boutique.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/60 pl-11 pr-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#2563EB] py-6 text-[15px] font-bold text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all"
                >
                  {loading ? "Envoi en cours..." : "Recevoir le code"}
                </Button>
                
                <div className="mt-6 text-center text-sm">
                  <Link to="/login" className="text-slate-500 hover:text-slate-900 font-semibold inline-flex items-center gap-1.5 transition-colors">
                    <ArrowLeft size={16} />
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                    Code à 6 chiffres
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full text-center tracking-[0.5em] text-lg rounded-xl border border-slate-200 bg-white/60 px-4 py-3 font-bold text-slate-900 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/60 pl-11 pr-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <KeyRound size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/60 pl-11 pr-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#2563EB] py-6 text-[15px] font-bold text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all"
                >
                  {loading ? "Réinitialisation..." : "Réinitialiser mon mot de passe"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
