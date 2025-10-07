
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AdminPayment, Reminder } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";
import { assertDb } from "@/lib/firebase";
import { doc, setDoc, writeBatch, collection, getDoc } from "firebase/firestore";

const adminPaymentSchema = z.object({
    conceptName: z.string().min(2, "El nombre del concepto es requerido."),
    category: z.enum(["Servicios Básicos", "Alquiler", "Seguros", "Préstamos/Créditos", "Suscripciones/Membresías", "Impuestos", "Otros"]),
    providerName: z.string().min(2, "El nombre del proveedor es requerido."),
    contractNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    providerId: z.string().optional(),
    paymentAmount: z.coerce.number().optional(),
    paymentCurrency: z.string().default("USD"),
    paymentFrequency: z.enum(["Mensual", "Bimestral", "Trimestral", "Anual", "Única vez"]).optional(),
    paymentDueDate: z.string().optional(),
    renewalDate: z.string().optional(),
    paymentMethod: z.string().optional(),
    beneficiaryBank: z.string().optional(),
    beneficiaryAccountNumber: z.string().optional(),
    beneficiaryAccountType: z.enum(["Ahorro", "Corriente"]).optional(),
    notes: z.string().optional(),
});


type AdminPaymentFormValues = z.infer<typeof adminPaymentSchema>;

const categories = ["Servicios Básicos", "Alquiler", "Seguros", "Préstamos/Créditos", "Suscripciones/Membresías", "Impuestos", "Otros"];
const frequencies = ["Mensual", "Bimestral", "Trimestral", "Anual", "Única vez"];

interface AdminPaymentFormProps {
    paymentToEdit?: AdminPayment | null;
    onSuccess: () => void;
}

export function AdminPaymentForm({ paymentToEdit, onSuccess }: AdminPaymentFormProps) {
    const { userId } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<AdminPaymentFormValues>({
        resolver: zodResolver(adminPaymentSchema),
        defaultValues: paymentToEdit ? {
            ...paymentToEdit,
            paymentDueDate: paymentToEdit.paymentDueDate ? new Date(paymentToEdit.paymentDueDate).toISOString().split('T')[0] : "",
            renewalDate: paymentToEdit.renewalDate ? new Date(paymentToEdit.renewalDate).toISOString().split('T')[0] : "",
        } : {
            conceptName: "",
            providerName: "",
            contractNumber: "",
            referenceNumber: "",
            providerId: "",
            paymentAmount: undefined,
            paymentCurrency: "USD",
            category: "Otros",
            paymentDueDate: "",
            renewalDate: "",
            paymentMethod: "",
            beneficiaryBank: "",
            beneficiaryAccountNumber: "",
            notes: "",
        },
    });

    async function onSubmit(values: AdminPaymentFormValues) {
        if (!userId) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
            return;
        }
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(assertDb());
    
            const docRef = paymentToEdit
                ? doc(assertDb(), `users/${userId}/adminPayments`, paymentToEdit.id)
                : doc(collection(assertDb(), `users/${userId}/adminPayments`));
    
            const existingDataSnap = paymentToEdit ? await getDoc(docRef) : null;
            const existingData = existingDataSnap?.data();
    
            const dataToSave: Omit<AdminPayment, 'id'> = {
                ...values,
                paymentDueDate: values.paymentDueDate || null,
                renewalDate: values.renewalDate || null,
                createdAt: existingData?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
    
            batch.set(docRef, dataToSave, { merge: true });
    
            // --- REMINDER LOGIC ---
            const reminderRef = doc(assertDb(), `users/${userId}/reminders`, docRef.id);
            if (dataToSave.paymentDueDate) {
                const reminderMessage = `Recordatorio de Pago: ${dataToSave.conceptName} vence el ${new Date(dataToSave.paymentDueDate).toLocaleDateString()}.`;
                const reminderData: Omit<Reminder, 'id'> = {
                    incomeId: null,
                    adminPaymentId: docRef.id,
                    clientId: dataToSave.providerName,
                    brandName: dataToSave.conceptName,
                    service: dataToSave.category,
                    renewalAmount: dataToSave.paymentAmount || 0,
                    debtAmount: 0,
                    dueDate: dataToSave.paymentDueDate,
                    status: 'pending',
                    contact: '',
                    message: reminderMessage,
                    timestamp: new Date().toISOString(),
                    resolvedAt: null,
                };
                batch.set(reminderRef, reminderData, { merge: true });
            } else {
                 // If due date was removed or is not present, delete the associated reminder
                const reminderSnap = await getDoc(reminderRef);
                if (reminderSnap.exists()) {
                    batch.delete(reminderRef);
                }
            }
            
            await batch.commit();
    
            toast({ title: "Éxito", description: "Registro guardado correctamente." });
            onSuccess();
        } catch (error) {
            console.error("Error saving admin payment:", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el registro." });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Accordion type="multiple" defaultValue={["general", "payment", "bank", "notes"]} className="w-full">
                    
                    {/* General Data */}
                    <AccordionItem value="general">
                        <AccordionTrigger>Datos Generales y Proveedor</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                            <FormField control={form.control} name="conceptName" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Concepto/Servicio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Categoría</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="providerName" render={({ field }) => (
                                <FormItem><FormLabel>Nombre del Proveedor</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="contractNumber" render={({ field }) => (
                                <FormItem><FormLabel>Nº Contrato/Cuenta/Póliza (Opcional)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="referenceNumber" render={({ field }) => (
                                <FormItem><FormLabel>Nº Referencia/NIC (Opcional)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="providerId" render={({ field }) => (
                                <FormItem><FormLabel>RIF/C.I. del Proveedor (Opcional)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Payment Data */}
                    <AccordionItem value="payment">
                        <AccordionTrigger>Datos de Pago (Opcional)</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="paymentAmount" render={({ field }) => (
                                    <FormItem><FormLabel>Monto de Pago</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || 0} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="paymentFrequency" render={({ field }) => (
                                    <FormItem><FormLabel>Frecuencia de Pago</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccione una frecuencia"/></SelectTrigger></FormControl>
                                        <SelectContent>{frequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField
                                control={form.control}
                                name="paymentDueDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha Límite de Pago (para recordatorios)</FormLabel>
                                        <FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="renewalDate" render={({ field }) => (
                                    <FormItem><FormLabel>Fecha de Renovación</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                    <FormItem><FormLabel>Método de Pago Preferido</FormLabel><FormControl><Input placeholder="Ej. Transferencia Banesco" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                    
                    {/* Bank Data */}
                    <AccordionItem value="bank">
                        <AccordionTrigger>Datos Bancarios del Beneficiario (Opcional)</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                            <FormField control={form.control} name="beneficiaryBank" render={({ field }) => (
                                <FormItem><FormLabel>Banco del Beneficiario</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="beneficiaryAccountNumber" render={({ field }) => (
                                <FormItem><FormLabel>Número de Cuenta</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="beneficiaryAccountType" render={({ field }) => (
                                <FormItem><FormLabel>Tipo de Cuenta</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccione un tipo"/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Ahorro">Ahorro</SelectItem>
                                        <SelectItem value="Corriente">Corriente</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Notes */}
                    <AccordionItem value="notes">
                        <AccordionTrigger>Notas Adicionales (Opcional)</AccordionTrigger>
                        <AccordionContent>
                             <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar Registro"}
                </Button>
            </form>
        </Form>
    );
}
