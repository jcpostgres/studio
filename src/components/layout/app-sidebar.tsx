
"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard,
  Wallet,
  Landmark,
  FileText,
  Users,
  Settings,
  LogOut,
  ArrowRightLeft,
  Bell,
  BarChart2,
  FolderKanban,
  FileCog,
} from "lucide-react";

const mainNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/incomes", icon: Wallet, label: "Ingresos" },
  { href: "/dashboard/expenses", icon: Wallet, label: "Gastos", isFlipped: true },
  { href: "/dashboard/transactions", icon: ArrowRightLeft, label: "Alivios/Transacciones" },
];

const reportsNav = [
  { href: "/dashboard/total-general", icon: FileText, label: "Total General" },
  { href: "/dashboard/service-report", icon: BarChart2, label: "Reporte de Servicios" },
  { href: "/dashboard/payroll-report", icon: Users, label: "Reporte de Nómina" },
];

const settingsNav = [
  { href: "/dashboard/accounts", icon: Landmark, label: "Cuentas" },
  { href: "/dashboard/admin-payments", icon: FileCog, label: "Pagos Administrativos" },
  { href: "/dashboard/payroll", icon: Users, label: "Nómina" },
  { href: "/dashboard/clients-debts", icon: FolderKanban, label: "Clientes y Deudas" },
  { href: "/dashboard/reminders", icon: Bell, label: "Recordatorios" },
  { href: "/dashboard/settings", icon: Settings, label: "Configuración General" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };
  
  const renderNav = (items: typeof mainNav) => (
    items.map((item) => (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          href={item.href}
          isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
          onClick={(e) => {
            e.preventDefault();
            router.push(item.href!);
          }}
          tooltip={{content: item.label}}
        >
          <item.icon className={item.isFlipped ? "transform -scale-x-100" : ""}/>
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))
  );

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
              <path d="M12 12c-2 0-2-2-2-2s0-2 2-2 2 2 2 2-2 2-2 2z"/>
              <path d="M12 12c2 0 2-2 2-2s0-2-2-2-2 2-2 2 2 2 2 2z"/>
              <path d="M12 12v4c0 2-2 2-2 2s-2-2-2-2v-4"/>
              <path d="M12 12v4c0 2 2 2 2 2s2-2 2-2v-4"/>
              <path d="M6 12H4c-1 0-2 1-2 2v2c0 1 1 2 2 2h2"/>
              <path d="M18 12h2c1 0 2 1 2 2v2c0 1-1 2-2 2h-2"/>
            </svg>
            <span className="text-xl font-semibold text-primary">MonsterFinance</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {renderNav(mainNav)}
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <p className="px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1 group-data-[collapsible=icon]:hidden">Reportes</p>
          {renderNav(reportsNav)}
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          <p className="px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-1 group-data-[collapsible=icon]:hidden">Configuración</p>
          {renderNav(settingsNav)}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
             {userProfile?.name ? getInitials(userProfile.name) : 'U'}
          </div>
          <div className="flex flex-col truncate">
            <span className="font-semibold truncate">{userProfile?.name || "Usuario"}</span>
            <span className="text-xs text-muted-foreground truncate">
              {userProfile?.email || "Sin email"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}

    