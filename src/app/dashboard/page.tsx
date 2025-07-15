"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Landmark, Users, FileText, Bell, BarChart2 } from "lucide-react";

const quickAccessButtons = [
  { label: "Ingresos", icon: Wallet, href: "/dashboard/incomes" },
  { label: "Gastos", icon: Wallet, href: "/dashboard/expenses", iconProps: { className: "transform -scale-x-100" } },
  { label: "Nómina", icon: Users, href: "/dashboard/payroll" },
  { label: "Cuentas", icon: Landmark, href: "/dashboard/accounts" },
  { label: "Clientes y Deudas", icon: Users, href: "/dashboard/clients-debts" },
  { label: "Reporte de Servicios", icon: BarChart2, href: "/dashboard/service-report" },
  { label: "Recordatorios", icon: Bell, href: "/dashboard/reminders" },
  { label: "Total General", icon: FileText, href: "/dashboard/total-general" },
];

export default function DashboardPage() {
    const { userId } = useAuth();
    return (
        <div>
            <div className="mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen Mensual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Próximamente...</p>
                    </CardContent>
                </Card>
            </div>
             <div className="mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Caja Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-muted-foreground">Próximamente...</p>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {quickAccessButtons.map((item) => (
                    <Button key={item.label} variant="outline" className="flex flex-col h-24 justify-center items-center gap-2 text-center" asChild>
                         <a href={item.href}>
                            <item.icon {...item.iconProps} />
                            <span>{item.label}</span>
                         </a>
                    </Button>
                ))}
            </div>

            <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400">ID de Usuario: <span className="font-mono text-cyan-400">{userId}</span></p>
            </div>
        </div>
    );
}
