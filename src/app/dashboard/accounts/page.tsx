
"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, DollarSign, ArrowDown, Wallet, Landmark, Eye, Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Account, Transaction } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { AccountForm } from "@/components/accounts/account-form";
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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AccountsPage() {
  const { userId } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    if (!userId) return;

    const accountsUnsub = onSnapshot(collection(db, `users/${userId}/accounts`), (snapshot) => {
      const fetchedAccounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(fetchedAccounts);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching accounts:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las cuentas." });
      setLoading(false);
    });

    const transactionsUnsub = onSnapshot(collection(db, `users/${userId}/transactions`), (snapshot) => {
      const fetchedTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(fetchedTransactions);
    });

    return () => {
      accountsUnsub();
      transactionsUnsub();
    };
  }, [userId, toast]);
  
  const totalBalance = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);
  const totalWithdrawals = useMemo(() => transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0), [transactions]);

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
        await deleteDoc(doc(db, `users/${userId}/accounts`, accountToDelete.id));
        toast({ title: "Éxito", description: "Cuenta eliminada correctamente." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la cuenta." });
        console.error("Error deleting account:", error);
    }
    setIsAlertOpen(false);
    setAccountToDelete(null);
  };
  
  const handleFormSubmit = async (values: {
    name: string;
    balance: number;
    commission: number;
    type: "Efectivo" | "Digital" | "Bancario";
  }) => {
    if (!userId) return;

    try {
        if (editingAccount) {
            const accountDocRef = doc(db, `users/${userId}/accounts`, editingAccount.id);
            await updateDoc(accountDocRef, {
                name: values.name,
                commission: values.commission / 100,
                type: values.type,
            });
            toast({ title: "Éxito", description: "Cuenta actualizada correctamente." });
        } else {
            const newAccountRef = doc(collection(db, `users/${userId}/accounts`));
            await setDoc(newAccountRef, {
                id: newAccountRef.id,
                name: values.name,
                balance: values.balance,
                commission: values.commission / 100,
                type: values.type,
            });
            toast({ title: "Éxito", description: "Cuenta creada correctamente." });
        }
        setIsDialogOpen(false);
        setEditingAccount(null);
    } catch (error) {
        console.error("Error saving account:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la cuenta." });
    }
  };

  const openNewAccountDialog = () => {
    setEditingAccount(null);
    setIsDialogOpen(true);
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  
  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
        case 'Efectivo': return <Wallet className="h-6 w-6 text-green-400"/>;
        case 'Digital': return <Landmark className="h-6 w-6 text-cyan-400"/>;
        case 'Bancario': return <Landmark className="h-6 w-6 text-purple-400"/>;
        default: return <DollarSign className="h-6 w-6"/>;
    }
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-400";
    if (balance < 0) return "text-red-400";
    return "text-muted-foreground";
  };


  return (
    <>
      <PageHeader title="Cuentas">
        <Button onClick={openNewAccountDialog} size="icon" className="rounded-full h-10 w-10">
          <PlusCircle className="h-5 w-5" />
        </Button>
      </PageHeader>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card-foreground/5 rounded-xl flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-cyan-500/10 text-cyan-400">
                <DollarSign className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Balance Total</p>
                {loading ? <Skeleton className="h-6 w-24 mt-1" /> : <p className="text-xl font-bold">{formatCurrency(totalBalance)}</p>}
            </div>
        </Card>
         <Card className="p-4 bg-card-foreground/5 rounded-xl flex items-center gap-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-500/10 text-red-400">
                <ArrowDown className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground">Total Alivios</p>
                {loading ? <Skeleton className="h-6 w-24 mt-1" /> : <p className="text-xl font-bold">{formatCurrency(totalWithdrawals)}</p>}
            </div>
        </Card>
      </div>

      <div className="mt-8 space-y-4">
        {loading ? (
            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
        ) : accounts.length > 0 ? (
            accounts.map(account => (
                <Card key={account.id} className="bg-card-foreground/5 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            {getAccountIcon(account.type)}
                            <div>
                                <h3 className="font-bold text-lg">{account.name}</h3>
                                <p className="text-xs text-muted-foreground">Comisión: {(account.commission * 100).toFixed(0)}%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                                <Eye className="h-4 w-4"/>
                           </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(account)}>
                                <Trash2 className="h-4 w-4"/>
                           </Button>
                        </div>
                    </div>
                    <Card className="bg-background/80 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Saldo Disponible</p>
                                <p className={`text-2xl font-bold ${getBalanceColor(account.balance)}`}>
                                    {formatCurrency(account.balance)}
                                </p>
                            </div>
                            <Badge variant="secondary">{account.type}</Badge>
                        </div>
                    </Card>
                </Card>
            ))
        ) : (
            <Card className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">No tienes cuentas. ¡Agrega una para empezar!</p>
            </Card>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingAccount(null);
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
