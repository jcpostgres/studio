import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import Link from 'next/link';

export default function ExpensesPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Expenses"
        description="Track and manage all your expenses."
      >
        <Link href="/dashboard/expenses/new" passHref>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
            </Button>
        </Link>
      </PageHeader>
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Expense History</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Expense list will be displayed here.</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
