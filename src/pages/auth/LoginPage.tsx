import { useState } from "react";
import axios from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import api from "@/api/api";
import streamingBackground from "@/assets/auth/streaming-login-background.png";
import { Button } from "@/components/ui/button";

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

const streamingServices = [
  "Netflix",
  "Prime Video",
  "Spotify",
  "Crunchyroll",
  "Max",
  "Disney+",
];

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("reason") === "session-expired";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        setError("Le serveur n’a pas renvoyé de session valide.");
        return;
      }

      localStorage.setItem("white_account_token", response.data.token);

      if (response.data.user) {
        localStorage.setItem(
          "white_account_user",
          JSON.stringify(response.data.user)
        );

        document.body.classList.toggle(
          "role-admin",
          response.data.user.role === "admin"
        );
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Connexion impossible. Vérifiez l’adresse email et le mot de passe."
        );
      } else {
        setError("Une erreur inattendue empêche la connexion.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-login-shell">
      <img
        src={streamingBackground}
        alt=""
        aria-hidden="true"
        className="auth-login-background"
      />
      <div className="auth-login-overlay" aria-hidden="true" />
      <div className="auth-login-glow auth-login-glow-one" aria-hidden="true" />
      <div className="auth-login-glow auth-login-glow-two" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
            <ShieldCheck size={23} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-[0.02em]">White Account</p>
            <p className="text-[11px] text-white/55">Gestion commerciale</p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-slate-950/25 px-4 py-2 text-xs font-medium text-white/65 backdrop-blur-xl sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
          Espace sécurisé
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1500px] items-center gap-10 px-5 pb-8 pt-24 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,520px)] lg:px-12 lg:py-24">
        <section className="hidden max-w-2xl self-end pb-8 text-white lg:block xl:pb-14">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100 backdrop-blur-xl">
            <Sparkles size={15} />
            Pilotez vos abonnements sans perdre le fil
          </div>

          <h1 className="max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] xl:text-6xl">
            Vos abonnements.
            <span className="mt-1 block bg-gradient-to-r from-blue-300 via-white to-orange-200 bg-clip-text text-transparent">
              Une seule vision.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 xl:text-lg">
            Suivez les ventes, les renouvellements et votre rentabilité depuis
            un espace clair pensé pour votre activité numérique.
          </p>

          <div className="auth-service-marquee mt-9 max-w-xl">
            <div className="auth-service-track">
              {[...streamingServices, ...streamingServices].map(
                (service, index) => (
                  <span
                    key={`${service}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur-md"
                    aria-hidden={index >= streamingServices.length}
                  >
                    <Play size={12} fill="currentColor" />
                    {service}
                  </span>
                )
              )}
            </div>
          </div>

          <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["Ventes", "Suivi en temps réel"],
              ["Échéances", "Toujours anticipées"],
              ["Marge", "Lecture instantanée"],
            ].map(([title, description], index) => (
              <div
                key={title}
                className="auth-feature-card rounded-2xl border border-white/10 bg-slate-950/25 p-4 backdrop-blur-xl"
                style={{ animationDelay: `${index * 800}ms` }}
              >
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[480px] lg:mx-0 lg:justify-self-end">
          <div className="auth-login-panel overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.94] shadow-[0_32px_100px_rgba(2,6,23,0.48)] backdrop-blur-2xl">
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-orange-400" />

            <div className="px-6 py-7 sm:px-10 sm:py-10">
              <div className="mb-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/20 lg:hidden">
                  <ShieldCheck size={24} />
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Bon retour parmi nous
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                  Connectez-vous
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Retrouvez votre tableau de bord White Account.
                </p>
              </div>

              {sessionExpired && !error && (
                <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <LockKeyhole className="mt-0.5 shrink-0" size={17} />
                  <p>
                    Votre session a expiré. Reconnectez-vous pour continuer.
                  </p>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Adresse email
                  </label>
                  <div className="group relative">
                    <Mail
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                    />
                    <input
                      id="login-email"
                      className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-4 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nom@entreprise.com"
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label
                      htmlFor="login-password"
                      className="text-sm font-semibold text-slate-700"
                    >
                      Mot de passe
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                  <div className="group relative">
                    <LockKeyhole
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                    />
                    <input
                      id="login-password"
                      className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50/80 pl-12 pr-12 text-sm text-slate-950 outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Votre mot de passe"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="group h-13 w-full rounded-2xl bg-blue-600 text-[15px] font-semibold text-white shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30"
                  disabled={loading}
                >
                  <span>{loading ? "Connexion sécurisée..." : "Se connecter"}</span>
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="ml-2 transition-transform group-hover:translate-x-1"
                    />
                  )}
                </Button>
              </form>

              <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400">
                <ShieldCheck size={15} className="text-emerald-500" />
                Session chiffrée · Déconnexion automatique à expiration
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-white/45">
            White Account · Votre activité, parfaitement organisée
          </p>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
