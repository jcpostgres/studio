
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import type { Expense, Account } from "@/lib/types";
import { getExpenses, deleteExpense, getAccounts } from "@/lib/actions/db.actions";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle } from "lucide-react";

export default function ExpensesPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth()).toString());

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchExpenses() {
      setLoading(true);
      try {
        const [fetchedExpenses, fetchedAccounts] = await Promise.all([getExpenses(userId), getAccounts(userId)]);
        setExpenses(fetchedExpenses);
        setAccounts(fetchedAccounts);
      } catch (error) {
        console.error("Error fetching expenses:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los gastos." });
      } finally {
        setLoading(false);
      }
    }
    fetchExpenses();
  }, [userId, toast]);

  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach(account => map.set(account.id, account.name));
    return map;
  }, [accounts]);
  
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const expenseDate = new Date(`${expense.date}T00:00:00`);
      const searchStr = searchTerm.toLowerCase();

      const matchesSearch = searchTerm === '' ||
        expense.category.toLowerCase().includes(searchStr) ||
        (expense.observations && expense.observations.toLowerCase().includes(searchStr));
      const matchesYear = !filterYear || expenseDate.getFullYear().toString() === filterYear;
      const matchesMonth = !filterMonth || expenseDate.getMonth().toString() === filterMonth;
      
      return matchesSearch && matchesYear && matchesMonth;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [expenses, searchTerm, filterYear, filterMonth]);
  
  const totalFilteredExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const availableYears = useMemo(() => {
      const years = new Set(expenses.map(exp => new Date(exp.date).getFullYear().toString()));
      const currentYear = new Date().getFullYear().toString();
      if (!years.has(currentYear)) {
          years.add(currentYear);
      }
      return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [expenses]);
  
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];


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
      const result = await deleteExpense(userId, expenseToDelete);
      if (result.success) {
        setExpenses(expenses.filter(e => e.id !== expenseToDelete.id));
        toast({ title: "Éxito", description: "Gasto eliminado correctamente." });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
        console.error("Error deleting expense:", error);
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo eliminar el gasto." });
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Buscar por categoría u observación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
               <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Año" /></SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger><SelectValue placeholder="Seleccionar Mes" /></SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => <SelectItem key={index} value={index.toString()}>{month}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8">
            <Card>
                <CardContent className="p-6">
                    <ExpensesTable
                        expenses={filteredExpenses}
                        accountsMap={accountsMap}
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
