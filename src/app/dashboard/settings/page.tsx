import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Configuración General"
        description="Personaliza listas y opciones de la aplicación."
      />
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Próximamente</CardTitle>
                <CardDescription>Esta sección está en desarrollo.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>En esta sección podrás administrar listas personalizadas como:</p>
                <ul className="list-disc list-inside mt-4 space-y-2">
                    <li>Países</li>
                    <li>Responsables</li>
                    <li>Categorías de gastos fijos</li>
                    <li>Y otras configuraciones generales de la aplicación.</li>
                </ul>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
