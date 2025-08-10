
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Income, Expense, Transaction, PayrollPayment } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Minus, Calendar, Users, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TotalGeneralPage() {
    const { userId } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    
    const [allIncomes, setAllIncomes] = useState<Income[]>([]);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [allPayrollPayments, setAllPayrollPayments] = useState<PayrollPayment[]>([]);

    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

    useEffect(() => {
        if (!userId || !db) return;
        setLoading(true);

        const unsubIncomes = onSnapshot(collection(db, `users/${userId}/incomes`), (snap) => 
            setAllIncomes(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Income)))
        );
        const unsubExpenses = onSnapshot(collection(db, `users/${userId}/expenses`), (snap) => 
            setAllExpenses(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Expense)))
        );
        const unsubTransactions = onSnapshot(collection(db, `users/${userId}/transactions`), (snap) => 
            setAllTransactions(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Transaction)))
        );
        const unsubPayroll = onSnapshot(collection(db, `users/${userId}/payrollPayments`), (snap) => {
            setAllPayrollPayments(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as PayrollPayment)));
            setLoading(false);
        });

        return () => {
            unsubIncomes();
            unsubExpenses();
            unsubTransactions();
            unsubPayroll();
        };

    }, [userId]);

    const filteredData = useMemo(() => {
        const parseDate = (dateString: string) => new Date(`${dateString}T00:00:00`);

        const getFilteredItems = <T extends { date: string }>(items: T[]) => {
            return items.filter(item => {
                const date = parseDate(item.date);
                return date.getFullYear().toString() === filterYear;
            });
        };

        return { 
            incomes: getFilteredItems(allIncomes), 
            expenses: getFilteredItems(allExpenses),
            transactions: getFilteredItems(allTransactions),
            payrollPayments: getFilteredItems(allPayrollPayments),
        };

    }, [allIncomes, allExpenses, allTransactions, allPayrollPayments, filterYear]);
    
    const annualSummary = useMemo(() => {
        const totalIncome = filteredData.incomes.reduce((sum, inc) => sum + (inc.amountWithCommission || 0), 0);
        const totalExpense = filteredData.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalPayroll = filteredData.payrollPayments.reduce((sum, pay) => sum + pay.totalAmount, 0);
        const totalWithdrawals = filteredData.transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
        const netUtility = totalIncome - totalExpense - totalPayroll;
        const finalCashFlow = netUtility - totalWithdrawals;

        return { totalIncome, totalExpense, totalPayroll, totalWithdrawals, netUtility, finalCashFlow };
    }, [filteredData]);
    
    const monthlyBreakdown = useMemo(() => {
        const breakdown = Array.from({ length: 12 }, (_, i) => ({
            month: i,
            monthName: new Date(0, i).toLocaleString('es-ES', { month: 'long' }),
            income: 0,
            expense: 0,
            utility: 0,
        }));
        
        const parseDate = (dateString: string) => new Date(`${dateString}T00:00:00`);

        filteredData.incomes.forEach(inc => {
            const month = parseDate(inc.date).getMonth();
            breakdown[month].income += (inc.amountWithCommission || 0);
        });
        
        filteredData.expenses.forEach(exp => {
            const month = parseDate(exp.date).getMonth();
            breakdown[month].expense += exp.amount;
        });
        
        filteredData.payrollPayments.forEach(pay => {
            const month = parseDate(pay.date).getMonth();
            // Payroll is already an expense, so we add it to the expense total
            breakdown[month].expense += pay.totalAmount;
        });

        breakdown.forEach(monthData => {
            monthData.utility = monthData.income - monthData.expense;
        });

        return breakdown;

    }, [filteredData]);


    const availableYears = useMemo(() => {
        const years = new Set([
            ...allIncomes.map(inc => new Date(inc.date).getFullYear().toString()),
            ...allExpenses.map(exp => new Date(exp.date).getFullYear().toString()),
            ...allTransactions.map(t => new Date(t.date).getFullYear().toString()),
            ...allPayrollPayments.map(p => new Date(p.date).getFullYear().toString()),
        ]);
        const currentYear = new Date().getFullYear().toString();
        if (!years.has(currentYear)) { years.add(currentYear); }
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allIncomes, allExpenses, allTransactions, allPayrollPayments]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
    
    const handleExport = (data: any[], fileName: string) => {
        if (data.length === 0) {
            toast({ variant: "destructive", title: "Sin Datos", description: `No hay datos para exportar en ${fileName}.`});
            return;
        }

        // Create CSV content
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                let value = row[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                if (typeof value === 'object' && value !== null) {
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');

        // Create a Blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}_${filterYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Éxito", description: "La descarga de tu reporte ha comenzado."});
    };


    const MetricCard = ({ title, value, colorClass, loading }: { title: string, value: number, colorClass: string, loading: boolean }) => (
        <div className="p-4 bg-card-foreground/5 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <p className={`text-2xl font-bold ${colorClass}`}>{formatCurrency(value)}</p>}
        </div>
    );
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader
                    title="Total General"
                    description={`Resumen financiero para el año ${filterYear}`}
                />
                <Select value={filterYear} onValueChange={setFilterYear} disabled={loading}>
                    <SelectTrigger className="w-[120px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Resumen Anual</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard title="Ingresos Totales" value={annualSummary.totalIncome} colorClass="text-green-400" loading={loading} />
                        <MetricCard title="Gastos Totales" value={annualSummary.totalExpense + annualSummary.totalPayroll} colorClass="text-red-400" loading={loading} />
                        <MetricCard title="Utilidad Neta" value={annualSummary.netUtility} colorClass="text-cyan-400" loading={loading} />
                        <MetricCard title="Nómina Pagada" value={annualSummary.totalPayroll} colorClass="text-purple-400" loading={loading} />

                    </div>
                </CardContent>
            </Card>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Flujo de Caja Final</CardTitle>
                         <CardDescription>Utilidad Neta - Retiros</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-10 w-1/2" /> :
                            <p className={`text-4xl font-bold ${annualSummary.finalCashFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(annualSummary.finalCashFlow)}
                            </p>
                        }
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Retiros (Alivios)</CardTitle>
                         <CardDescription>Total de dinero retirado de las cuentas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-10 w-1/2" /> :
                            <p className="text-4xl font-bold text-yellow-400">
                                {formatCurrency(annualSummary.totalWithdrawals)}
                            </p>
                        }
                    </CardContent>
                </Card>
             </div>
             
             <Card>
                <CardHeader>
                    <CardTitle>Exportar Datos</CardTitle>
                    <CardDescription>Descarga los datos del año seleccionado en formato CSV.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button onClick={() => handleExport(filteredData.incomes, 'ingresos')} disabled={loading}>
                        <Download className="mr-2 h-4 w-4" /> Exportar Ingresos
                    </Button>
                    <Button onClick={() => handleExport(filteredData.expenses, 'gastos')} disabled={loading}>
                        <Download className="mr-2 h-4 w-4" /> Exportar Gastos
                    </Button>
                    <Button onClick={() => handleExport(filteredData.payrollPayments, 'nomina')} disabled={loading}>
                        <Download className="mr-2 h-4 w-4" /> Exportar Nómina
                    </Button>
                </CardContent>
             </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Desglose Mensual (Ingresos vs. Gastos)</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? <Skeleton className="h-64 w-full" /> : 
                        <div className="bg-card-foreground/5 rounded-xl p-2 space-y-1">
                            <div className="grid grid-cols-4 gap-2 px-4 py-2 font-semibold text-muted-foreground">
                                <div className="text-left">Mes</div>
                                <div className="text-right">Ingresos</div>
                                <div className="text-right">Gastos</div>
                                <div className="text-right">Utilidad</div>
                            </div>
                            {monthlyBreakdown.map((month) => (
                                (month.income > 0 || month.expense > 0) && (
                                    <div key={month.month} className="grid grid-cols-4 gap-2 px-4 py-3 bg-card/50 rounded-lg items-center">
                                        <div className="text-left font-medium capitalize">{month.monthName}</div>
                                        <div className="text-right text-green-400">{formatCurrency(month.income)}</div>
                                        <div className="text-right text-red-400">{formatCurrency(month.expense)}</div>
                                        <div className={`text-right font-semibold ${month.utility >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>{formatCurrency(month.utility)}</div>
                                    </div>
                                )
                            ))}
                        </div>
                    }
                </CardContent>
            </Card>
        </div>
    );
}
