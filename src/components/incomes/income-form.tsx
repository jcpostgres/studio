
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Income, Account } from "@/lib/types";
import { saveIncome } from "@/lib/actions/incomes.actions";
import { Loader2 } from "lucide-react";

const serviceDetailSchema = z.object({
  name: z.string(),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
});

const formSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  client: z.string().min(2, "El nombre del cliente es requerido."),
  brandName: z.string().optional(),
  country: z.string().min(1, "El país es requerido."),
  services: z.array(z.string()).min(1, "Debes seleccionar al menos un servicio."),
  servicesDetails: z.array(serviceDetailSchema),
  amountPaid: z.coerce.number().min(0, "El monto pagado no puede ser negativo."),
  paymentAccount: z.string().min(1, "La cuenta de pago es requerida."),
  responsible: z.string().min(1, "El responsable es requerido."),
  observations: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["active", "cancelled"]).default("active"),
});

type IncomeFormValues = z.infer<typeof formSchema>;

const availableServices = [
  'LOGO', 'MASCOTA', 'WEB', 'REDES', 'MONSTER HIVE', 'HD', 'MEDIOS GRÁFICOS', 'OTROS'
];
const servicesRequiringDueDate = ['REDES', 'MONSTER HIVE'];

interface IncomeFormProps {
  incomeToEdit?: Income | null;
}

export function IncomeForm({ incomeToEdit }: IncomeFormProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: incomeToEdit ? {
      ...incomeToEdit,
      services: incomeToEdit.servicesDetails.map(s => s.name),
      dueDate: incomeToEdit.dueDate || "",
    } : {
      date: new Date().toISOString().split('T')[0],
      client: "",
      brandName: "",
      country: "",
      services: [],
      servicesDetails: [],
      amountPaid: 0,
      paymentAccount: "",
      responsible: "",
      observations: "",
      dueDate: "",
      status: "active",
    },
  });
  
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "servicesDetails",
  });

  const selectedServices = form.watch("services");
  const watchedServicesDetails = form.watch("servicesDetails");
  const watchedAmountPaid = form.watch("amountPaid");
  const watchedPaymentAccount = form.watch("paymentAccount");

  const totalContractedAmount = useMemo(() => {
    return watchedServicesDetails.reduce((sum, service) => {
      const amount = parseFloat(String(service.amount));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [watchedServicesDetails]);
  
  const commissionRate = useMemo(() => {
    const account = accounts.find(acc => acc.id === watchedPaymentAccount);
    return account?.commission || 0;
  }, [watchedPaymentAccount, accounts]);

  const commissionAmount = useMemo(() => watchedAmountPaid * commissionRate, [watchedAmountPaid, commissionRate]);
  const amountWithCommission = useMemo(() => watchedAmountPaid - commissionAmount, [watchedAmountPaid, commissionAmount]);
  const remainingBalance = useMemo(() => totalContractedAmount - watchedAmountPaid, [totalContractedAmount, watchedAmountPaid]);


  useEffect(() => {
    if (!userId) return;
    const accountsUnsub = onSnapshot(collection(db, `users/${userId}/accounts`), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Account)));
    });
    return () => accountsUnsub();
  }, [userId]);

  useEffect(() => {
    const currentServiceDetails = form.getValues('servicesDetails');
    const newServiceDetails = selectedServices.map(serviceName => {
        const existingDetail = currentServiceDetails.find(d => d.name === serviceName);
        const originalDetail = incomeToEdit?.servicesDetails.find(d => d.name === serviceName);
        return existingDetail || originalDetail || { name: serviceName, amount: 0 };
    });
    replace(newServiceDetails);
  }, [selectedServices, incomeToEdit, form, replace]);


  const showDueDateField = useMemo(() => {
    return selectedServices.some(service => servicesRequiringDueDate.includes(service));
  }, [selectedServices]);

  async function onSubmit(values: IncomeFormValues) {
    if (!userId) {
        toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
        return;
    }
    
    if (showDueDateField && !values.dueDate) {
        form.setError("dueDate", { type: "manual", message: "La fecha de vencimiento es requerida para este servicio." });
        return;
    }
    
    setIsSubmitting(true);
    
    const result = await saveIncome({
        userId,
        incomeData: values,
        incomeId: incomeToEdit?.id,
        previousIncomeData: incomeToEdit
    });

    if (result.success) {
        toast({ title: "Éxito", description: result.message });
        router.push("/dashboard/incomes");
    } else {
        toast({ variant: "destructive", title: "Error", description: result.message });
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="client" render={({ field }) => (
                <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl><Input placeholder="Nombre del Cliente" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="brandName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Nombre de Marca (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Nombre de la Marca" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                    <FormLabel>País</FormLabel>
                    <FormControl><Input placeholder="País" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>

        <FormField control={form.control} name="services" render={() => (
            <FormItem>
                <FormLabel>Servicios Contratados</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {availableServices.map((service) => (
                        <FormField key={service} control={form.control} name="services" render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(service)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), service])
                                                : field.onChange(field.value?.filter((value) => value !== service));
                                        }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">{service}</FormLabel>
                            </FormItem>
                        )}/>
                    ))}
                </div>
                <FormMessage />
            </FormItem>
        )}/>

        {fields.map((field, index) => (
            <FormField
                key={field.id}
                control={form.control}
                name={`servicesDetails.${index}.amount`}
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Costo {watchedServicesDetails[index]?.name}</FormLabel>
                    <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        ))}

        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
                <span className="font-medium">Monto Total Contratado:</span>
                <span className="font-bold text-teal-400">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalContractedAmount)}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="font-medium">Saldo Pendiente:</span>
                <span className="font-bold text-red-400">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(remainingBalance)}</span>
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField control={form.control} name="amountPaid" render={({ field }) => (
                <FormItem>
                    <FormLabel>Monto Pagado</FormLabel>
                    <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="paymentAccount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Cuenta de Pago</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {accounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
                <span className="font-medium">Comisión ({(commissionRate * 100).toFixed(0)}%):</span>
                <span className="font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(commissionAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="font-medium">Monto Neto Recibido:</span>
                <span className="font-bold text-green-400">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountWithCommission)}</span>
            </div>
        </div>

        {showDueDateField && (
            <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha de Vencimiento del Plan</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        )}

        <FormField control={form.control} name="responsible" render={({ field }) => (
            <FormItem>
                <FormLabel>Responsable</FormLabel>
                <FormControl><Input placeholder="Responsable" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <FormField control={form.control} name="observations" render={({ field }) => (
            <FormItem>
                <FormLabel>Observaciones (Opcional)</FormLabel>
                <FormControl><Textarea placeholder="Notas adicionales..." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (incomeToEdit ? 'Actualizar Ingreso' : 'Registrar Ingreso')}
        </Button>
      </form>
    </Form>
  );
}
