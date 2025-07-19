
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Loader2, Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart2, Coins, Home, Settings } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();
  const router = useRouter();
 
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleQuickAction = (path: string) => {
    router.push(path);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="p-4 sm:p-6 lg:p-8 pb-24">
            {children}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around rounded-t-xl border-t border-border bg-card p-2 shadow-lg md:hidden">
          <button onClick={() => router.push('/dashboard/incomes')} className="flex flex-col items-center rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:text-primary">
            <Coins className="h-6 w-6" />
            <span className="mt-1 text-xs">Ingresos</span>
          </button>
          <button onClick={() => router.push('/dashboard/expenses')} className="flex flex-col items-center rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:text-primary">
            <Coins className="h-6 w-6 transform -scale-x-100" />
            <span className="mt-1 text-xs">Gastos</span>
          </button>
          <div className="relative">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-16 w-16 -translate-y-4 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors duration-200 hover:bg-primary/90">
                  <Plus className="h-8 w-8" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top" className="mb-2">
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/incomes/new')}>Registrar Ingreso</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/expenses/new')}>Registrar Gasto</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/transactions')}>Alivio / Transacción</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button onClick={() => router.push('/dashboard/total-general')} className="flex flex-col items-center rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:text-primary">
            <BarChart2 className="h-6 w-6" />
            <span className="mt-1 text-xs">Reportes</span>
          </button>
          <button onClick={() => router.push('/dashboard/accounts')} className="flex flex-col items-center rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:text-primary">
            <Settings className="h-6 w-6" />
            <span className="mt-1 text-xs">Cuentas</span>
          </button>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
