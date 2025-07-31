
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, writeBatch } from "firebase/firestore";
import { Reminder, AdminPayment } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type CombinedReminder = Reminder & { type: 'Ingreso' | 'Pago Administrativo' };

export default function RemindersPage() {
    const { userId } = useAuth();
    const { toast } = useToast();
    const [reminders, setReminders] = useState<CombinedReminder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const remindersRef = collection(db, `users/${userId}/reminders`);
        const q = query(remindersRef, orderBy("dueDate", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReminders = snapshot.docs.map(doc => {
                const data = doc.data() as Reminder;
                return { 
                    ...data, 
                    id: doc.id,
                    type: data.incomeId ? 'Ingreso' : 'Pago Administrativo'
                } as CombinedReminder;
            });
            setReminders(fetchedReminders);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reminders: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los recordatorios." });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, toast]);

    const handleMarkAsResolved = async (reminderId: string) => {
        if (!userId) return;
        try {
            const reminderRef = doc(db, `users/${userId}/reminders`, reminderId);
            await updateDoc(reminderRef, {
                status: 'resolved',
                resolvedAt: new Date().toISOString()
            });
            toast({ title: "Éxito", description: "Recordatorio marcado como resuelto." });
        } catch (error) {
            console.error("Error resolving reminder: ", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el recordatorio." });
        }
    };
    
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    return (
        <>
            <PageHeader
                title="Recordatorios"
                description="Gestiona tus recordatorios de renovaciones de planes y pagos."
            />
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Recordatorios Pendientes</CardTitle>
                        <CardDescription>
                            Aquí se listan los pagos administrativos y renovaciones de ingresos que requieren tu atención.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha de Vencimiento</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : reminders.length > 0 ? (
                                    reminders.map(reminder => (
                                        <TableRow key={reminder.id}>
                                            <TableCell>{formatDate(reminder.dueDate)}</TableCell>
                                            <TableCell>
                                                <Badge variant={reminder.type === 'Ingreso' ? 'default' : 'secondary'}>
                                                    {reminder.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{reminder.message}</TableCell>
                                            <TableCell>{formatCurrency(reminder.renewalAmount)}</TableCell>
                                            <TableCell>
                                                <Badge variant={reminder.status === 'pending' ? 'destructive' : 'default'}>
                                                    {reminder.status === 'pending' ? 'Pendiente' : 'Resuelto'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {reminder.status === 'pending' && (
                                                    <Button size="sm" onClick={() => handleMarkAsResolved(reminder.id)}>
                                                        Marcar Resuelto
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No tienes recordatorios pendientes.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
