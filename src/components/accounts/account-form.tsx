
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Account } from "@/lib/types";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  balance: z.coerce.number().default(0),
  commission: z.coerce.number().min(0).max(100).default(0),
});

type AccountFormValues = z.infer<typeof formSchema>;

interface AccountFormProps {
  onSubmit: (values: AccountFormValues) => void;
  account?: Account | null;
}

export function AccountForm({ onSubmit, account }: AccountFormProps) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account?.name || "",
      balance: account?.balance || 0,
      commission: account ? account.commission * 100 : 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Cuenta</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Efectivo (Caja)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Saldo Inicial</FormLabel>
              <FormControl>
                <Input type="number" {...field} disabled={!!account} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="commission"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comisión (%)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Ej. 5 para 5%" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {account ? "Actualizar Cuenta" : "Crear Cuenta"}
        </Button>
      </form>
    </Form>
  );
}
