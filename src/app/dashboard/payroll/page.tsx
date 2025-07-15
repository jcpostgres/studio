import { PageHeader } from "@/components/layout/page-header";

export default function PayrollPage() {
  return (
    <div>
      <PageHeader
        title="Nómina"
        description="Gestiona los empleados y sus pagos."
      />
      <div className="mt-8">
        <p>Contenido de la página de nómina...</p>
      </div>
    </div>
  );
}
