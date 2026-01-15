
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Account, Expense } from "@/lib/types";
import { suggestCategories } from "@/lib/actions/expenses.actions";
import { cn } from "@/lib/utils";
import {
  getAccounts,
  getExistingExpenseCategories,
  saveExpense,
} from "@/lib/actions/db.actions";

const formSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  type: z.enum(["fijo", "variable"], { required_error: "El tipo de gasto es requerido." }),
  category: z.string().min(2, "La categoría es requerida."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  paymentAccount: z.string().min(1, "La cuenta de pago es requerida."),
  responsible: z.string().optional(),
  observations: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expenseToEdit?: Partial<Expense> | null;
  onSuccess?: () => void;
}

export function ExpenseForm({ expenseToEdit, onSuccess }: ExpenseFormProps) {
  const router = useRouter();
  const { userId } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: expenseToEdit?.date || new Date().toISOString().split('T')[0],
      type: (expenseToEdit?.type as any) || "variable",
      category: expenseToEdit?.category || "",
      amount: expenseToEdit?.amount || 0,
      paymentAccount: expenseToEdit?.paymentAccount || "",
      responsible: expenseToEdit?.responsible || "",
      observations: expenseToEdit?.observations || "",
    },
  });

  useEffect(() => {
    if (!userId) return;

    async function fetchData() {
      const [accountsData, categoriesData] = await Promise.all([
        getAccounts(userId),
        getExistingExpenseCategories(userId),
      ]);
      setAccounts(accountsData);
      setExistingCategories(categoriesData);
    }

    fetchData();
  }, [userId]);

  const handleSuggestCategories = async () => {
    const description = form.getValues("observations") || form.getValues("category");
    if (!description || description.length < 3) {
      toast({
        variant: "destructive",
        title: "Descripción muy corta",
        description: "Ingresa una descripción más larga en 'Observaciones' o 'Categoría' para obtener sugerencias.",
      });
      return;
    }

    setIsSuggesting(true);
    setAiSuggestions([]);
    try {
      const result = await suggestCategories(description);
      if (result.success && result.categories) {
        setAiSuggestions(result.categories);
      } else {
        toast({ variant: "destructive", title: "Sugerencia fallida", description: result.message });
      }
    } catch (error) {
       toast({ variant: "destructive", title: "Error", description: "Ocurrió un error inesperado." });
    } finally {
        setIsSuggesting(false);
    }
  };

  async function onSubmit(values: ExpenseFormValues) {
    if (!userId) {
        toast({ variant: "destructive", title: "Error", description: "Usuario no autenticado." });
        return;
    }
    setIsSubmitting(true);
    
    try {
      const payload: any = { ...values };
      if (expenseToEdit?.id) payload.id = expenseToEdit.id;
      const result = await saveExpense(userId, payload);
      if (result.success) {
        toast({ title: "Éxito", description: "Gasto registrado correctamente." });
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard/expenses");
        }
      } else {
        throw new Error(result.message || "No se pudo guardar el gasto.");
      }
    } catch (error: any) {
      console.error("Error al guardar el gasto:", error);
      toast({ variant: "destructive", title: "Error al guardar", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                    <FormLabel>Fecha del Gasto</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
             <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Tipo de Gasto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="variable">Variable</SelectItem>
                            <SelectItem value="fijo">Fijo</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}/>
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between">
                <FormLabel>Categoría</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestCategories} disabled={isSuggesting}>
                   {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Sugerir con IA
                </Button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? existingCategories.find(c => c === field.value) || field.value : "Selecciona o escribe una categoría"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" style={{ zIndex: 100 }}>
                  <Command>
                    <CommandInput placeholder="Buscar categoría..." onValueChange={(currentValue) => form.setValue("category", currentValue, { shouldValidate: true })} value={field.value}/>
                    <CommandList>
                      <CommandEmpty>No se encontró la categoría. Puedes crear una nueva.</CommandEmpty>
                      <CommandGroup>
                          {existingCategories.map((category) => (
                              <CommandItem
                              value={category}
                              key={category}
                              onSelect={() => {
                                  form.setValue("category", category, { shouldValidate: true })
                              }}
                              >
                              <Check className={cn("mr-2 h-4 w-4", category === field.value ? "opacity-100" : "opacity-0")}/>
                              {category}
                              </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
              {aiSuggestions.length > 0 && (
                <FormDescription>
                  Sugerencias de IA:
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aiSuggestions.map((s, i) => (
                        <Button type="button" key={i} variant="secondary" size="sm" onClick={() => form.setValue('category', s, { shouldValidate: true })}>
                            {s}
                        </Button>
                    ))}
                  </div>
                </FormDescription>
              )}
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Monto</FormLabel>
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

        <FormField control={form.control} name="responsible" render={({ field }) => (
            <FormItem>
                <FormLabel>Responsable (Opcional)</FormLabel>
                <FormControl><Input placeholder="Ej. Juan Pérez" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <FormField control={form.control} name="observations" render={({ field }) => (
            <FormItem>
                <FormLabel>Observaciones (Opcional)</FormLabel>
                <FormControl><Textarea placeholder="Añade detalles o una descripción para obtener mejores sugerencias de la IA" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : "Guardar Gasto"}
        </Button>
      </form>
    </Form>
  );
}
