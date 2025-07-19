import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ClientsDebtsPage() {
  return (
    <>
      <PageHeader
        title="Clientes y Deudas"
        description="Administra los planes y deudas de tus clientes."
      />
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Próximamente</CardTitle>
                <CardDescription>Esta sección está en desarrollo.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Aquí podrás ver y gestionar los planes de pago, deudas pendientes y la información de contacto de tus clientes.</p>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
