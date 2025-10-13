
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2, ArrowRight } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface TransactionsTableProps {
  transactions: Transaction[];
  accountsMap: Map<string, string>;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  loading: boolean;
}

export function TransactionsTable({
  transactions,
  accountsMap,
  onEdit,
  onDelete,
  loading,
}: TransactionsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const renderDescription = (transaction: Transaction) => {
    if (transaction.type === 'withdrawal') {
        return `Retiro de ${accountsMap.get(transaction.account!) || 'cuenta desconocida'}`;
    }
    if (transaction.type === 'accountTransfer') {
        return (
            <div className="flex items-center gap-2">
                <span>{accountsMap.get(transaction.sourceAccount!) || 'Origen desc.'}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>{accountsMap.get(transaction.destinationAccount!) || 'Destino desc.'}</span>
            </div>
        );
    }
    return "N/A";
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
              <TableCell>
                 <Badge variant={transaction.type === 'withdrawal' ? "secondary" : "outline"}>
                    {transaction.type === 'withdrawal' ? 'Retiro' : 'Transferencia'}
                 </Badge>
              </TableCell>
              <TableCell className="font-medium">{renderDescription(transaction)}</TableCell>
              <TableCell>{formatCurrency(transaction.amount)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(transaction)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(transaction)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              No hay transacciones. ¡Agrega una para empezar!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
