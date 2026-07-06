import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import api from "@/api/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

type LoginResponse = {
  token: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  };
  message?: string;
};

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      if (!response.data.token) {
        setError("Token non reçu depuis le backend.");
        return;
      }

      localStorage.setItem("white_account_token", response.data.token);

      if (response.data.user) {
        localStorage.setItem(
          "white_account_user",
          JSON.stringify(response.data.user)
        );
      }

      navigate("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Connexion impossible. Vérifie l'email ou le mot de passe."
        );
      } else {
        setError("Erreur inconnue pendant la connexion.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative blurred circles for extra depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-300/10 rounded-full blur-3xl pointer-events-none"></div>

      <Card className="w-full max-w-[420px] shadow-2xl shadow-slate-200/50 border-slate-100 rounded-3xl relative z-10 bg-white/90 backdrop-blur-sm">
        <CardHeader className="space-y-4 pb-8 pt-10 px-8 text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              White Account
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Gérez votre activité en toute sérénité
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-10">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Adresse email
              </label>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nom@entreprise.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Mot de passe
                </label>
              </div>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Votre mot de passe"
                required
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full rounded-xl py-6 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all" 
              disabled={loading}
            >
              {loading ? "Connexion sécurisée..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;