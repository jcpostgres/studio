
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, FileText, ArrowUp, ArrowDown, Wallet } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from "firebase/firestore";
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

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const today = new Date().toISOString().split('T')[0];
        setMonthName(new Date().toLocaleString('es-ES', { month: 'long' }));
        
        const incomesRef = collection(db, `users/${userId}/incomes`);
        const expensesRef = collection(db, `users/${userId}/expenses`);
        const payrollRef = collection(db, `users/${userId}/payrollPayments`);
        const transactionsRef = collection(db, `users/${userId}/transactions`);
        
        const unsubscribeIncomes = onSnapshot(incomesRef, (snapshot) => {
            const incomes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Income);
            
            const filteredIncomes = incomes.filter(inc => {
                const date = new Date(inc.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            const totalIncome = filteredIncomes.reduce((sum, inc) => sum + (inc.amountWithCommission || 0), 0);
            
            setMonthlyData(prev => ({ ...prev, income: totalIncome, utility: totalIncome - prev.expense }));
            updateTodayTransactions({ incomes });
        });

        const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
            const expenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as Expense);
            const filteredExpenses = expenses.filter(exp => {
                const date = new Date(exp.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            const totalExpense = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            setMonthlyData(prev => ({ ...prev, expense: totalExpense, utility: prev.income - totalExpense }));
            updateTodayTransactions({ expenses });
        });

        const unsubscribePayroll = onSnapshot(payrollRef, (snapshot) => {
            const payrollPayments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as PayrollPayment);
            updateTodayTransactions({ payrollPayments });
        });

        const unsubscribeTransactions = onSnapshot(transactionsRef, (snapshot) => {
            const transactions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as TransactionType);
            updateTodayTransactions({ transactions });
        });
        
        const accountsRef = collection(db, `users/${userId}/accounts`);
        const unsubscribeAccounts = onSnapshot(accountsRef, (snapshot) => {
            const cashAccount = snapshot.docs
              .map(doc => doc.data() as Account)
              .find(acc => acc.name === "Efectivo (Caja)");
            setCurrentCash(cashAccount?.balance || 0);
            setLoading(false);
        });

        let allData: {
            incomes?: Income[],
            expenses?: Expense[],
            payrollPayments?: PayrollPayment[],
            transactions?: TransactionType[]
        } = {};

        const updateTodayTransactions = (newData: typeof allData) => {
             allData = { ...allData, ...newData };
             const { incomes = [], expenses = [], payrollPayments = [], transactions = [] } = allData;
             
             const todayTxns = [
                ...incomes.filter(inc => inc.date === today).map(inc => ({
                    id: inc.id,
                    type: 'Ingreso',
                    description: `${inc.client} - ${inc.servicesDetails.map(s => s.name).join(', ')}`,
                    amount: inc.amountWithCommission,
                    isPositive: true,
                    timestamp: inc.timestamp
                })),
                ...expenses.filter(exp => exp.date === today).map(exp => ({
                    id: exp.id,
                    type: 'Gasto',
                    description: exp.category,
                    amount: exp.amount,
                    isPositive: false,
                    timestamp: exp.timestamp
                })),
                ...payrollPayments.filter(pay => pay.date === today).map(pay => ({
                    id: pay.id,
                    type: 'Nómina',
                    description: `Pago a ${pay.employeeName}`,
                    amount: pay.totalAmount,
                    isPositive: false,
                    timestamp: pay.timestamp
                })),
                ...transactions.filter(trans => trans.date === today).map(trans => ({
                    id: trans.id,
                    type: trans.type === 'withdrawal' ? 'Alivio/Retiro' : 'Transferencia',
                    description: trans.observations || (trans.type === 'accountTransfer' ? `De ${trans.sourceAccount} a ${trans.destinationAccount}` : trans.account),
                    amount: trans.amount,
                    isPositive: trans.type === 'accountTransfer',
                    timestamp: trans.timestamp
                }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setTodayTransactions(todayTxns);
        }

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

    return (
        <div className="bg-black min-h-screen text-gray-100 p-4">
            <h2 className="text-2xl font-bold text-teal-400 mb-6 font-sans">Dashboard</h2>

             <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-6 text-center">
                <p className="text-gray-400 text-sm mb-2">ID de Usuario:</p>
                <p className="text-cyan-400 font-mono break-all text-xs">{userId}</p>
            </div>
            
            <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-teal-400">Resumen de {monthName}</CardTitle>
                </CardHeader>
                <CardContent>
                   {loading ? (
                       <div className="space-y-4">
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-8 w-full" />
                       </div>
                   ) : (
                     <div className="space-y-2 text-base">
                        <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                            <span>Ingresos:</span>
                            <span className="font-bold text-green-400">{formatCurrency(monthlyData.income)}</span>
                        </div>
                         <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg">
                            <span>Gastos:</span>
                            <span className="font-bold text-red-400">{formatCurrency(monthlyData.expense)}</span>
                        </div>
                         <div className="flex justify-between items-center p-2 bg-gray-700 rounded-lg col-span-2">
                            <span>Utilidad Neta:</span>
                            <span className="font-bold text-cyan-400">{formatCurrency(monthlyData.utility)}</span>
                        </div>
                         <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg mt-4">
                            <span>Caja Actual:</span>
                            <span className="font-bold text-yellow-400">{formatCurrency(currentCash)}</span>
                        </div>
                     </div>
                   )}
                </CardContent>
            </Card>

            <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-200">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" className="flex flex-col h-24 justify-center items-center gap-2 text-center bg-blue-500/20 border-blue-500 hover:bg-blue-500/30" onClick={() => router.push('/dashboard/transactions')}>
                        <Landmark />
                        <span>Alivio / Transacción</span>
                        <p className="text-xs text-muted-foreground">Registra retiros o transferencias</p>
                    </Button>
                    <Button variant="outline" className="flex flex-col h-24 justify-center items-center gap-2 text-center bg-purple-500/20 border-purple-500 hover:bg-purple-500/30" onClick={() => router.push('/dashboard/total-general')}>
                        <FileText />
                        <span>Total General</span>
                        <p className="text-xs text-muted-foreground">Ver resumen financiero completo</p>
                    </Button>
                </CardContent>
            </Card>

             <Card className="mb-6 bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-200">Estadísticas Rápidas (Mes Actual)</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center p-4 bg-gray-700 rounded-lg shadow-md">
                        <ArrowUp className="w-8 h-8 text-teal-400 mb-2" />
                        <p className="text-sm text-gray-400 mb-1">Ingresos</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(monthlyData.income)}</p>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-gray-700 rounded-lg shadow-md">
                        <ArrowDown className="w-8 h-8 text-red-400 mb-2" />
                        <p className="text-sm text-gray-400 mb-1">Gastos</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(monthlyData.expense)}</p>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-gray-700 rounded-lg shadow-md">
                        <Wallet className="w-8 h-8 text-yellow-400 mb-2" />
                        <p className="text-sm text-gray-400 mb-1">Efectivo (Caja)</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(currentCash)}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-200">Últimas Transacciones (Hoy)</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-24 w-full" />
                    ) : todayTransactions.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No hay transacciones registradas para hoy.</p>
                    ) : (
                        <div className="space-y-3">
                            {todayTransactions.map(transaction => (
                                <div key={transaction.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="text-gray-200 font-semibold">{transaction.type}</p>
                                        <p className="text-gray-400 text-sm truncate max-w-xs">{transaction.description}</p>
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

    