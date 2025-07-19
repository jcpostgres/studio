
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Account } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { AccountForm } from "@/components/accounts/account-form";
import { AccountsTable } from "@/components/accounts/accounts-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export default function AccountsPage() {
  const { userId } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    if (!userId || !db) return;

    const accountsColRef = collection(db, `users/${userId}/accounts`);
    const unsubscribe = onSnapshot(
      accountsColRef,
      (snapshot) => {
        const fetchedAccounts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Account[];
        setAccounts(fetchedAccounts);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching accounts:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las cuentas.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, toast]);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsDialogOpen(true);
  };

  const handleDelete = (account: Account) => {
    setAccountToDelete(account);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!userId || !accountToDelete) return;

    try {
      const accountDocRef = doc(db, `users/${userId}/accounts`, accountToDelete.id);
      await deleteDoc(accountDocRef);
      toast({
        title: "Éxito",
        description: "Cuenta eliminada correctamente.",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la cuenta.",
      });
    } finally {
      setIsAlertOpen(false);
      setAccountToDelete(null);
    }
  };

  const handleFormSubmit = async (values: {
    name: string;
    balance: number;
    commission: number;
  }) => {
    if (!userId) return;

    const accountData = {
      name: values.name,
      balance: values.balance,
      commission: values.commission / 100, // Convert percentage to decimal
    };

    try {
      if (editingAccount) {
        // Update existing account
        const accountDocRef = doc(db, `users/${userId}/accounts`, editingAccount.id);
        await updateDoc(accountDocRef, {
            name: accountData.name,
            commission: accountData.commission,
            // Balance is not updated on edit
        });
        toast({
          title: "Éxito",
          description: "Cuenta actualizada correctamente.",
        });
      } else {
        // Create new account
        const newAccountRef = doc(collection(db, `users/${userId}/accounts`));
        await setDoc(newAccountRef, { ...accountData, id: newAccountRef.id });
        toast({
          title: "Éxito",
          description: "Cuenta creada correctamente.",
        });
      }
      setIsDialogOpen(false);
      setEditingAccount(null);
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la cuenta.",
      });
    }
  };

  const openNewAccountDialog = () => {
    setEditingAccount(null);
    setIsDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Consulta y administra los saldos de tus cuentas."
      >
        <Button onClick={openNewAccountDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Cuenta
        </Button>
      </PageHeader>
      <div className="mt-8">
        <Card>
            <CardContent className="p-6">
                 <AccountsTable
                    accounts={accounts}
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
            setEditingAccount(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Editar Cuenta" : "Agregar Nueva Cuenta"}
            </DialogTitle>
          </DialogHeader>
          <AccountForm
            onSubmit={handleFormSubmit}
            account={editingAccount}
          />
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la
              cuenta <span className="font-bold">{accountToDelete?.name}</span>.
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
