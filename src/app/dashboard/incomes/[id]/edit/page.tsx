
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/auth-context"; 
import { getIncomeForEdit } from "@/lib/actions/db.actions";
import type { Income } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { IncomeForm } from "@/components/incomes/income-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditIncomePage() {
  const params = useParams();
  const { userId } = useAuth();
  const [income, setIncome] = useState<Income | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!userId || !id) return;

    const fetchIncome = async () => {
      try {
        const incomeData = await getIncomeForEdit(userId, id);

        if (incomeData) {
          setIncome(incomeData);
        } else {
          setError("No se encontró el ingreso.");
        }
      } catch (err) {
        setError("Error al cargar el ingreso.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncome();
  }, [userId, id]);

  return (
    <>
      <PageHeader
        title="Editar Ingreso"
        description="Modifica los detalles del ingreso registrado."
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Ingreso</CardTitle>
            <CardDescription>
              Ajusta la información y guarda los cambios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <Skeleton className="h-[400px] w-full" />}
            {error && <p className="text-destructive">{error}</p>}
            {!loading && !error && income && (
              <IncomeForm incomeToEdit={income} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
