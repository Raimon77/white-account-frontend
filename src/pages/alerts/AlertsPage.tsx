import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AlertTriangle, Bell, Calendar, Mail, PlayCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";

import api from "@/api/api";
import { Button } from "@/components/ui/button";

type SubscriptionAlert = {
  id: string;
  invoice_number: string;
  sale_date: string;
  next_subscription_date: string;
  subscription_label: string;
  payment_status: string;
  total_amount: number | string;
  amount_paid: number | string;
  balance_due: number | string;
  subscription_alert_7_sent_at?: string | null;
  subscription_alert_3_sent_at?: string | null;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  alert_status: "expired" | "today" | "soon" | "future";
  days_remaining: number;
};

type AlertResponse = {
  message: string;
  days_range: number;
  total: number;
  alerts: SubscriptionAlert[];
};

function getBackendMessage(data: unknown): string | null {
  if (typeof data === "string") return data.trim() || null;
  if (Array.isArray(data)) {
    const messages = data
      .map((item) => getBackendMessage(item))
      .filter((message): message is string => Boolean(message));
    return messages.length > 0 ? messages.join(" ") : null;
  }
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  const directKeys = ["message", "error", "detail", "details"];
  for (const key of directKeys) {
    const message = getBackendMessage(record[key]);
    if (message) return message;
  }
  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return getBackendMessage(error.response?.data) || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
}

function formatMoney(value: number | string | null | undefined) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function formatDate(dateValue?: string | null) {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "expired":
      return <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Expiré</span>;
    case "today":
      return <span className="inline-flex rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">Aujourd'hui</span>;
    case "soon":
      return <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">Bientôt</span>;
    default:
      return <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Futur</span>;
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([]);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState(15);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await api.get<AlertResponse>(`/alerts/subscriptions?days=${days}`);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      setError(getErrorMessage(error, "Impossible de charger les alertes."));
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAlerts(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAlerts]);

  async function handleRunJobs() {
    try {
      setRunning(true);
      setError("");
      setSuccess("");

      const response = await api.post("/alerts/subscriptions/run");
      setSuccess(response.data.message || "Job d'alertes email exécuté avec succès.");
      await loadAlerts();
    } catch (error) {
      setError(getErrorMessage(error, "Erreur lors de l'exécution du script d'alertes."));
    } finally {
      setRunning(false);
    }
  }

  const filteredAlerts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return alerts;

    return alerts.filter(
      (a) =>
        a.client_name.toLowerCase().includes(keyword) ||
        a.invoice_number.toLowerCase().includes(keyword) ||
        a.subscription_label.toLowerCase().includes(keyword)
    );
  }, [alerts, search]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-red-50" />
          <div className="absolute bottom-0 right-24 h-20 w-20 rounded-full bg-orange-50" />

          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                Abonnements
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Alertes & Renouvellements
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Surveillez les factures récurrentes dont la date d'échéance est proche ou dépassée.
              </p>
            </div>

            <Button
              onClick={handleRunJobs}
              disabled={running}
              className="gap-2 bg-slate-900 hover:bg-slate-800"
            >
              {running ? <Bell className="animate-spin" size={18} /> : <PlayCircle size={18} />}
              Lancer les alertes email
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200 flex items-center gap-3 admin-only">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-green-50 p-4 text-sm text-green-600 border border-green-200">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Chercher client, facture..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value={7}>Dans les 7 jours</option>
                <option value={15}>Dans les 15 jours</option>
                <option value={30}>Dans les 30 jours</option>
                <option value={90}>Dans les 90 jours</option>
              </select>
            </div>
          </div>
        </div>

        <div className="app-horizontal-scroll overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4">Client & Facture</th>
                <th className="px-6 py-4">Abonnement</th>
                <th className="px-6 py-4">Prochaine Échéance</th>
                <th className="px-6 py-4">Statut Alerte</th>
                <th className="px-6 py-4">Emails envoyés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-2">
                      <Bell className="animate-bounce text-slate-300" size={24} />
                    </div>
                    Chargement des alertes...
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-2">
                      <Calendar className="text-slate-300" size={32} />
                    </div>
                    Aucune alerte à afficher pour cette période.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{alert.client_name}</p>
                      <Link to="/sales" className="text-xs text-blue-600 hover:underline">
                        {alert.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {alert.subscription_label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatMoney(alert.total_amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`font-semibold ${alert.days_remaining < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {formatDate(alert.next_subscription_date)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {alert.days_remaining < 0 
                          ? `Dépassé de ${Math.abs(alert.days_remaining)} j` 
                          : alert.days_remaining === 0 
                            ? "Aujourd'hui" 
                            : `Dans ${alert.days_remaining} j`}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(alert.alert_status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Mail size={12} className={alert.subscription_alert_7_sent_at ? "text-green-500" : "text-slate-300"} />
                          <span>J-7: {alert.subscription_alert_7_sent_at ? formatDate(alert.subscription_alert_7_sent_at) : "Non"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail size={12} className={alert.subscription_alert_3_sent_at ? "text-green-500" : "text-slate-300"} />
                          <span>J-3: {alert.subscription_alert_3_sent_at ? formatDate(alert.subscription_alert_3_sent_at) : "Non"}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
