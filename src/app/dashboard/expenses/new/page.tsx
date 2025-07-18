
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/expenses/expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewExpensePage() {
  return (
    <>
      <PageHeader
        title="Registrar Nuevo Gasto"
        description="Añade un nuevo gasto a tus registros. ¡Usa nuestra IA para sugerir una categoría!"
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Gasto</CardTitle>
            <CardDescription>
              Completa el formulario para registrar un nuevo gasto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
