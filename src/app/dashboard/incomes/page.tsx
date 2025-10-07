
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { Income } from "@/lib/types";
import { assertDb } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { IncomesTable } from "@/components/incomes/incomes-table";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle } from "lucide-react";

export default function IncomesPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const { toast } = useToast();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>((new Date().getMonth()).toString());

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<Income | null>(null);

  useEffect(() => {
    if (!userId) return;
  const incomesRef = collection(assertDb(), `users/${userId}/incomes`);
  const unsubscribe = onSnapshot(incomesRef, (snapshot) => {
      const fetchedIncomes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Income));
      setIncomes(fetchedIncomes);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching incomes:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ingresos." });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, toast]);
  
  const filteredIncomes = useMemo(() => {
    return incomes.filter(income => {
      const incomeDate = new Date(income.date);
      const matchesSearch = searchTerm === '' ||
        income.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (income.brandName && income.brandName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesYear = !filterYear || incomeDate.getFullYear().toString() === filterYear;
      const matchesMonth = !filterMonth || incomeDate.getMonth().toString() === filterMonth;
      return matchesSearch && matchesYear && matchesMonth;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [incomes, searchTerm, filterYear, filterMonth]);
  
  const totalFilteredIncome = useMemo(() => {
    return filteredIncomes.reduce((sum, income) => sum + (income.amountWithCommission || 0), 0);
  }, [filteredIncomes]);

  const availableYears = useMemo(() => {
      const years = new Set(incomes.map(inc => new Date(inc.date).getFullYear().toString()));
      const currentYear = new Date().getFullYear().toString();
      if (!years.has(currentYear)) {
          years.add(currentYear);
      }
      return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [incomes]);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handleEdit = (incomeId: string) => {
    router.push(`/dashboard/incomes/${incomeId}/edit`);
  };

  const handleDelete = (income: Income) => {
    setIncomeToDelete(income);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!userId || !incomeToDelete) return;

    try {
      const batch = writeBatch(assertDb());

    // Revert account balance
  const accountRef = doc(assertDb(), `users/${userId}/accounts`, incomeToDelete.paymentAccount);
  const accountSnap = await getDoc(accountRef);
    const prevBalance = accountSnap.exists() ? (accountSnap.data()?.balance ?? 0) : 0;
    batch.update(accountRef, { balance: prevBalance - incomeToDelete.amountWithCommission });

    // Delete associated reminder if it exists
  const reminderQuery = collection(assertDb(), `users/${userId}/reminders`);
  const reminderSnapshot = await getDoc(doc(assertDb(), `users/${userId}/reminders`, incomeToDelete.id));
    if (reminderSnapshot.exists()) {
      batch.delete(doc(assertDb(), `users/${userId}/reminders`, incomeToDelete.id));
    }
        
        // Delete income
      const incomeDocRef = doc(assertDb(), `users/${userId}/incomes`, incomeToDelete.id);
        batch.delete(incomeDocRef);

        await batch.commit();

        toast({ title: "Éxito", description: "Ingreso eliminado correctamente." });

    } catch (error) {
        console.error("Error deleting income:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el ingreso." });
    } finally {
        setIsAlertOpen(false);
        setIncomeToDelete(null);
    }
  };

  return (
    <>
      <PageHeader title="Ingresos" description="Consulta y administra tus ingresos.">
        <Button onClick={() => router.push('/dashboard/incomes/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Registrar Ingreso
        </Button>
      </PageHeader>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
            <CardDescription>
                Total de Ingresos Filtrados: 
                <span className="font-bold text-green-400">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalFilteredIncome)}
                </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Buscar por cliente o marca..."
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
            <IncomesTable
                incomes={filteredIncomes}
                onEdit={handleEdit}
                onDelete={handleDelete}
                loading={loading}
            />
        </div>
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el ingreso de 
              <span className="font-bold"> {incomeToDelete?.client}</span> y revertirá el monto del balance de la cuenta asociada.
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
