
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import type { Income } from "@/lib/types";
import { getIncomes } from "@/lib/actions/db.actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DollarSign, Hash, TrendingUp, TrendingDown, User, CreditCard, Calendar, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { getAccounts, saveIncome, saveClientPayment, getClientPayments } from "@/lib/actions/db.actions";

interface ClientDebt {
    clientName: string;
    totalContracted: number;
    totalPaid: number;
    totalDebt: number;
    serviceCount: number;
}

export default function ClientsDebtsPage() {
    const { userId } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [clientPayments, setClientPayments] = useState<any[]>([]);

    // Payment dialog state
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [payClient, setPayClient] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [payAccount, setPayAccount] = useState<string>("");
    const [isProcessingPay, setIsProcessingPay] = useState(false);

    useEffect(() => {
        if (!userId) return;

        async function fetchIncomes() {
            setLoading(true);
            try {
                const fetchedIncomes = await getIncomes(userId);
                setIncomes(fetchedIncomes);
                const accs = await getAccounts(userId);
                setAccounts(accs);
                const payments = await getClientPayments(userId);
                setClientPayments(payments);
            } catch (error) {
                console.error("Error fetching incomes for client debts:", error);
                toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de clientes." });
            } finally {
                setLoading(false);
            }
        }
        fetchIncomes();
    }, [userId, toast]);

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

    const exportClientDataToPdf = (clientName: string) => {
        const doc = new jsPDF();
        const clientIncomes = incomes.filter(i => i.client.trim() === clientName);
        const clientPaymentsData = clientPayments.filter(p => p.clientName === clientName);

        doc.text(`Reporte Cliente: ${clientName}`, 14, 15);

        // Ingresos
        autoTable(doc, {
            head: [["Fecha contratación", "Servicios", "Total Contratado", "Monto Pagado", "Cuenta"]],
            body: clientIncomes.map(i => [
                new Date(`${i.date}T00:00:00`).toLocaleDateString('es-ES'),
                (i.servicesDetails || []).map((s:any) => s.name).join(', '),
                formatCurrency(i.totalContractedAmount || 0),
                formatCurrency(i.amountPaid || 0),
                (accounts.find(a => a.id === i.paymentAccount)?.name) || i.paymentAccount || '-'
            ]),
            startY: 25,
        });

        // Pagos de deuda
        const yAfterIncomes = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 80;
        doc.text('Pagos de Deuda', 14, yAfterIncomes - 2);
        autoTable(doc, {
            head: [["Fecha", "Monto", "Cuenta"]],
            body: clientPaymentsData.map(p => [
                new Date(`${p.date}T00:00:00`).toLocaleDateString('es-ES'),
                formatCurrency(p.amount || 0),
                (accounts.find(a => a.id === p.account)?.name) || p.account || '-'
            ]),
            startY: yAfterIncomes + 2,
        });

        doc.save(`cliente_${clientName.replace(/\s+/g,'_')}.pdf`);
        toast({ title: 'Éxito', description: `Descargando reporte PDF de ${clientName}` });
    };

    

    const exportAllClientsToPdf = () => {
        const doc = new jsPDF();
        clientDebts.forEach((client, idx) => {
            const clientName = client.clientName;
            const clientIncomes = incomes.filter(i => i.client.trim() === clientName);
            const clientPaymentsData = clientPayments.filter(p => p.clientName === clientName);

            doc.text(`Cliente: ${clientName}`, 14, 15);
            autoTable(doc, {
                head: [["Fecha contratación", "Servicios", "Total Contratado", "Monto Pagado", "Cuenta"]],
                body: clientIncomes.map(i => [
                    new Date(`${i.date}T00:00:00`).toLocaleDateString('es-ES'),
                    (i.servicesDetails || []).map((s:any) => s.name).join(', '),
                    formatCurrency(i.totalContractedAmount || 0),
                    formatCurrency(i.amountPaid || 0),
                    (accounts.find(a => a.id === i.paymentAccount)?.name) || i.paymentAccount || '-'
                ]),
                startY: 22,
            });

            const yAfter = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 80;
            doc.text('Pagos de Deuda', 14, yAfter - 2);
            autoTable(doc, {
                head: [["Fecha", "Monto", "Cuenta"]],
                body: clientPaymentsData.map(p => [
                    new Date(`${p.date}T00:00:00`).toLocaleDateString('es-ES'),
                    formatCurrency(p.amount || 0),
                    (accounts.find(a => a.id === p.account)?.name) || p.account || '-'
                ]),
                startY: yAfter + 2,
            });

            if (idx < clientDebts.length - 1) doc.addPage();
        });
        doc.save(`todos_clientes_detallado.pdf`);
        toast({ title: 'Éxito', description: 'Descargando reporte PDF de todos los clientes.' });
    };

    

    // helper: gather incomes of a client with remaining balance > 0, ordered by date asc
    const getOutstandingIncomes = (clientName: string) => {
        return incomes
            .filter(i => i.client.trim() === clientName && (i.totalContractedAmount - i.amountPaid) > 0)
            .sort((a,b) => new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime());
    };

    const handleConfirmPayment = async () => {
        if (!userId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Usuario no autenticado.' });
            return;
        }
        if (!payClient) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selecciona un cliente.' });
            return;
        }
        let remaining = Number(payAmount) || 0;
        if (remaining <= 0) {
            toast({ variant: 'destructive', title: 'Monto inválido', description: 'Ingresa un monto mayor a 0.' });
            return;
        }
        if (!payAccount) {
            toast({ variant: 'destructive', title: 'Cuenta requerida', description: 'Selecciona una cuenta de pago.' });
            return;
        }
        console.log('handleConfirmPayment', { payClient, payAmount, payDate, payAccount, userId });
        toast({ title: 'Procesando pago', description: `Aplicando ${formatCurrency(Number(payAmount))} a ${payClient}` });
        setIsProcessingPay(true);
        try {
            const outstanding = getOutstandingIncomes(payClient);
            if (outstanding.length === 0) {
                toast({ variant: 'destructive', title: 'Sin deudas', description: 'No se encontraron deudas para este cliente.' });
                setIsPayDialogOpen(false);
                return;
            }

            const appliedIncomeIds: string[] = [];
            for (const inc of outstanding) {
                if (remaining <= 0) break;
                const incRemaining = inc.totalContractedAmount - inc.amountPaid;
                const toApply = Math.min(incRemaining, remaining);
                const updatedIncome = { 
                    ...inc, 
                    // ensure services array is present for saveIncome logic
                    services: (inc as any).services || (inc.servicesDetails || []).map(s => s.name),
                    amountPaid: Number((inc.amountPaid + toApply).toFixed(2)), 
                    paymentAccount: payAccount,
                    observations: `${inc.observations || ''} Pago aplicado: ${toApply} el ${payDate}.` 
                } as any;
                // Save updated income (server action) and check result
                const result = await saveIncome(userId, updatedIncome);
                if (!result || !result.success) {
                    throw new Error(result?.message || 'Error al guardar el ingreso.');
                }
                appliedIncomeIds.push(inc.id);
                remaining -= toApply;
            }

            // Record client payment in history (server action)
                try {
                    const paidAmount = Number(payAmount) - Number(remaining || 0);
                    await saveClientPayment(userId, (payClient || '').trim(), payDate, paidAmount, payAccount, appliedIncomeIds);
                    // refresh client payments
                    const payments = await getClientPayments(userId);
                    console.log('Refreshed clientPayments after save:', payments);
                    setClientPayments(payments);
                } catch (err) {
                    console.error('Error saving client payment record:', err);
                }

            // Refresh incomes
            const refreshed = await getIncomes(userId);
            setIncomes(refreshed);
            toast({ title: 'Pago registrado', description: 'El pago se ha aplicado a las deudas del cliente.' });
            setIsPayDialogOpen(false);
            setPayClient(null);
        } catch (error: any) {
            console.error('Error applying client payment:', error);
            toast({ variant: 'destructive', title: 'Error', description: error?.message || 'No se pudo procesar el pago.' });
        } finally {
            setIsProcessingPay(false);
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Clientes y Deudas"
                description="Administra los planes y deudas de tus clientes."
            />
            <div className="flex items-center gap-2 mt-2">
                <Button className="flex items-center gap-2" onClick={() => exportAllClientsToPdf()} disabled={loading}>
                    <Download className="h-4 w-4" /> Exportar Todos (PDF)
                </Button>
                {/* Removed XLSX export button */}
                {/* <Button className="flex items-center gap-2" onClick={() => exportAllClientsToXlsx()} disabled={loading}>
                    <Download className="h-4 w-4" /> Exportar Todos (XLSX)
                </Button> */}
            </div>
            
            <div className="space-y-4">
                {loading ? (
                     [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
                ) : clientDebts.length > 0 ? (
                    clientDebts.map(client => (
                        <Card key={client.clientName} className="p-4 bg-card-foreground/5 rounded-xl">
                            <div className="flex items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <h3 className="font-bold text-lg">{client.clientName}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => exportClientDataToPdf(client.clientName)}>
                                        <Download className="mr-2 h-4 w-4" />PDF
                                    </Button>
                                </div>
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
                                 <div className="bg-background/50 p-3 rounded-lg flex items-center justify-center gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Deuda Pendiente</p>
                                        <p className={`text-xl font-bold ${client.totalDebt > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                            {formatCurrency(client.totalDebt)}
                                        </p>
                                    </div>
                                    {client.totalDebt > 0 && (
                                        <div>
                                            <Button size="sm" onClick={() => {
                                                setPayClient(client.clientName);
                                                setPayAmount(client.totalDebt);
                                                setPayDate(new Date().toISOString().split('T')[0]);
                                                setPayAccount(accounts[0]?.id || "");
                                                setIsPayDialogOpen(true);
                                            }}>Abonar</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4" />
                            
                            {/* Recent payments for this client */}
                            {clientPayments && clientPayments.filter(p => p.clientName === client.clientName).length > 0 && (
                                <div className="mt-4">
                                    <p className="text-sm font-semibold mb-2">Pagos Recientes</p>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span>Fecha</span>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                            <span>Monto</span>
                                                        </div>
                                                    </TableHead>
                                                    <TableHead>
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                            <span>Cuenta / Banco</span>
                                                        </div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {clientPayments.filter(p => p.clientName === client.clientName).slice(0,3).map(p => {
                                                    const acc = accounts.find(a => a.id === p.account);
                                                    return (
                                                        <TableRow key={p.id} className="hover:bg-muted/50">
                                                            <TableCell className="text-sm text-muted-foreground flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                {new Date(`${p.date}T00:00:00`).toLocaleDateString('es-ES')}
                                                            </TableCell>
                                                            <TableCell className="text-sm font-medium">
                                                                <span className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-green-50 text-green-800">
                                                                    <DollarSign className="h-4 w-4" />
                                                                    {formatCurrency(p.amount)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-sm flex items-center gap-2">
                                                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                                                <div className="truncate">{acc?.name || p.account || '-'}</div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))
                ) : (
                    <Card className="flex items-center justify-center h-40">
                        <p className="text-muted-foreground">No hay clientes o deudas para mostrar.</p>
                    </Card>
                )}
            </div>

            {/* Payment Dialog */}
            <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pagar deuda de {payClient}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="text-sm">Fecha</label>
                                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm">Monto</label>
                                <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="text-sm">Cuenta</label>
                                <Select value={payAccount} onValueChange={setPayAccount}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                                    <SelectContent>
                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(acc.balance)})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsPayDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleConfirmPayment} disabled={isProcessingPay}>
                                {isProcessingPay ? 'Procesando...' : 'Confirmar Pago'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
