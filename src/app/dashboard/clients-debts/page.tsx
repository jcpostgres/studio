
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { assertDb } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import type { Income } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Hash, TrendingUp, TrendingDown, User } from "lucide-react";

interface ClientDebt {
    clientName: string;
    totalContracted: number;
    totalPaid: number;
    totalDebt: number;
    serviceCount: number;
}

export default function ClientsDebtsPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Income[]>([]);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
    const q = query(collection(assertDb(), `users/${userId}/incomes`), orderBy("client"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const clientDebts = useMemo<ClientDebt[]>(() => {
        const debtMap = new Map<string, ClientDebt>();
        incomes.forEach(income => {
            const clientName = income.client.trim();
            const clientData = debtMap.get(clientName) || {
                clientName: clientName,
                totalContracted: 0,
                totalPaid: 0,
                totalDebt: 0,
                serviceCount: 0,
            };
            
            clientData.serviceCount += 1;
            clientData.totalContracted += income.totalContractedAmount;
            clientData.totalPaid += income.amountPaid;
            clientData.totalDebt = clientData.totalContracted - clientData.totalPaid;
            
            debtMap.set(clientName, clientData);
        });
        return Array.from(debtMap.values()).sort((a,b) => b.totalDebt - a.totalDebt);
    }, [incomes]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    return (
        <div className="space-y-8">
            <PageHeader
                title="Clientes y Deudas"
                description="Administra los planes y deudas de tus clientes."
            />
            
            <div className="space-y-4">
                {loading ? (
                     [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
                ) : clientDebts.length > 0 ? (
                    clientDebts.map(client => (
                        <Card key={client.clientName} className="p-4 bg-card-foreground/5 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
                                    <User className="h-5 w-5" />
                                </div>
                                <h3 className="font-bold text-lg">{client.clientName}</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                                <div className="bg-background/50 p-3 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Servicios</p>
                                    <p className="text-xl font-bold">{client.serviceCount}</p>
                                </div>
                                 <div className="bg-background/50 p-3 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Contratado</p>
                                    <p className="text-xl font-bold text-cyan-400">{formatCurrency(client.totalContracted)}</p>
                                </div>
                                 <div className="bg-background/50 p-3 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Total Pagado</p>
                                    <p className="text-xl font-bold text-green-400">{formatCurrency(client.totalPaid)}</p>
                                </div>
                                 <div className="bg-background/50 p-3 rounded-lg">
                                    <p className="text-sm text-muted-foreground">Deuda Pendiente</p>
                                    <p className={`text-xl font-bold ${client.totalDebt > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                        {formatCurrency(client.totalDebt)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="flex items-center justify-center h-40">
                        <p className="text-muted-foreground">No hay clientes o deudas para mostrar.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}
