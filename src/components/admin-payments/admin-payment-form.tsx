
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { AdminPayment } from "@/lib/types";
import { adminPaymentSchema, saveAdminPayment } from "@/lib/actions/admin-payments.actions";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2 } from "lucide-react";

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
            paymentAmount: 0,
            paymentCurrency: "USD",
            paymentFrequency: "Mensual",
            category: "Otros",
        },
    });

    async function onSubmit(values: AdminPaymentFormValues) {
        if (!userId) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
            return;
        }
        setIsSubmitting(true);
        
        const result = await saveAdminPayment({
            userId,
            paymentData: values,
            paymentId: paymentToEdit?.id,
        });

        if (result.success) {
            toast({ title: "Éxito", description: result.message });
            onSuccess();
        } else {
            toast({ variant: "destructive", title: "Error al guardar", description: result.message });
        }
        
        setIsSubmitting(false);
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
                                <FormItem><FormLabel>Nº Contrato/Cuenta/Póliza (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="referenceNumber" render={({ field }) => (
                                <FormItem><FormLabel>Nº Referencia/NIC (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="providerId" render={({ field }) => (
                                <FormItem><FormLabel>RIF/C.I. del Proveedor (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Payment Data */}
                    <AccordionItem value="payment">
                        <AccordionTrigger>Datos de Pago</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="paymentAmount" render={({ field }) => (
                                    <FormItem><FormLabel>Monto de Pago</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="paymentCurrency" render={({ field }) => (
                                    <FormItem><FormLabel>Moneda</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="paymentFrequency" render={({ field }) => (
                                <FormItem><FormLabel>Frecuencia de Pago</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>{frequencies.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                                </Select><FormMessage /></FormItem>
                            )}/>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="paymentDueDate" render={({ field }) => (
                                    <FormItem><FormLabel>Fecha Límite de Pago</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="renewalDate" render={({ field }) => (
                                    <FormItem><FormLabel>Fecha de Renovación</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                <FormItem><FormLabel>Método de Pago Preferido (Opcional)</FormLabel><FormControl><Input placeholder="Ej. Transferencia Banesco" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </AccordionContent>
                    </AccordionItem>
                    
                    {/* Bank Data */}
                    <AccordionItem value="bank">
                        <AccordionTrigger>Datos Bancarios del Beneficiario (Opcional)</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                            <FormField control={form.control} name="beneficiaryBank" render={({ field }) => (
                                <FormItem><FormLabel>Banco del Beneficiario</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="beneficiaryAccountNumber" render={({ field }) => (
                                <FormItem><FormLabel>Número de Cuenta</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="beneficiaryAccountType" render={({ field }) => (
                                <FormItem><FormLabel>Tipo de Cuenta</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
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
                                <FormItem><FormLabel>Observaciones</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
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
