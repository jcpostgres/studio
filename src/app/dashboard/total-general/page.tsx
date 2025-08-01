
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Income, Expense, Account } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function TotalGeneralPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    
    const [allIncomes, setAllIncomes] = useState<Income[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [allAccounts, setAllAccounts] = useState<Account[]>([]);
    
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
    const [filterMonth, setFilterMonth] = useState<string>('all');

    useEffect(() => {
        if (!userId || !db) return;
        setLoading(true);

        const unsubIncomes = onSnapshot(collection(db, `users/${userId}/incomes`), (snap) => 
            setAllIncomes(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Income)))
        );
        const unsubExpenses = onSnapshot(collection(db, `users/${userId}/expenses`), (snap) => 
            setAllExpenses(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Expense)))
        );
        const unsubAccounts = onSnapshot(collection(db, `users/${userId}/accounts`), (snap) => {
            setAllAccounts(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Account)));
            setLoading(false);
        });

        return () => {
            unsubIncomes();
            unsubExpenses();
            unsubAccounts();
        };

    }, [userId]);

    const filteredData = useMemo(() => {
        const parseDate = (dateString: string) => new Date(`${dateString}T00:00:00`);

        const incomes = allIncomes.filter(inc => {
            const date = parseDate(inc.date);
            const matchesYear = date.getFullYear().toString() === filterYear;
            const matchesMonth = filterMonth === 'all' || date.getMonth().toString() === filterMonth;
            return matchesYear && matchesMonth;
        });

        const expenses = allExpenses.filter(exp => {
            const date = parseDate(exp.date);
            const matchesYear = date.getFullYear().toString() === filterYear;
            const matchesMonth = filterMonth === 'all' || date.getMonth().toString() === filterMonth;
            return matchesYear && matchesMonth;
        });

        return { incomes, expenses };

    }, [allIncomes, allExpenses, filterYear, filterMonth]);
    
    const summary = useMemo(() => {
        const totalIncome = filteredData.incomes.reduce((sum, inc) => sum + (inc.amountWithCommission || 0), 0);
        const totalExpense = filteredData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netUtility = totalIncome - totalExpense;
        return { totalIncome, totalExpense, netUtility };
    }, [filteredData]);

    const incomeDetails = useMemo(() => {
        const topClients = filteredData.incomes.reduce((acc, inc) => {
            acc[inc.client] = (acc[inc.client] || 0) + inc.amountPaid;
            return acc;
        }, {} as Record<string, number>);

        const topServices = filteredData.incomes.flatMap(i => i.servicesDetails).reduce((acc, s) => {
            acc[s.name] = (acc[s.name] || 0) + s.amount;
            return acc;
        }, {} as Record<string, number>);

        return {
            topClients: Object.entries(topClients).sort(([,a],[,b]) => b - a).slice(0, 5),
            topServices: Object.entries(topServices).sort(([,a],[,b]) => b - a).slice(0, 5),
        };
    }, [filteredData.incomes]);

    const expenseDetails = useMemo(() => {
        const topCategories = filteredData.expenses.reduce((acc, exp) => {
            acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        return {
            topCategories: Object.entries(topCategories).sort(([,a],[,b]) => b - a).slice(0, 5),
        }
    }, [filteredData.expenses]);

    const availableYears = useMemo(() => {
        const years = new Set([
            ...allIncomes.map(inc => new Date(inc.date).getFullYear().toString()),
            ...allExpenses.map(exp => new Date(exp.date).getFullYear().toString())
        ]);
        const currentYear = new Date().getFullYear().toString();
        if (!years.has(currentYear)) { years.add(currentYear); }
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allIncomes, allExpenses]);

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    const renderMetricCard = (title: string, value: number, colorClass: string) => (
        <Card className="flex flex-col justify-center p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <p className={`text-3xl font-bold ${colorClass}`}>{formatCurrency(value)}</p>
        </Card>
    );

    const renderDetailList = (title: string, data: [string, number][]) => (
        <div className="space-y-2">
            <h4 className="font-semibold text-muted-foreground">{title}</h4>
            {data.length > 0 ? (
                <ul className="space-y-1 text-sm">
                    {data.map(([name, value]) => (
                        <li key={name} className="flex justify-between items-center">
                            <span>{name}</span>
                            <span className="font-mono text-foreground">{formatCurrency(value)}</span>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-sm text-muted-foreground">No hay datos para mostrar.</p>}
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Total General" description="Cargando resumen financiero completo..." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Skeleton className="h-12 w-full" />
                     <Skeleton className="h-12 w-full" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-8">
            <PageHeader title="Total General" description="Consulta un resumen financiero completo." />

            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar Año" /></SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar Mes" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todo el Año</SelectItem>
                            {months.map((month, index) => <SelectItem key={index} value={index.toString()}>{month}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* General Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Resumen del Período</CardTitle>
                    <CardDescription>
                        Resultados para {filterMonth === 'all' ? `el año ${filterYear}` : `${months[parseInt(filterMonth)]} de ${filterYear}`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {renderMetricCard("Ingresos Totales", summary.totalIncome, "text-green-400")}
                    {renderMetricCard("Gastos Totales", summary.totalExpense, "text-red-400")}
                    {renderMetricCard("Utilidad Neta", summary.netUtility, "text-cyan-400")}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                 {/* Income Details */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Detalle de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {renderDetailList("Top 5 Clientes", incomeDetails.topClients)}
                         <hr className="border-border" />
                        {renderDetailList("Top 5 Servicios", incomeDetails.topServices)}
                    </CardContent>
                </Card>

                 {/* Expense & Accounts Details */}
                <div className="lg:col-span-2 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Detalle de Gastos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {renderDetailList("Top 5 Categorías de Gastos", expenseDetails.topCategories)}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Saldos de Cuentas</CardTitle>
                            <CardDescription>Balance actual de todas tus cuentas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <ul className="space-y-2">
                                {allAccounts.map(account => (
                                    <li key={account.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-card-foreground/5">
                                        <div>
                                            <span className="font-medium">{account.name}</span>
                                            <Badge variant="secondary" className="ml-2">Comisión: {(account.commission * 100).toFixed(0)}%</Badge>
                                        </div>
                                        <span className="font-mono font-semibold text-lg text-primary">{formatCurrency(account.balance)}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
