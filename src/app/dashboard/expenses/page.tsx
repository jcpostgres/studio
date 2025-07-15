import { PageHeader } from "@/components/layout/page-header";

export default function ExpensesPage() {
  return (
    <div>
      <PageHeader
        title="Gastos"
        description="Lleva un control de todos tus gastos."
      />
      <div className="mt-8">
        <p>Contenido de la página de gastos...</p>
      </div>
    </div>
  );
}
