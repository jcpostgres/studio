"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import type { Employee, PayrollPayment, Account, Expense } from "@/lib/types";
import { getPayrollPageData, deleteEmployee as deleteEmployeeAction } from "@/lib/actions/db.actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Calendar, CheckCircle, XCircle, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeForm } from "@/components/employees/employee-form";
import { PayrollPaymentForm } from "@/components/payroll/payroll-payment-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollPage() {
    const { userId } = useAuth();
    const { toast } = useToast();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payments, setPayments] = useState<PayrollPayment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<{ month: number, year: number }>({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
    });

    // Dialog states
    const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentContext, setPaymentContext] = useState<{ employee: Employee, paymentType: '4th' | '20th' | 'bonus' } | null>(null);

    // Alert dialog states
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

    const loadData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { employees, payments, accounts } = await getPayrollPageData(userId);
            setEmployees(employees);
            setPayments(payments);
            setAccounts(accounts);
        } catch (error) {
            console.error("Error loading payroll data:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de nómina." });
        } finally {
            setLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const employeePaymentStatus = useMemo(() => {
        const statusMap = new Map<string, { payment4th: boolean, payment20th: boolean }>();
        const filteredPayments = payments.filter(p => p.month === selectedDate.month && p.year === selectedDate.year);
        
        employees.forEach(employee => {
            const has4th = filteredPayments.some(p => p.employeeId === employee.id && p.paymentType === '4th');
            const has20th = filteredPayments.some(p => p.employeeId === employee.id && p.paymentType === '20th');
            statusMap.set(employee.id, { payment4th: has4th, payment20th: has20th });
        });
        return statusMap;
    }, [employees, payments, selectedDate]);
    
    const handleDateChange = (value: string) => {
        const [month, year] = value.split('-').map(Number);
        setSelectedDate({ month, year });
    }
    
    const handleRegisterPayment = (employee: Employee, paymentType: '4th' | '20th' | 'bonus') => {
        setPaymentContext({ employee, paymentType });
        setIsPaymentDialogOpen(true);
    };

    const handleEditEmployee = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsEmployeeDialogOpen(true);
    };

    const handleDeleteEmployee = (employee: Employee) => {
        setEmployeeToDelete(employee);
        setIsAlertOpen(true);
    };

    const confirmDeleteEmployee = async () => {
        if (!userId || !employeeToDelete) return;
        try {
            const result = await deleteEmployeeAction(userId, employeeToDelete.id);
            if (result.success) {
                setEmployees(employees.filter(e => e.id !== employeeToDelete.id));
                toast({ title: "Éxito", description: "Empleado y sus pagos han sido eliminados." });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error deleting employee:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo eliminar al empleado." });
        }
        setIsAlertOpen(false);
        setEmployeeToDelete(null);
    };

    return (
        <>
            <PageHeader
              title="Gestión de Nómina"
              description="Administra empleados y registra los pagos."
            >
              <Button onClick={() => setIsEmployeeDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Empleado
              </Button>
            </PageHeader>
            
            <div className="mt-8">
                <div className="flex justify-end mb-4">
                    <Select value={`${selectedDate.month}-${selectedDate.year}`} onValueChange={handleDateChange} disabled={loading}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Seleccionar Mes" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* This should be populated with available dates */}
                            <SelectItem value={`${new Date().getMonth()}-${new Date().getFullYear()}`}>{new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {employees.map(employee => {
                            const status = employeePaymentStatus.get(employee.id) || { payment4th: false, payment20th: false };
                            return (
                                <Card key={employee.id} className="p-4 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-lg text-cyan-400">{employee.name}</h3>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditEmployee(employee)}><Edit className="h-4 w-4"/></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteEmployee(employee)}><Trash2 className="h-4 w-4"/></Button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{employee.paymentMethod}: {employee.bank}</p>
                                        
                                        <div className="my-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">Pago día 4:</span>
                                                {status.payment4th ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">Pago día 19:</span>
                                                {status.payment20th ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-auto">
                                        <Button className="w-full" onClick={() => handleRegisterPayment(employee, '4th')} disabled={status.payment4th}>Pagar 1ra Quincena</Button>
                                        <Button className="w-full" onClick={() => handleRegisterPayment(employee, '20th')} disabled={status.payment20th}>Pagar 2da Quincena</Button>
                                        <Button variant="outline" className="w-full" onClick={() => handleRegisterPayment(employee, 'bonus')}><Award className="mr-2 h-4 w-4" />Pagar Bono</Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Employee Form Dialog */}
            <Dialog open={isEmployeeDialogOpen} onOpenChange={(open) => {
                setIsEmployeeDialogOpen(open);
                if (!open) setEditingEmployee(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingEmployee ? "Editar Empleado" : "Nuevo Empleado"}</DialogTitle>
                    </DialogHeader>
                    <EmployeeForm
                        employeeToEdit={editingEmployee}
                        onSuccess={() => { setIsEmployeeDialogOpen(false); loadData(); }}
                    />
                </DialogContent>
            </Dialog>

            {/* Payment Form Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
                setIsPaymentDialogOpen(open);
                if (!open) setPaymentContext(null);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Pago de Nómina</DialogTitle>
                    </DialogHeader>
                     {paymentContext && (
                        <PayrollPaymentForm
                            employee={paymentContext.employee}
                            paymentType={paymentContext.paymentType}
                            selectedDate={selectedDate}
                            accounts={accounts}
                            onSuccess={() => {
                                setIsPaymentDialogOpen(false);
                                loadData(); // Recargar datos después de un pago exitoso
                            }}
                        />
                     )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente al empleado <span className="font-bold">{employeeToDelete?.name}</span> y todos sus registros de pago asociados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteEmployee}>Continuar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}