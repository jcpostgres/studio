
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { Expense } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, getDoc, writeBatch } from "firebase/firestore";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle } from "lucide-react";

export default function ExpensesPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    if (!userId) return;
    const expensesRef = collection(db, `users/${userId}/expenses`);
    const unsubscribe = onSnapshot(expensesRef, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense));
      setExpenses(fetchedExpenses);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching expenses:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los gastos." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, toast]);
  
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        expense.category.toLowerCase().includes(searchStr) ||
        (expense.observations && expense.observations.toLowerCase().includes(searchStr));
      return matchesSearch;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [expenses, searchTerm]);
  
  const totalFilteredExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const handleEdit = (expenseId: string) => {
    // Implement edit navigation if an edit page is created
    // router.push(`/dashboard/expenses/${expenseId}/edit`);
    toast({ title: "Próximamente", description: "La edición de gastos estará disponible pronto." });
  };

  const handleDelete = (expense: Expense) => {
    setExpenseToDelete(expense);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!userId || !expenseToDelete) return;

    try {
        const batch = writeBatch(db);

        // Revert account balance
        const accountRef = doc(db, `users/${userId}/accounts`, expenseToDelete.paymentAccount);
        const accountSnap = await getDoc(accountRef);
        if (accountSnap.exists()){
             const currentBalance = accountSnap.data()?.balance || 0;
             batch.update(accountRef, {
                balance: currentBalance + expenseToDelete.amount
            });
        }
        
        // Delete expense
        const expenseDocRef = doc(db, `users/${userId}/expenses`, expenseToDelete.id);
        batch.delete(expenseDocRef);

        await batch.commit();

        toast({ title: "Éxito", description: "Gasto eliminado correctamente." });

    } catch (error) {
        console.error("Error deleting expense:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el gasto." });
    } finally {
        setIsAlertOpen(false);
        setExpenseToDelete(null);
    }
  };

  return (
    <>
      <PageHeader title="Gastos" description="Consulta y administra tus gastos.">
        <Button onClick={() => router.push('/dashboard/expenses/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Gasto
        </Button>
      </PageHeader>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>
                Total de Gastos Filtrados: 
                <span className="font-bold text-red-400">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalFilteredExpense)}
                </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por categoría u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="mt-8">
            <Card>
                <CardContent className="p-6">
                    <ExpensesTable
                        expenses={filteredExpenses}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        loading={loading}
                    />
                </CardContent>
            </Card>
        </div>
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto en 
              <span className="font-bold"> {expenseToDelete?.category}</span> y revertirá el monto del balance de la cuenta asociada.
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
