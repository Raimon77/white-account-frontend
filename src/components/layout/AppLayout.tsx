import { useMemo, useState, type ElementType } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Package,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { clearAuthSession } from "@/auth/session";
import { Button } from "@/components/ui/button";

type MenuItem = {
  title: string;
  path: string;
  icon: ElementType;
  group: "Général" | "Catalogue" | "Commercial" | "Pilotage";
};

const menuItems: MenuItem[] = [
  { title: "Tableau de bord", path: "/dashboard", icon: Home, group: "Général" },
  { title: "Clients", path: "/clients", icon: Users, group: "Général" },
  { title: "Fournisseurs", path: "/suppliers", icon: Truck, group: "Catalogue" },
  { title: "Produits", path: "/products", icon: Package, group: "Catalogue" },
  { title: "Comptes et profils", path: "/account-access", icon: KeyRound, group: "Catalogue" },
  { title: "Ventes", path: "/sales", icon: Receipt, group: "Commercial" },
  { title: "Paiements", path: "/payments", icon: CreditCard, group: "Commercial" },
  { title: "Devis", path: "/quotes", icon: FileText, group: "Commercial" },
  { title: "Bons de commande", path: "/orders", icon: ClipboardList, group: "Commercial" },
  { title: "Avoirs", path: "/refunds", icon: RefreshCcw, group: "Commercial" },
  { title: "Dépenses", path: "/expenses", icon: Wallet, group: "Pilotage" },
  { title: "Clôtures", path: "/closings", icon: BarChart3, group: "Pilotage" },
  { title: "Alertes", path: "/alerts", icon: Bell, group: "Pilotage" },
  { title: "Paramètres", path: "/settings", icon: Settings, group: "Pilotage" },
];

const railItems = menuItems.filter((item) =>
  ["/dashboard", "/sales", "/clients", "/account-access", "/alerts"].includes(item.path)
);

const groups: MenuItem["group"][] = ["Général", "Catalogue", "Commercial", "Pilotage"];

