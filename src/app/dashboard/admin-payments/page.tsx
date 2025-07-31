
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import type { AdminPayment } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminPaymentForm } from "@/components/admin-payments/admin-payment-form";
import { AdminPaymentsTable } from "@/components/admin-payments/admin-payments-table";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import { deleteAdminPayment } from "@/lib/actions/admin-payments.actions";

export default function AdminPaymentsPage() {
    const { userId } = useAuth();
    const { toast } = useToast();

    const [payments, setPayments] = useState<AdminPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<AdminPayment | null>(null);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<AdminPayment | null>(null);
    
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState("Todos");
    
    const categories = ["Todos", "Servicios Básicos", "Alquiler", "Seguros", "Préstamos/Créditos", "Suscripciones/Membresías", "Impuestos", "Otros"];

    useEffect(() => {
        if (!userId) return;

        const baseQuery = collection(db, `users/${userId}/adminPayments`);
        let q = query(baseQuery, orderBy("conceptName", "asc"));

        if (filterCategory !== "Todos") {
            q = query(q, where("category", "==", filterCategory));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let fetchedPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminPayment));
            
            if (searchTerm) {
                fetchedPayments = fetchedPayments.filter(p => 
                    p.conceptName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.providerName && p.providerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (p.contractNumber && p.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }
            
            setPayments(fetchedPayments);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching admin payments:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los registros." });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, searchTerm, filterCategory, toast]);

    const handleEdit = (payment: AdminPayment) => {
        setEditingPayment(payment);
        setIsDialogOpen(true);
    };

    const handleDelete = (payment: AdminPayment) => {
        setPaymentToDelete(payment);
        setIsAlertOpen(true);
    };

    const confirmDelete = async () => {
        if (!userId || !paymentToDelete) return;
        const result = await deleteAdminPayment({ userId, paymentId: paymentToDelete.id });
        if (result.success) {
            toast({ title: "Éxito", description: "Registro eliminado correctamente." });
        } else {
            toast({ variant: "destructive", title: "Error", description: result.message });
        }
        setIsAlertOpen(false);
        setPaymentToDelete(null);
    };

    const openNewPaymentDialog = () => {
        setEditingPayment(null);
        setIsDialogOpen(true);
    };

    return (
        <>
            <PageHeader
                title="Pagos Administrativos"
                description="Gestiona pagos recurrentes, servicios, seguros y más."
            >
                <Button onClick={openNewPaymentDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Registro
                </Button>
            </PageHeader>
            
            <Card className="mt-8">
                <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            placeholder="Buscar por concepto, proveedor o contrato..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                         <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger><SelectValue placeholder="Filtrar por categoría" /></SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8">
                <Card>
                    <CardContent className="p-0">
                        <AdminPaymentsTable
                            payments={payments}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            loading={loading}
                        />
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setEditingPayment(null);
            }}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPayment ? "Editar Registro" : "Nuevo Registro Administrativo"}</DialogTitle>
                    </DialogHeader>
                    <AdminPaymentForm
                        paymentToEdit={editingPayment}
                        onSuccess={() => setIsDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro de <span className="font-bold">{paymentToDelete?.conceptName}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
