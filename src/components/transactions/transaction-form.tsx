
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Account, Transaction } from "@/lib/types";
import { saveTransaction } from "@/lib/actions/transactions.actions";

const formSchema = z.object({
  type: z.enum(["withdrawal", "accountTransfer"], { required_error: "Debes seleccionar un tipo de transacción."}),
  date: z.string().min(1, "La fecha es requerida."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  account: z.string().optional(),
  sourceAccount: z.string().optional(),
  destinationAccount: z.string().optional(),
  observations: z.string().optional(),
}).refine(data => {
    if (data.type === 'withdrawal') return !!data.account;
    return true;
}, {
    message: "La cuenta es requerida para retiros.",
    path: ["account"],
}).refine(data => {
    if (data.type === 'accountTransfer') return !!data.sourceAccount && !!data.destinationAccount;
    return true;
}, {
    message: "Las cuentas de origen y destino son requeridas para transferencias.",
    path: ["sourceAccount"], // Can also point to destinationAccount
}).refine(data => {
    if (data.type === 'accountTransfer') return data.sourceAccount !== data.destinationAccount;
    return true;
}, {
    message: "La cuenta de origen y destino no pueden ser la misma.",
    path: ["destinationAccount"],
});


type TransactionFormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  transactionToEdit?: Transaction | null;
  onSuccess: () => void;
}

export function TransactionForm({ transactionToEdit, onSuccess }: TransactionFormProps) {
  const { userId } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: transactionToEdit ? {
        ...transactionToEdit,
        date: transactionToEdit.date.split('T')[0],
    } : {
      type: "withdrawal",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      observations: "",
    },
  });

  const transactionType = form.watch("type");

  useEffect(() => {
    if (!userId) return;
    const accountsUnsub = onSnapshot(collection(db, `users/${userId}/accounts`), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Account)));
    });
    return () => accountsUnsub();
  }, [userId]);
  
  useEffect(() => {
    // Reset fields when type changes
    form.reset({
        ...form.getValues(),
        account: undefined,
        sourceAccount: undefined,
        destinationAccount: undefined,
    });
  }, [transactionType, form]);

  async function onSubmit(values: TransactionFormValues) {
    if (!userId) {
        toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
        return;
    }
    setIsSubmitting(true);
    
    const result = await saveTransaction({ 
        userId, 
        transactionData: values,
        transactionId: transactionToEdit?.id,
        previousTransaction: transactionToEdit,
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
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Transacción</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl><RadioGroupItem value="withdrawal" /></FormControl>
                    <FormLabel className="font-normal">Alivio / Retiro</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl><RadioGroupItem value="accountTransfer" /></FormControl>
                    <FormLabel className="font-normal">Transacción entre Cuentas</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>

        {transactionType === 'withdrawal' && (
             <FormField control={form.control} name="account" render={({ field }) => (
                <FormItem>
                    <FormLabel>Cuenta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona la cuenta de retiro" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {accounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
        )}

        {transactionType === 'accountTransfer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="sourceAccount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuenta Origen</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="De dónde sale el dinero" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {accounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="destinationAccount" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cuenta Destino</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="A dónde llega el dinero" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {accounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
            </div>
        )}

        <FormField control={form.control} name="observations" render={({ field }) => (
            <FormItem>
                <FormLabel>Observaciones (Opcional)</FormLabel>
                <FormControl><Textarea placeholder="Notas adicionales..." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : (transactionToEdit ? "Actualizar Transacción" : "Guardar Transacción")}
        </Button>
      </form>
    </Form>
  );
}
