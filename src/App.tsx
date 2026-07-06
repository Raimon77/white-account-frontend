import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import ClientsPage from "@/pages/clients/ClientsPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import PaymentsPage from "@/pages/payments/PaymentsPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import ClosingsPage from "@/pages/closings/ClosingsPage";
import ExpensesPage from "@/pages/expenses/ExpensesPage";
import OrdersPage from "@/pages/orders/OrdersPage";
import ProductsPage from "@/pages/products/ProductsPage";
import QuotesPage from "@/pages/quotes/QuotesPage";
import RefundsPage from "@/pages/refunds/RefundsPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import PurchasesPage from "@/pages/purchases/PurchasesPage";
import SalesPage from "@/pages/sales/SalesPage";
import AlertsPage from "@/pages/alerts/AlertsPage";
import ProtectedRoute from "@/routes/ProtectedRoute";

function App() {
  const token = localStorage.getItem("white_account_token");

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            token ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/clients" element={<ClientsPage />} />

          <Route path="/products" element={<ProductsPage />} />

          <Route path="/purchases" element={<PurchasesPage />} />

          <Route path="/sales" element={<SalesPage />} />

          <Route path="/payments" element={<PaymentsPage />} />

          <Route
            path="/payments-placeholder"
            element={
              <PlaceholderPage
                title="Paiements"
                description="Suivi des paiements clients, reçus et encaissements."
              />
            }
          />

          <Route path="/quotes" element={<QuotesPage />} />

          <Route path="/orders" element={<OrdersPage />} />

          <Route path="/refunds" element={<RefundsPage />} />

          <Route path="/expenses" element={<ExpensesPage />} />

          <Route path="/closings" element={<ClosingsPage />} />

          <Route path="/alerts" element={<AlertsPage />} />

          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
