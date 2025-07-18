
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
import { Income } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface IncomesTableProps {
  incomes: Income[];
  onEdit: (incomeId: string) => void;
  onDelete: (income: Income) => void;
  loading: boolean;
}

export function IncomesTable({ incomes, onEdit, onDelete, loading }: IncomesTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  };
  
  const getIncomeDisplayStatus = (income: Income) => {
    if (income.status === 'cancelled') {
        return <Badge variant="destructive">Cancelado</Badge>;
    }
    if (income.remainingBalance <= 0) {
        return <Badge className="bg-green-600">Pagado</Badge>;
    }
    return <Badge className="bg-yellow-600">Debe</Badge>;
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
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Monto Neto</TableHead>
          <TableHead>Saldo Pendiente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomes.length > 0 ? (
          incomes.map((income) => (
            <TableRow key={income.id}>
              <TableCell className="font-medium">{income.client}{income.brandName && ` (${income.brandName})`}</TableCell>
              <TableCell>{income.date}</TableCell>
              <TableCell className="text-green-400">{formatCurrency(income.amountWithCommission)}</TableCell>
              <TableCell className="text-red-400">{formatCurrency(income.remainingBalance)}</TableCell>
              <TableCell>{getIncomeDisplayStatus(income)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(income.id)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(income)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No se encontraron ingresos para los filtros seleccionados.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
