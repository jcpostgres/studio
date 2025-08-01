
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Employee, Account, PayrollPayment, Expense } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, collection, writeBatch, getDoc } from "firebase/firestore";

const formSchema = z.object({
    date: z.string().min(1, "La fecha es requerida."),
    totalAmount: z.coerce.number().positive("El monto debe ser positivo."),
    paymentAccount: z.string().min(1, "La cuenta de pago es requerida."),
    observations: z.string().optional(),
});

type PayrollPaymentFormValues = z.infer<typeof formSchema>;

interface PayrollPaymentFormProps {
    employee: Employee;
    paymentType: '4th' | '20th';
    selectedDate: { month: number; year: number };
    accounts: Account[];
    onSuccess: () => void;
}

export function PayrollPaymentForm({ employee, paymentType, selectedDate, accounts, onSuccess }: PayrollPaymentFormProps) {
    const { userId } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PayrollPaymentFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            totalAmount: employee.biWeeklySalary,
            paymentAccount: "",
            observations: `Pago quincena ${paymentType === '4th' ? '1' : '2'} a ${employee.name}`,
        },
    });

    async function onSubmit(values: PayrollPaymentFormValues) {
        if (!userId) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
            return;
        }
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(db);

            // 1. Create Payroll Payment Record
            const paymentRef = doc(collection(db, `users/${userId}/payrollPayments`));
            const paymentToSave: Omit<PayrollPayment, 'id'> = {
                employeeId: employee.id,
                employeeName: employee.name,
                paymentType,
                month: selectedDate.month,
                year: selectedDate.year,
                totalAmount: values.totalAmount,
                date: values.date,
                observations: values.observations || "",
                timestamp: new Date().toISOString(),
                paymentAccount: values.paymentAccount,
            };
            batch.set(paymentRef, paymentToSave);

            // 2. Create corresponding Expense record
            const expenseRef = doc(collection(db, `users/${userId}/expenses`));
            const expenseToSave: Omit<Expense, 'id'> = {
                date: values.date,
                type: 'fijo',
                category: 'Nómina',
                amount: values.totalAmount,
                paymentAccount: values.paymentAccount,
                responsible: 'Sistema',
                observations: `Pago de nómina a ${employee.name}. Ref: ${paymentRef.id}`,
                timestamp: new Date().toISOString(),
            };
            batch.set(expenseRef, expenseToSave);

            // 3. Update Account Balance
            const accountRef = doc(db, `users/${userId}/accounts`, values.paymentAccount);
            const accountSnap = await getDoc(accountRef);
            if (!accountSnap.exists()) {
                throw new Error("La cuenta de pago no existe.");
            }
            const newBalance = accountSnap.data().balance - values.totalAmount;
            batch.update(accountRef, { balance: newBalance });

            await batch.commit();

            toast({ title: "Éxito", description: "Pago de nómina registrado como gasto exitosamente." });
            onSuccess();
        } catch (error) {
            console.error("Error saving payroll payment:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo registrar el pago." });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="date" render={({ field }) => (
                        <FormItem><FormLabel>Fecha de Pago</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="totalAmount" render={({ field }) => (
                        <FormItem><FormLabel>Monto a Pagar</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                 </div>
                <FormField control={form.control} name="paymentAccount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuenta de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {accounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name} ({new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(account.balance)})</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                 <FormField control={form.control} name="observations" render={({ field }) => (
                    <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</> : "Confirmar Pago"}
                </Button>
            </form>
        </Form>
    );
}

    