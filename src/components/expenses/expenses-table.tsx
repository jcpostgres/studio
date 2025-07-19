
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Expense, Account } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

interface ExpensesTableProps {
  expenses: Expense[];
  onEdit: (expenseId: string) => void;
  onDelete: (expense: Expense) => void;
  loading: boolean;
}

export function ExpensesTable({ expenses, onEdit, onDelete, loading }: ExpensesTableProps) {
  const { userId } = useAuth();
  const [accountsMap, setAccountsMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!userId) return;
    const accountsRef = collection(db, `users/${userId}/accounts`);
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      const newAccountsMap = new Map<string, string>();
      snapshot.forEach(doc => {
        const account = doc.data() as Account;
        newAccountsMap.set(doc.id, account.name);
      });
      setAccountsMap(newAccountsMap);
    });

    return () => unsubscribe();
  }, [userId]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Cuenta de Pago</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.length > 0 ? (
          expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
              <TableCell className="font-medium">{expense.category}</TableCell>
              <TableCell className="text-red-400">{formatCurrency(expense.amount)}</TableCell>
              <TableCell>
                 <Badge variant={expense.type === 'fijo' ? "secondary" : "outline"}>
                    {expense.type.charAt(0).toUpperCase() + expense.type.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{accountsMap.get(expense.paymentAccount) || expense.paymentAccount}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(expense.id)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(expense)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No se encontraron gastos para los filtros seleccionados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
