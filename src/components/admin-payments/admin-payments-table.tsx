
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { AdminPayment } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

interface AdminPaymentsTableProps {
  payments: AdminPayment[];
  onEdit: (payment: AdminPayment) => void;
  onDelete: (payment: AdminPayment) => void;
  loading: boolean;
}

const DetailItem = ({ label, value }: { label: string; value?: string | number | null }) => (
  value ? <p><strong className="font-medium text-muted-foreground">{label}:</strong> {value}</p> : null
);

export function AdminPaymentsTable({ payments, onEdit, onDelete, loading }: AdminPaymentsTableProps) {

  const formatCurrency = (amount?: number, currency?: string) => {
    if (amount === undefined || amount === null) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(amount);
  };
  
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Concepto</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Monto</TableHead>
          <TableHead>Frecuencia</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.length > 0 ? (
          payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.conceptName}</TableCell>
              <TableCell>{payment.providerName}</TableCell>
              <TableCell><Badge variant="secondary">{payment.category}</Badge></TableCell>
              <TableCell>{formatCurrency(payment.paymentAmount, payment.paymentCurrency)}</TableCell>
              <TableCell>{payment.paymentFrequency || "-"}</TableCell>
              <TableCell className="text-right">
                <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Abrir menú</span><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DialogTrigger asChild>
                             <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Eye className="mr-2 h-4 w-4" />Ver Detalles</DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem onClick={() => onEdit(payment)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(payment)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Detalles de: {payment.conceptName}</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4 text-sm">
                            <DetailItem label="Categoría" value={payment.category} />
                            <DetailItem label="Proveedor" value={payment.providerName} />
                            <DetailItem label="Nº Contrato/Póliza" value={payment.contractNumber} />
                            <DetailItem label="Nº Referencia/NIC" value={payment.referenceNumber} />
                            <DetailItem label="RIF/C.I. Proveedor" value={payment.providerId} />
                            <hr/>
                            <DetailItem label="Monto" value={formatCurrency(payment.paymentAmount, payment.paymentCurrency)} />
                            <DetailItem label="Frecuencia" value={payment.paymentFrequency} />
                            <DetailItem label="Fecha Límite de Pago" value={payment.paymentDueDate} />
                            <DetailItem label="Fecha de Renovación" value={payment.renewalDate} />
                            <DetailItem label="Método de Pago" value={payment.paymentMethod} />
                             <hr/>
                            <DetailItem label="Banco Beneficiario" value={payment.beneficiaryBank} />
                            <DetailItem label="Nº Cuenta Beneficiario" value={payment.beneficiaryAccountNumber} />
                            <DetailItem label="Tipo Cuenta" value={payment.beneficiaryAccountType} />
                             <hr/>
                             {payment.notes && <p className="text-sm text-foreground whitespace-pre-wrap"><strong className="font-medium text-muted-foreground">Notas:</strong> {payment.notes}</p>}
                        </div>
                    </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No hay registros. ¡Agrega uno para empezar!
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
