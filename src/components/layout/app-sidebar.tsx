"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
  Coins,
  ArrowRightLeft,
  Bell,
  BarChart2
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Inicio" },
  { href: "/dashboard/incomes", icon: Wallet, label: "Ingresos" },
  { href: "/dashboard/expenses", icon: Wallet, label: "Gastos", isFlipped: true },
  { href: "/dashboard/payroll", icon: Users, label: "Nómina" },
  { href: "/dashboard/accounts", icon: Landmark, label: "Cuentas" },
  { href: "/dashboard/clients-debts", icon: Users, label: "Clientes y Deudas" },
  { href: "/dashboard/transactions", icon: ArrowRightLeft, label: "Alivios/Transacciones" },
  { href: "/dashboard/service-report", icon: BarChart2, label: "Reporte de Servicios" },
  { href: "/dashboard/reminders", icon: Bell, label: "Recordatorios" },
  { href: "/dashboard/total-general", icon: FileText, label: "Total General" },
  { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile } = useAuth();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

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
          {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  href={item.href}
                  isActive={pathname === item.href}
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
            )
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-cyan-800/50 flex items-center justify-center font-bold text-cyan-300">
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
