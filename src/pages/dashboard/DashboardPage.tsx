import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CreditCard,
  FileText,
  PieChart,
  Receipt,
  RefreshCcw,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

import api from "@/api/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardSummary = {
  total_purchases: number;
  total_sales: number;
  total_refunds: number;
  net_sales: number;
  total_paid: number;
  total_refunded: number;
  net_paid: number;
  total_due: number;
  gross_profit: number;
  net_gross_profit: number;
  total_expenses: number;
  real_monthly_profit: number;
  total_invoices: number;
  refund_count: number;
};

type RefundRow = {
  id: string;
  refund_number: string;
  refund_date: string;
  amount: number;
  refund_type: string;
  reason?: string;
  invoice_number?: string;
  client_name?: string;
};

type UnpaidInvoiceRow = {
  id: string;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: string;
  client_name?: string;
};

type TopProductRow = {
  id: string;
  reference: string;
  name: string;
  quantity_sold: number;
  total_sales: number;
  total_profit: number;
  refunded_quantity?: number;
  refunded_amount?: number;
  net_quantity_sold?: number;
  net_sales?: number;
};

type DashboardResponse = {
  period_key: string;
  summary: DashboardSummary;
  commercial_pipeline?: {
    refunds?: RefundRow[];
    unpaid_invoices?: UnpaidInvoiceRow[];
  };
  top_products?: TopProductRow[];
};

