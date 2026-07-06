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

  const [email, setEmail] = useState("admin@REMOVED_TAURI_SIGNING_PASSWORD.com");
  const [password, setPassword] = useState("Admin@12345");
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">White Account</CardTitle>
          <CardDescription>
            Connecte-toi pour accéder au logiciel de gestion commerciale.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@REMOVED_TAURI_SIGNING_PASSWORD.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Mot de passe
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mot de passe"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;