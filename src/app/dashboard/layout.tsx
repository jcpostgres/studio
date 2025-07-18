
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Loader2, Plus, Home, BarChart2, Landmark, ArrowRightLeft, Settings, Coins, Users } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
        <main className="pb-24">
            {children}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around rounded-t-xl border-t border-gray-700 bg-gray-900 p-2 shadow-lg md:hidden">
          <button onClick={() => router.push('/dashboard/incomes')} className="flex flex-col items-center rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:text-teal-400">
            <Coins className="h-6 w-6" />
            <span className="mt-1 text-xs">Ingresos</span>
          </button>
          <button onClick={() => router.push('/dashboard/expenses')} className="flex flex-col items-center rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:text-teal-400">
            <Coins className="h-6 w-6 transform -scale-x-100" />
            <span className="mt-1 text-xs">Gastos</span>
          </button>
          <div className="relative">
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-16 w-16 -translate-y-4 flex-col items-center justify-center rounded-full bg-teal-500 text-3xl font-bold text-white shadow-md transition-colors duration-200 hover:bg-teal-600">
                  <Plus className="h-8 w-8" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top" className="mb-2">
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/incomes/new')}>Registrar Ingreso</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/expenses/new')}>Registrar Gasto</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/transactions')}>Registrar Alivio / Retiro</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickAction('/dashboard/transactions')}>Registrar Transacción</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <button onClick={() => router.push('/dashboard/reports')} className="flex flex-col items-center rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:text-teal-400">
            <BarChart2 className="h-6 w-6" />
            <span className="mt-1 text-xs">Reportes</span>
          </button>
          <button onClick={() => router.push('/dashboard/settings')} className="flex flex-col items-center rounded-lg p-2 text-gray-400 transition-colors duration-200 hover:text-teal-400">
            <Settings className="h-6 w-6" />
            <span className="mt-1 text-xs">Más</span>
          </button>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}

    