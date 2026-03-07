import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  PackageSearch,
  FileText,
  BarChart3,
  Settings,
  Key,
  Gavel,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrg } from "@/contexts/OrgContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo-processo", label: "Novo Processo", icon: Upload },
  { to: "/lotes", label: "Lotes Gerados", icon: PackageSearch },
  { to: "/documentos", label: "Documentos", icon: FileText },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes/classificacao-csv", label: "Classificação CSV", icon: Settings },
  { to: "/configuracoes/precificacao", label: "Configurações", icon: Settings },
  { to: "/configuracoes/api-token", label: "API Access Token", icon: Key },
];

const adminItems = [
  { to: "/admin/orgaos", label: "Cadastro de Órgãos", icon: Building2 },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { isSuperAdmin } = useUserRole();

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 z-30",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary shrink-0">
          <Gavel className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-display font-bold text-sidebar-primary-foreground leading-tight">
              AlienaGov
            </h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-1 px-3">
                <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-semibold">Administração</span>
              </div>
            )}
            {adminItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* Org info */}
      {!collapsed && (
        <div className="px-4 py-3 mx-3 mb-3 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/60">Órgão</p>
          <p className="text-sm font-medium text-sidebar-foreground truncate">Prefeitura de São Paulo</p>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={signOut}
        className={cn(
          "flex items-center gap-3 mx-3 mb-2 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all duration-200",
          collapsed && "justify-center",
        )}
      >
        <LogOut className="w-5 h-5 shrink-0" />
        {!collapsed && <span>Sair</span>}
      </button>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
