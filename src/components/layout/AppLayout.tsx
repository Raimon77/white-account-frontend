import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  Receipt,
  RefreshCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const menuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: Home,
  },
  {
    title: "Clients",
    path: "/clients",
    icon: Users,
  },
  {
    title: "Produits",
    path: "/products",
    icon: Package,
  },
  {
    title: "Achats",
    path: "/purchases",
    icon: ShoppingCart,
  },
  {
    title: "Ventes",
    path: "/sales",
    icon: Receipt,
  },
  {
    title: "Paiements",
    path: "/payments",
    icon: CreditCard,
  },
  {
    title: "Devis",
    path: "/quotes",
    icon: FileText,
  },
  {
    title: "Bons de commande",
    path: "/orders",
    icon: ClipboardList,
  },
  {
    title: "Avoirs",
    path: "/refunds",
    icon: RefreshCcw,
  },
  {
    title: "Dépenses",
    path: "/expenses",
    icon: Wallet,
  },
  {
    title: "Clôtures",
    path: "/closings",
    icon: BarChart3,
  },
  {
    title: "Alertes",
    path: "/alerts",
    icon: Bell,
  },
  {
    title: "Paramètres",
    path: "/settings",
    icon: Settings,
  },
];

function AppLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = useMemo(() => {
    try {
      const userRaw = localStorage.getItem("white_account_user");
      return userRaw ? JSON.parse(userRaw) : null;
    } catch {
      return null;
    }
  }, []);

  function logout() {
    localStorage.removeItem("white_account_token");
    localStorage.removeItem("white_account_user");
    document.body.classList.remove("role-admin");
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
      {/* Topbar mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Boxes size={22} />
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-950">
              White Account
            </h1>
            <p className="text-xs text-slate-500">Gestion commerciale</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden">
          <div className="h-full w-80 max-w-[85vw] bg-[#0F172A] shadow-2xl">
            <SidebarContent
              logout={logout}
              closeMobile={() => setMobileOpen(false)}
              user={user}
            />
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="fixed left-0 top-0 hidden h-screen w-72 bg-[#080F1F] text-white shadow-2xl lg:block border-r border-white/5">
        <SidebarContent logout={logout} user={user} />
      </aside>

      {/* Main */}
      <main className="lg:pl-72">
        <Topbar user={user} />

        <div className="min-h-[calc(100vh-81px)] p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

type UserType = {
  full_name?: string;
  email?: string;
  role?: string;
} | null;

type SidebarContentProps = {
  logout: () => void;
  closeMobile?: () => void;
  user?: UserType;
};

function SidebarContent({ logout, closeMobile, user }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-white/5 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-blue-600/20">
            <img src="/logo.jpg" alt="White Account Logo" className="h-full w-full object-cover" />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              WHITE ACCOUNT
            </h1>
            <p className="text-xs text-slate-300">Gestion commerciale</p>
          </div>
        </div>

        {closeMobile && (
          <button
            type="button"
            onClick={closeMobile}
            className="rounded-lg border border-white/10 p-2 text-white lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6 scrollbar-hide">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobile}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600/10 text-blue-500 shadow-[inset_4px_0_0_0_rgba(59,130,246,1)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} className={`transition-colors ${
                window.location.pathname.startsWith(item.path) 
                  ? "text-blue-500" 
                  : "text-slate-500 group-hover:text-slate-300"
              }`} />
              <span>{item.title}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/5 p-5">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-inner">
              {(user?.full_name || "AD").slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">
                {user?.full_name || "Admin User"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {user?.email || "admin@REMOVED_TAURI_SIGNING_PASSWORD.com"}
              </p>
            </div>
          </div>

          <div className="mt-3 inline-flex rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
            {user?.role || "admin"}
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full justify-start gap-2 border-white/10 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          onClick={logout}
        >
          <LogOut size={18} />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

function Topbar({ user }: { user?: UserType }) {
  const navigate = useNavigate();
  
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  return (
    <header className="sticky top-0 z-20 hidden border-b border-slate-200/60 bg-white/80 backdrop-blur-xl lg:block shadow-sm">
      <div className="flex h-20 items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm">
            <Menu size={20} />
          </button>

          <div>
            <h2 className="text-xl font-bold text-slate-950">
              Bonjour, {user?.full_name || "Admin"} 👋
            </h2>
            <p className="text-sm text-slate-500">
              Voici un aperçu de votre activité commerciale.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/50 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
            <CalendarDays size={16} className="text-blue-600" />
            {currentPeriod}
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          <button 
            onClick={() => navigate('/alerts')}
            className="group relative rounded-full border border-slate-200/60 bg-white/50 p-2.5 text-slate-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600"
          >
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
              !
            </span>
          </button>

          <div className="h-6 w-px bg-slate-200"></div>

          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 rounded-full border border-slate-200/60 bg-white/50 py-1.5 pl-2 pr-3 shadow-sm transition hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <Store size={16} />
            </div>

            <div className="text-left">
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                Ma Boutique
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Espace principal</p>
            </div>

            <ChevronDown size={14} className="text-slate-400 ml-1" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default AppLayout;