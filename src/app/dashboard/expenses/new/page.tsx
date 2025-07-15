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
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="New Expense"
        description="Add a new expense to your records. Use our AI to suggest a category!"
      />
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>
              Fill out the form below to add a new expense.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
