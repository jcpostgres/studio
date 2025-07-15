"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { Bell, Menu, Plus } from "lucide-react";
import { AppSidebar } from "./app-sidebar";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();
  
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-cyan-800/20 backdrop-blur-lg px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
       <Button
          size="icon"
          variant="ghost"
          className="sm:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      
      <div className="flex-1 text-center text-xl font-semibold hidden sm:block">
        MonsterFinance
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button size="icon" variant="ghost">
            <Bell className="h-5 w-5 text-fuchsia-500" />
             <span className="sr-only">Recordatorios</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <Plus className="h-6 w-6" />
              <span className="sr-only">Acciones Rápidas</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Registrar Ingreso</DropdownMenuItem>
            <DropdownMenuItem>Registrar Gasto</DropdownMenuItem>
            <DropdownMenuItem>Alivio/Retiro</DropdownMenuItem>
            <DropdownMenuItem>Transacción de Cuentas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