type UserType = {
  full_name?: string;
  email?: string;
  role?: string;
} | null;

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = useMemo<UserType>(() => {
    try {
      const userRaw = localStorage.getItem("white_account_user");
      return userRaw ? JSON.parse(userRaw) : null;
    } catch {
      return null;
    }
  }, []);

  const currentItem =
    menuItems.find((item) => location.pathname.startsWith(item.path)) || menuItems[0];

  function logout() {
    clearAuthSession();
    navigate("/login");
  }

  return (
    <div className="teams-app-shell min-h-[100dvh] text-slate-950">
      <MobileHeader
        title={currentItem.title}
        onOpen={() => setMobileOpen(true)}
        onNewSale={() => navigate("/sales")}
      />

      {mobileOpen && (
        <div className="teams-mobile-overlay fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="teams-mobile-panel relative h-full w-[min(86vw,320px)] bg-white shadow-2xl">
            <SectionNavigation
              user={user}
              logout={logout}
              closeMobile={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <aside className="teams-rail fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col text-white lg:flex">
        <button
          type="button"
          aria-label="White Account"
          onClick={() => navigate("/dashboard")}
          className="teams-rail-logo mx-auto mt-3 flex h-11 w-11 items-center justify-center rounded-[10px]"
        >
          <Boxes size={23} />
        </button>

        <nav className="mt-4 flex flex-1 flex-col items-center gap-1 px-2" aria-label="Navigation rapide">
          {railItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `teams-rail-link flex w-full flex-col items-center justify-center gap-1 rounded-lg py-2 text-[10px] ${
                    isActive ? "is-active" : ""
                  }`
                }
              >
                <Icon size={19} />
                <span className="max-w-full truncate">{item.title === "Comptes et profils" ? "Comptes" : item.title}</span>
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="teams-rail-link mx-2 mb-3 flex flex-col items-center gap-1 rounded-lg py-2 text-[10px]"
        >
          <LogOut size={19} />
          Quitter
        </button>
      </aside>

      <aside className="teams-section-nav fixed inset-y-0 left-[72px] z-30 hidden w-[236px] border-r border-[#e5e5eb] bg-white lg:block">
        <SectionNavigation user={user} logout={logout} />
      </aside>

      <div className="min-w-0 lg:pl-[308px]">
        <DesktopTopbar user={user} currentItem={currentItem} />
        <main className="teams-content app-page-scroll min-h-[calc(100dvh-52px)] min-w-0 overflow-x-hidden p-3 sm:p-4 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MobileHeader({
  title,
  onOpen,
  onNewSale,
}: {
  title: string;
  onOpen: () => void;
  onNewSale: () => void;
}) {
  return (
    <header className="teams-mobile-header sticky top-0 z-30 flex items-center justify-between border-b px-3 py-2 lg:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" onClick={onOpen} className="teams-icon-button" aria-label="Ouvrir le menu">
          <Menu size={20} />
        </button>
        <div className="teams-mobile-brand flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white">
          <Boxes size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-[11px] text-slate-500">White Account</p>
        </div>
      </div>
      <Button type="button" onClick={onNewSale} className="gap-1.5">
        <Plus size={16} />
        Vente
      </Button>
    </header>
  );
}

function SectionNavigation({
  user,
  logout,
  closeMobile,
}: {
  user?: UserType;
  logout: () => void;
  closeMobile?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[58px] items-center justify-between border-b border-[#ededf2] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}logo.jpg`}
            alt=""
            className="h-8 w-8 rounded-lg object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#242424]">White Account</p>
            <p className="text-[11px] text-[#616161]">Gestion commerciale</p>
          </div>
        </div>
        {closeMobile && (
          <button type="button" onClick={closeMobile} className="teams-icon-button" aria-label="Fermer le menu">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        {groups.map((group) => (
          <div key={group} className="mb-4">
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#77777d]">
              {group}
            </p>
            <div className="space-y-0.5">
              {menuItems
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMobile}
                      className={({ isActive }) =>
                        `teams-section-link group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] ${
                          isActive ? "is-active" : ""
                        }`
                      }
                    >
                      <Icon size={17} />
                      <span className="min-w-0 flex-1 truncate">{item.title}</span>
                      <ChevronRight size={13} className="opacity-0 transition group-hover:opacity-100" />
                    </NavLink>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#ededf2] p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-[#f7f7fa] p-2.5">
          <div className="teams-user-avatar flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
            {(user?.full_name || "WA").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[#242424]">{user?.full_name || "Administrateur"}</p>
            <p className="truncate text-[11px] text-[#707077]">{user?.email || user?.role || "White Account"}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={logout} className="w-full justify-start gap-2 text-[#616161]">
          <LogOut size={16} />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}

function DesktopTopbar({ user, currentItem }: { user?: UserType; currentItem: MenuItem }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const results = menuItems.filter((item) =>
    item.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <header className="teams-topbar sticky top-0 z-20 hidden h-[52px] items-center gap-4 border-b px-4 lg:flex">
      <div className="min-w-[150px]">
        <p className="text-sm font-semibold text-[#242424]">{currentItem.title}</p>
      </div>

      <div className="relative mx-auto w-full max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-2.5 text-[#707077]" size={16} />
        <input
          value={query}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher une page dans White Account"
          className="teams-global-search h-9 w-full rounded-md border pl-9 pr-3 text-sm outline-none"
        />
        {focused && query.trim() && (
          <div className="absolute inset-x-0 top-10 overflow-hidden rounded-lg border border-[#dedee5] bg-white py-1 shadow-xl">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[#707077]">Aucune page trouvée.</p>
            ) : (
              results.slice(0, 6).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      navigate(item.path);
                      setQuery("");
                      setFocused(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-[#f0f0fa]"
                  >
                    <Icon size={16} className="text-[#5b5fc7]" />
                    {item.title}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-[250px] items-center justify-end gap-2">
        <Button type="button" onClick={() => navigate("/sales")} className="gap-1.5">
          <Plus size={16} />
          Nouvelle vente
        </Button>
        <button type="button" onClick={() => navigate("/alerts")} className="teams-icon-button relative" aria-label="Alertes">
          <Bell size={18} />
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#d13438]" />
        </button>
        <button type="button" onClick={() => navigate("/settings")} className="teams-user-avatar flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white" aria-label="Paramètres du compte">
          {(user?.full_name || "WA").slice(0, 2).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

export default AppLayout;
