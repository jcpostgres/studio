
"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Transaction, Account } from "@/lib/types";
import { getTransactions, deleteTransaction, getAccounts } from "@/lib/actions/db.actions";
import { useToast } from "@/hooks/use-toast";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";


export default function TransactionsPage() {
  const { userId } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchTransactions() {
      setLoading(true);
      try {
        const [fetchedTransactions, fetchedAccounts] = await Promise.all([getTransactions(userId), getAccounts(userId)]);
        setTransactions(fetchedTransactions);
        setAccounts(fetchedAccounts);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las transacciones.",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [userId, toast]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach(account => map.set(account.id, account.name));
    return map;
  }, [accounts]);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!userId || !transactionToDelete) return;
    try {
        const result = await deleteTransaction(userId, transactionToDelete);
        if (result.success) {
            // Actualizar el estado local
            setTransactions(transactions.filter(t => t.id !== transactionToDelete.id));
            toast({ title: "Éxito", description: "Transacción eliminada y saldos revertidos." });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        console.error("Error deleting transaction: ", error.message);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo eliminar la transacción." });
    }
    
    setIsAlertOpen(false);
    setTransactionToDelete(null);
  };
  
  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
  };


  const openNewTransactionDialog = () => {
    setEditingTransaction(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Alivios y Transacciones"
        description="Registra retiros de dinero y transferencias entre tus cuentas."
      >
        <Button onClick={openNewTransactionDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Transacción
        </Button>
      </PageHeader>
      <div className="mt-8">
        <Card>
            <CardContent className="p-6">
                 <TransactionsTable
                    transactions={transactions}
                    accountsMap={accountsMap}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    loading={loading}
                />
            </CardContent>
        </Card>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTransaction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Editar Transacción" : "Registrar Nueva Transacción"}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            transactionToEdit={editingTransaction}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la transacción y revertirá los cambios en los saldos de las cuentas involucradas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

    