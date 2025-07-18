
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Landmark, Users, FileText, Bell, BarChart2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from "firebase/firestore";
import type { Income, Expense, Account } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

const quickAccessButtons = [
  { label: "Ingresos", icon: Wallet, href: "/dashboard/incomes" },
  { label: "Gastos", icon: Wallet, href: "/dashboard/expenses/new", iconProps: { className: "transform -scale-x-100" } },
  { label: "Nómina", icon: Users, href: "/dashboard/payroll" },
  { label: "Cuentas", icon: Landmark, href: "/dashboard/accounts" },
  { label: "Clientes y Deudas", icon: Users, href: "/dashboard/clients-debts" },
  { label: "Reporte de Servicios", icon: BarChart2, href: "/dashboard/service-report" },
  { label: "Recordatorios", icon: Bell, href: "/dashboard/reminders" },
  { label: "Total General", icon: FileText, href: "/dashboard/total-general" },
];

export default function DashboardPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<{ income: number; expense: number; utility: number }>({ income: 0, expense: 0, utility: 0 });
    const [currentCash, setCurrentCash] = useState<number>(0);
    const [monthName, setMonthName] = useState('');

    useEffect(() => {
        if (!userId || !db) return;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        setMonthName(new Date().toLocaleString('es-ES', { month: 'long' }));
        
        const incomesRef = collection(db, `users/${userId}/incomes`);
        const expensesRef = collection(db, `users/${userId}/expenses`);

        const unsubscribeIncomes = onSnapshot(incomesRef, (snapshot) => {
            const incomes = snapshot.docs.map(doc => doc.data() as Income);
            const filteredIncomes = incomes.filter(inc => {
                const date = new Date(inc.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            const totalIncome = filteredIncomes.reduce((sum, inc) => sum + (inc.amountWithCommission || 0), 0);
            setMonthlyData(prev => ({ ...prev, income: totalIncome, utility: totalIncome - prev.expense }));
        });

        const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
            const expenses = snapshot.docs.map(doc => doc.data() as Expense);
             const filteredExpenses = expenses.filter(exp => {
                const date = new Date(exp.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            setMonthlyData(prev => ({ ...prev, expense: totalExpense, utility: prev.income - totalExpense }));
        });
        
        const accountsRef = collection(db, `users/${userId}/accounts`);
        const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
            const cashAccount = snapshot.docs
              .map(doc => doc.data() as Account)
              .find(acc => acc.name === "Efectivo (Caja)");
            setCurrentCash(cashAccount?.balance || 0);
            setLoading(false);
        });


        return () => {
            unsubscribeIncomes();
            unsubscribeExpenses();
            unsubscribeAccounts();
        };

    }, [userId]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        }).format(amount);
    };

    return (
        <div>
            <div className="mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen de {monthName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                       {loading ? (
                           <div className="space-y-2">
                                <Skeleton className="h-8 w-3/4" />
                                <Skeleton className="h-8 w-1/2" />
                           </div>
                       ) : (
                         <div className="space-y-2 text-lg">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ingresos:</span>
                                <span className="font-semibold text-green-400">{formatCurrency(monthlyData.income)}</span>
                            </div>
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Gastos:</span>
                                <span className="font-semibold text-red-400">{formatCurrency(monthlyData.expense)}</span>
                            </div>
                             <div className="flex justify-between font-bold text-xl mt-4 border-t pt-2">
                                <span>Utilidad:</span>
                                <span className="text-cyan-400">{formatCurrency(monthlyData.utility)}</span>
                            </div>
                         </div>
                       )}
                    </CardContent>
                </Card>
            </div>
             <div className="mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Caja Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {loading ? (
                             <Skeleton className="h-8 w-1/2" />
                         ) : (
                            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(currentCash)}</p>
                         )}
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
