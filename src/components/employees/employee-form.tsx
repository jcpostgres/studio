"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Employee, Account } from "@/lib/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"
import { getAccounts, saveEmployee } from "@/lib/actions/db.actions";

const formSchema = z.object({
    name: z.string().min(2, "El nombre es requerido."),
    cedula: z.string().min(6, "La cédula es requerida."),
    phone: z.string().min(7, "El teléfono es requerido."),
    bank: z.string().min(2, "El banco es requerido."),
    biWeeklySalary: z.coerce.number().positive("El salario quincenal debe ser positivo."),
  });

type EmployeeFormValues = z.infer<typeof formSchema>;

interface EmployeeFormProps {
    employeeToEdit?: Employee | null;
    onSuccess: () => void;
}

export function EmployeeForm({ employeeToEdit, onSuccess }: EmployeeFormProps) {
    const { userId } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const form = useForm<EmployeeFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: employeeToEdit ? {
            ...employeeToEdit
        } : {
            name: "",
            cedula: "",
            phone: "",
            bank: "",
            biWeeklySalary: 0,
        },
    });

    useEffect(() => {
        if (!userId) return;
        async function fetchAccounts() {
            const accountsData = await getAccounts(userId);
            setAccounts(accountsData);
        }
        fetchAccounts();
    }, [userId]);
    async function onSubmit(values: EmployeeFormValues) {
        if (!userId) {
            toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
            return;
        }
        setIsSubmitting(true);
        
        try {
            const result = await saveEmployee(userId, values, employeeToEdit?.id);

            if (result.success) {
                toast({ title: "Éxito", description: employeeToEdit ? "Empleado actualizado." : "Empleado creado." });
                onSuccess();
            } else {
                throw new Error(result.message || "No se pudo guardar el empleado.");
            }
        } catch (error: any) {
            console.error("Error saving employee:", error);
            toast({ variant: "destructive", title: "Error al guardar", description: (error as Error).message || "No se pudo guardar el empleado." });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="cedula" render={({ field }) => (
                        <FormItem><FormLabel>Cédula</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="bank" render={({ field }) => (
                        <FormItem><FormLabel>Banco</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="biWeeklySalary" render={({ field }) => (
                    <FormItem><FormLabel>Salario Quincenal</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Guardar Empleado"}
                </Button>
            </form>
        </Form>
    );
}