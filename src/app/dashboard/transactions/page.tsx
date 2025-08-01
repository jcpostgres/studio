
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Transaction } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, writeBatch } from "firebase/firestore";
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
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!userId) return;

    const transactionsColRef = collection(db, `users/${userId}/transactions`);
    const unsubscribe = onSnapshot(
      transactionsColRef,
      (snapshot) => {
        const fetchedTransactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[];
        setTransactions(fetchedTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las transacciones.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, toast]);

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
        const batch = writeBatch(db);
        
        if (transactionToDelete.type === 'withdrawal' && transactionToDelete.account) {
            const accountRef = doc(db, `users/${userId}/accounts`, transactionToDelete.account);
            const accountSnap = await getDoc(accountRef);
            if (accountSnap.exists()) batch.update(accountRef, { balance: accountSnap.data().balance + transactionToDelete.amount });
        } else if (transactionToDelete.type === 'accountTransfer' && transactionToDelete.sourceAccount && transactionToDelete.destinationAccount) {
            const sourceAccRef = doc(db, `users/${userId}/accounts`, transactionToDelete.sourceAccount);
            const destAccRef = doc(db, `users/${userId}/accounts`, transactionToDelete.destinationAccount);
            const [sourceSnap, destSnap] = await Promise.all([getDoc(sourceAccRef), getDoc(destAccRef)]);
            if(sourceSnap.exists()) batch.update(sourceAccRef, { balance: sourceSnap.data().balance + transactionToDelete.amount });
            if(destSnap.exists()) batch.update(destAccRef, { balance: destSnap.data().balance - transactionToDelete.amount });
        }
        
        const transactionRef = doc(db, `users/${userId}/transactions`, transactionToDelete.id);
        batch.delete(transactionRef);

        await batch.commit();

        toast({ title: "Éxito", description: "Transacción eliminada y saldos revertidos." });
    } catch (error) {
        console.error("Error deleting transaction: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la transacción." });
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

    