function formatMoney(value: number | string | undefined | null) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "-";

  return new Date(dateValue).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function DashboardPage() {
  const [periodKey, setPeriodKey] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<DashboardResponse>(
        `/dashboard/summary?period_key=${periodKey}`
      );

      setDashboard(response.data);
    } catch {
      setError("Impossible de charger le dashboard.");
    } finally {
      setLoading(false);
    }
  }, [periodKey]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const summary = dashboard?.summary;

  const chartData = useMemo(() => {
    if (!summary) return [];

    return [
      {
        label: "Ventes",
        value: Number(summary.total_sales || 0),
        color: "bg-blue-600",
      },
      {
        label: "Nettes",
        value: Number(summary.net_sales || 0),
        color: "bg-green-600",
      },
      {
        label: "Achats",
        value: Number(summary.total_purchases || 0),
        color: "bg-amber-500",
      },
      {
        label: "Dépenses",
        value: Number(summary.total_expenses || 0),
        color: "bg-rose-500",
      },
      {
        label: "Avoirs",
        value: Number(summary.total_refunds || 0),
        color: "bg-orange-500",
      },
    ];
  }, [summary]);

  const maxChartValue = Math.max(...chartData.map((item) => item.value), 1);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="aurora-loading rounded-2xl border border-blue-100 bg-white/90 px-6 py-5 shadow-lg shadow-blue-950/5 backdrop-blur-xl">
          <p className="text-sm font-medium text-slate-600">
            Chargement du dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erreur</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 admin-only">
            {error || "Impossible de lire les données du dashboard."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const refunds = dashboard?.commercial_pipeline?.refunds || [];
  const unpaidInvoices = dashboard?.commercial_pipeline?.unpaid_invoices || [];
  const topProducts = dashboard?.top_products || [];

  return (
    <div className="aurora-dashboard space-y-6">
      {/* Header dashboard */}
      <div className="aurora-dashboard-hero overflow-hidden rounded-3xl border border-blue-100/80 bg-white/90 shadow-xl shadow-blue-950/5 backdrop-blur-xl">
        <div className="relative p-6">
          <div className="aurora-hero-orb aurora-hero-orb-blue absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-100/70" />
          <div className="aurora-hero-orb aurora-hero-orb-orange absolute bottom-[-3rem] right-28 h-28 w-28 rounded-full bg-orange-100/70" />

          <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div 
                className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input && 'showPicker' in input) {
                    try {
                      input.showPicker();
                    } catch {
                      // fallback for older browsers
                    }
                  }
                }}
              >
                Période: 
                <input 
                  type="month" 
                  value={periodKey}
                  onChange={(e) => setPeriodKey(e.target.value)}
                  className="bg-transparent border-none outline-none text-blue-800 font-bold cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                Tableau de bord
              </h1>

              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Vue globale des ventes, avoirs, achats, dépenses,
                encaissements et bénéfice réel.
              </p>
            </div>

            <div className="aurora-profit-card rounded-2xl border border-blue-100 bg-white/75 px-5 py-4 shadow-lg shadow-blue-950/5 backdrop-blur-xl">
              <p className="text-xs font-medium text-slate-500">
                Bénéfice réel net
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  summary.real_monthly_profit >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {formatMoney(summary.real_monthly_profit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventes brutes"
          value={formatMoney(summary.total_sales)}
          icon={ShoppingCart}
          iconClassName="bg-blue-50 text-blue-700"
          trend="+12% vs mois dernier"
          trendType="up"
        />

        <StatCard
          title="Avoirs"
          value={formatMoney(summary.total_refunds)}
          icon={RefreshCcw}
          iconClassName="bg-orange-50 text-orange-600"
          trend={`${summary.refund_count} avoir(s)`}
          trendType="warning"
        />

        <StatCard
          title="Ventes nettes"
          value={formatMoney(summary.net_sales)}
          icon={Wallet}
          iconClassName="bg-green-50 text-green-700"
          trend="+10% activité nette"
          trendType="up"
        />

        <StatCard
          title="Bénéfice réel"
          value={formatMoney(summary.real_monthly_profit)}
          icon={BarChart3}
          iconClassName="bg-violet-50 text-violet-700"
          valueClassName={
            summary.real_monthly_profit >= 0 ? "text-green-700" : "text-red-700"
          }
          trend={
            summary.real_monthly_profit >= 0
              ? "Résultat positif"
              : "Résultat négatif"
          }
          trendType={summary.real_monthly_profit >= 0 ? "up" : "down"}
        />

        <StatCard
          title="Achats"
          value={formatMoney(summary.total_purchases)}
          icon={ShoppingBag}
          iconClassName="bg-amber-50 text-amber-600"
          trend="Coût d'achat"
          trendType="warning"
        />

        <StatCard
          title="Dépenses"
          value={formatMoney(summary.total_expenses)}
          icon={PieChart}
          iconClassName="bg-rose-50 text-rose-600"
          trend="Charges mensuelles"
          trendType="down"
        />

        <StatCard
          title="Reste à encaisser"
          value={formatMoney(summary.total_due)}
          icon={CreditCard}
          iconClassName="bg-sky-50 text-sky-700"
          trend="Créances clients"
          trendType="warning"
        />

        <StatCard
          title="Factures"
          value={String(summary.total_invoices)}
          icon={FileText}
          iconClassName="bg-teal-50 text-teal-700"
          trend="Factures actives"
          trendType="up"
        />
      </div>

      {/* Middle */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Activité financière du mois</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Comparaison rapide des principaux montants.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
              2026-07
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-5">
              {chartData.map((item) => {
                const width = Math.max((item.value / maxChartValue) * 100, 4);

                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-950">
                        {formatMoney(item.value)}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/50">
                      <div
                        className={`aurora-chart-bar h-full rounded-full ${item.color}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé financier</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <SummaryLine
              label="Ventes brutes"
              value={formatMoney(summary.total_sales)}
            />
            <SummaryLine
              label="Avoirs / remboursements"
              value={`- ${formatMoney(summary.total_refunds)}`}
              danger
            />
            <SummaryLine
              label="Ventes nettes"
              value={formatMoney(summary.net_sales)}
              success
              strong
            />

            <div className="border-t pt-3" />

            <SummaryLine
              label="Achats"
              value={`- ${formatMoney(summary.total_purchases)}`}
              danger
            />
            <SummaryLine
              label="Dépenses"
              value={`- ${formatMoney(summary.total_expenses)}`}
              danger
            />

            <div className="rounded-2xl bg-red-50 p-3">
              <SummaryLine
                label="Bénéfice réel"
                value={formatMoney(summary.real_monthly_profit)}
                strong
                danger={summary.real_monthly_profit < 0}
                success={summary.real_monthly_profit >= 0}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Factures à encaisser</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Les factures avec un solde restant.
              </p>
            </div>

            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {unpaidInvoices.length} facture(s)
            </span>
          </CardHeader>

          <CardContent>
            {unpaidInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Aucune facture impayée"
                description="Tout est encaissé pour cette période."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Facture</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-right">Solde</th>
                      <th className="px-4 py-3 text-right">Statut</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {unpaidInvoices.slice(0, 5).map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {invoice.client_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(invoice.sale_date)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700">
                          {formatMoney(invoice.balance_due)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <StatusPill status={invoice.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encaissements</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <SummaryLine
              label="Encaissé brut"
              value={formatMoney(summary.total_paid)}
            />
            <SummaryLine
              label="Remboursé"
              value={`- ${formatMoney(summary.total_refunded)}`}
              danger
            />
            <SummaryLine
              label="Encaissé net"
              value={formatMoney(summary.net_paid)}
              strong
              success
            />
            <SummaryLine
              label="Reste à encaisser"
              value={formatMoney(summary.total_due)}
              strong
            />

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Banknote size={17} />
                Santé financière
              </div>

              <p className="text-sm text-slate-500">
                Le résultat est négatif sur cette période. Les achats et
                dépenses dépassent les ventes nettes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers avoirs</CardTitle>
          </CardHeader>

          <CardContent>
            {refunds.length === 0 ? (
              <EmptyState
                icon={RotateCcw}
                title="Aucun avoir"
                description="Aucun remboursement enregistré pour la période."
              />
            ) : (
              <div className="space-y-3">
                {refunds.slice(0, 5).map((refund) => (
                  <div
                    key={refund.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">
                        {refund.refund_number}
                      </p>
                      <p className="text-sm text-slate-500">
                        {refund.client_name || "Client non renseigné"} —{" "}
                        {refund.invoice_number}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {refund.reason || "Aucun motif"} ·{" "}
                        {formatDate(refund.refund_date)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {formatMoney(refund.amount)}
                      </p>
                      <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
                        {refund.refund_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top produits</CardTitle>
          </CardHeader>

          <CardContent>
            {topProducts.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="Aucun produit vendu"
                description="Les meilleurs produits apparaîtront ici."
              />
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-semibold text-slate-950">
                          {product.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {product.reference} · Qté vendue{" "}
                          {Number(
                            product.net_quantity_sold ||
                              product.quantity_sold ||
                              0
                          )}
                        </p>
                      </div>
                    </div>

                    <p className="font-bold text-slate-950">
                      {formatMoney(product.net_sales || product.total_sales)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  icon: React.ElementType;
  iconClassName: string;
  valueClassName?: string;
  trend: string;
  trendType: "up" | "down" | "warning";
};

function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  trend,
  trendType,
}: StatCardProps) {
  return (
    <Card className="aurora-stat-card overflow-hidden border-blue-100/70 bg-gradient-to-br from-white via-white to-blue-50/40 shadow-lg shadow-blue-950/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-inner border border-white/50 ${iconClassName}`}
          >
            <Icon size={26} />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p
              className={`mt-2 truncate text-2xl font-bold tracking-tight text-slate-950 ${
                valueClassName || ""
              }`}
            >
              {value}
            </p>

            <div
              className={`mt-3 flex items-center gap-1 text-xs font-semibold ${
                trendType === "up"
                  ? "text-green-600"
                  : trendType === "down"
                  ? "text-red-600"
                  : "text-orange-600"
              }`}
            >
              {trendType === "up" ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {trend}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type SummaryLineProps = {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
  success?: boolean;
};

function SummaryLine({
  label,
  value,
  strong,
  danger,
  success,
}: SummaryLineProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={`text-sm ${
          strong ? "font-semibold text-slate-950" : "text-slate-600"
        }`}
      >
        {label}
      </span>

      <span
        className={`text-sm ${
          strong ? "font-bold" : "font-medium"
        } ${danger ? "text-red-700" : ""} ${
          success ? "text-green-700" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  const label =
    status === "paid"
      ? "Payée"
      : status === "partial"
      ? "Partiel"
      : status === "unpaid"
      ? "En attente"
      : status || "Statut";

  const className =
    status === "paid"
      ? "bg-green-50 text-green-700"
      : status === "partial"
      ? "bg-orange-50 text-orange-700"
      : "bg-blue-50 text-blue-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
        <Icon size={24} />
      </div>

      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default DashboardPage;
