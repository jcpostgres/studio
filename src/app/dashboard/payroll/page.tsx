import { PageHeader } from "@/components/layout/page-header";

export default function PayrollPage() {
  return (
    <div>
      <PageHeader
        title="Nómina y Reportes"
        description="Gestiona los empleados y consulta el historial de pagos."
      />
      <div className="mt-8">
        <p>Contenido de la página de nómina...</p>
      </div>
    </div>
  );
}
