
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Landmark, FileText, ArrowUp, ArrowDown, Wallet } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Income, Expense, Account, Transaction as TransactionType, PayrollPayment } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { userId } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<{ income: number; expense: number; utility: number }>({ income: 0, expense: 0, utility: 0 });
    const [currentCash, setCurrentCash] = useState<number>(0);
    const [monthName, setMonthName] = useState('');
    const [todayTransactions, setTodayTransactions] = useState<any[]>([]);
    
    useEffect(() => {
        if (!userId || !db) return;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const today = now.toISOString().split('T')[0];
        setMonthName(now.toLocaleString('es-ES', { month: 'long' }));
        
        let allIncomes: Income[] = [];
        let allExpenses: Expense[] = [];
        let allPayrollPayments: PayrollPayment[] = [];
        let allTransactions: TransactionType[] = [];

        const parseDate = (dateString: string) => {
             // Handles 'YYYY-MM-DD' format by ensuring it's parsed in UTC to avoid timezone issues.
            return new Date(`${dateString}T00:00:00`);
        };

        const updateAllData = () => {
            const filteredIncomes = allIncomes.filter(inc => {
                const date = parseDate(inc.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            const totalIncome = filteredIncomes.reduce((sum, inc) => sum + (inc.amountWithCommission || 0), 0);
            
            const filteredExpenses = allExpenses.filter(exp => {
                const date = parseDate(exp.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            setMonthlyData({ income: totalIncome, expense: totalExpense, utility: totalIncome - totalExpense });

            const todayTxns = [
                ...allIncomes.filter(inc => inc.date === today).map(inc => ({
                    id: inc.id,
                    type: 'Ingreso',
                    description: `${inc.client} - ${inc.servicesDetails.map(s => s.name).join(', ')}`,
                    amount: inc.amountWithCommission,
                    isPositive: true,
                    timestamp: inc.timestamp
                })),
                ...allExpenses.filter(exp => exp.date === today).map(exp => ({
                    id: exp.id,
                    type: 'Gasto',
                    description: exp.category,
                    amount: exp.amount,
                    isPositive: false,
                    timestamp: exp.timestamp
                })),
                ...allPayrollPayments.filter(pay => pay.date === today).map(pay => ({
                    id: pay.id,
                    type: 'Nómina',
                    description: `Pago a ${pay.employeeName}`,
                    amount: pay.totalAmount,
                    isPositive: false,
                    timestamp: pay.timestamp
                })),
                ...allTransactions.filter(trans => trans.date === today).map(trans => ({
                    id: trans.id,
                    type: trans.type === 'withdrawal' ? 'Alivio/Retiro' : 'Transferencia',
                    description: trans.observations || (trans.type === 'accountTransfer' ? `De ${trans.sourceAccount} a ${trans.destinationAccount}` : trans.account),
                    amount: trans.amount,
                    isPositive: trans.type === 'accountTransfer', // This might need refinement
                    timestamp: trans.timestamp
                }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setTodayTransactions(todayTxns);
        };

        const incomesRef = collection(db, `users/${userId}/incomes`);
        const unsubscribeIncomes = onSnapshot(incomesRef, (snapshot) => {
            allIncomes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Income);
            updateAllData();
        });

        const expensesRef = collection(db, `users/${userId}/expenses`);
        const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
            allExpenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Expense);
            updateAllData();
        });

        const payrollRef = collection(db, `users/${userId}/payrollPayments`);
        const unsubscribePayroll = onSnapshot(payrollRef, (snapshot) => {
            allPayrollPayments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as PayrollPayment);
            updateAllData();
        });

        const transactionsRef = collection(db, `users/${userId}/transactions`);
        const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
            allTransactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as TransactionType);
            updateAllData();
        });
        
        const accountsRef = collection(db, `users/${userId}/accounts`);
        const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
            const cashAccount = snapshot.docs
              .map(doc => doc.data() as Account)
              .find(acc => acc.name.toLowerCase().includes("efectivo"));
            setCurrentCash(cashAccount?.balance || 0);
            setLoading(false);
        });

        return () => {
            unsubscribeIncomes();
            unsubscribeExpenses();
            unsubscribePayroll();
            unsubscribeTransactions();
            unsubscribeAccounts();
        };

    }, [userId]);
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        }).format(amount);
    };

    const renderSummaryCards = () => (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-base">
          <div className="p-4 bg-card-foreground/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Ingresos</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(monthlyData.income)}</p>
          </div>
            <div className="p-4 bg-card-foreground/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Gastos</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(monthlyData.expense)}</p>
          </div>
            <div className="p-4 bg-card-foreground/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Utilidad Neta</p>
              <p className="text-2xl font-bold text-cyan-400">{formatCurrency(monthlyData.utility)}</p>
          </div>
            <div className="p-4 bg-card-foreground/5 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Efectivo (Caja)</p>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(currentCash)}</p>
          </div>
        </div>
    );
    
    const renderSkeleton = (items: number) => (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: items }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );


    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Inicio</h1>
                <p className="text-muted-foreground">Un resumen rápido del estado financiero de tu negocio.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold capitalize">Resumen de {monthName}</CardTitle>
                </CardHeader>
                <CardContent>
                   {loading ? renderSkeleton(4) : renderSummaryCards()}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button onClick={() => router.push('/dashboard/transactions')} className="flex flex-col items-center justify-center p-6 bg-card-foreground/5 rounded-lg hover:bg-card-foreground/10 transition-colors">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/20 text-blue-400 mb-2">
                            <Landmark className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-primary">Alivio / Transacción</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">Registra retiros o transferencias entre tus cuentas.</p>
                    </button>
                     <button onClick={() => router.push('/dashboard/total-general')} className="flex flex-col items-center justify-center p-6 bg-card-foreground/5 rounded-lg hover:bg-card-foreground/10 transition-colors">
                        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-500/20 text-purple-400 mb-2">
                            <FileText className="h-6 w-6" />
                        </div>
                        <p className="font-semibold text-primary">Total General</p>
                        <p className="text-xs text-muted-foreground mt-1 text-center">Ver resumen financiero completo y detallado.</p>
                    </button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas Rápidas (Mes Actual)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-28 w-full" />
                      <Skeleton className="h-28 w-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="flex flex-col items-center justify-center p-4 bg-card-foreground/5 rounded-lg">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-500/10 text-green-400 mb-2">
                              <ArrowUp size={20} />
                          </div>
                          <p className="text-sm text-muted-foreground">Ingresos</p>
                          <p className="text-xl font-bold text-foreground">{formatCurrency(monthlyData.income)}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-card-foreground/5 rounded-lg">
                           <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10 text-red-400 mb-2">
                              <ArrowDown size={20} />
                          </div>
                          <p className="text-sm text-muted-foreground">Gastos</p>
                          <p className="text-xl font-bold text-foreground">{formatCurrency(monthlyData.expense)}</p>
                      </div>
                       <div className="flex flex-col items-center justify-center p-4 bg-card-foreground/5 rounded-lg">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-yellow-500/10 text-yellow-400 mb-2">
                              <Wallet size={20} />
                          </div>
                          <p className="text-sm text-muted-foreground">Efectivo (Caja)</p>
                          <p className="text-xl font-bold text-foreground">{formatCurrency(currentCash)}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
            </Card>
            
             <Card>
                <CardHeader>
                    <CardTitle>Últimas Transacciones (Hoy)</CardTitle>
                    <CardDescription>Movimientos registrados en el día de hoy.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                    ) : todayTransactions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-10">No hay transacciones registradas para hoy.</p>
                    ) : (
                        <div className="space-y-4">
                            {todayTransactions.map(transaction => (
                                <div key={transaction.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center h-10 w-10 rounded-full ${transaction.isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {transaction.isPositive ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{transaction.type}</p>
                                            <p className="text-sm text-muted-foreground truncate max-w-xs">{transaction.description}</p>
                                        </div>
                                    </div>
                                    <span className={`font-bold ${transaction.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                        {transaction.isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
