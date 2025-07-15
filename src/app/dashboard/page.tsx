import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    return (
        <div className="p-4 md:p-6 lg:p-8">
            <PageHeader
              title="Dashboard"
              description="Here's a summary of your financial activity."
            >
              <Link href="/dashboard/incomes?new=true" passHref>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Income
                </Button>
              </Link>
               <Link href="/dashboard/expenses?new=true" passHref>
                <Button variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Expense
                </Button>
              </Link>
            </PageHeader>
            <div className="mt-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Placeholder for dashboard widgets */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">Monthly Summary</h3>
                        <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
                    </div>
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">Quick Stats</h3>
                         <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
                    </div>
                     <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <h3 className="text-2xl font-semibold leading-none tracking-tight">Recent Transactions</h3>
                         <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
                    </div>
                </div>
                 <div className="mt-6 rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                    <h3 className="text-2xl font-semibold leading-none tracking-tight">Financial Chart</h3>
                    <p className="text-sm text-muted-foreground mt-2">Chart will be implemented here.</p>
                </div>
            </div>
        </div>
    );
}
