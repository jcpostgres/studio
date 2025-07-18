
import { PageHeader } from "@/components/layout/page-header";
import { IncomeForm } from "@/components/incomes/income-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewIncomePage() {
  return (
    <>
      <PageHeader
        title="Registrar Nuevo Ingreso"
        description="Completa el formulario para registrar un nuevo ingreso."
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Ingreso</CardTitle>
            <CardDescription>
              Llena todos los campos requeridos para guardar el registro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IncomeForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
