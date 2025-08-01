
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, writeBatch, query, where, getDocs } from "firebase/firestore";
import type { Employee, PayrollPayment, Account, Expense } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Calendar, CheckCircle, XCircle, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeForm } from "@/components/payroll/employee-form";
import { PayrollPaymentForm } from "@/components/payroll/payroll-payment-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollPage() {
    const { userId } = useAuth();
    const { toast } = useToast();

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [payments, setPayments] = useState<PayrollPayment[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState({
        month: new Date().getMonth(),
        year: new Date().getFullYear()
    });
    
    // Dialog states
    const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentContext, setPaymentContext] = useState<{ employee: Employee, paymentType: '4th' | '20th' | 'bonus' } | null>(null);

    // Alert dialog states
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

    useEffect(() => {
        if (!userId) return;
        const unsubEmployees = onSnapshot(collection(db, `users/${userId}/employees`), snap => {
            setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee)));
            setLoading(false);
        });
        const unsubPayments = onSnapshot(collection(db, `users/${userId}/payrollPayments`), snap => {
            setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollPayment)));
        });
        const unsubAccounts = onSnapshot(collection(db, `users/${userId}/accounts`), snap => {
            setAccounts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
        });

        return () => {
            unsubEmployees();
            unsubPayments();
            unsubAccounts();
        };
    }, [userId]);
    
    const employeePaymentStatus = useMemo(() => {
        const statusMap = new Map<string, { payment4th: boolean, payment20th: boolean }>();
        employees.forEach(emp => {
            const empPayments = payments.filter(p => 
                p.employeeId === emp.id && 
                p.month === selectedDate.month && 
                p.year === selectedDate.year
            );
            statusMap.set(emp.id, {
                payment4th: empPayments.some(p => p.paymentType === '4th'),
                payment20th: empPayments.some(p => p.paymentType === '20th'),
            });
        });
        return statusMap;
    }, [employees, payments, selectedDate]);

    const availableDates = useMemo(() => {
        const dates = new Set(payments.map(p => `${p.month}-${p.year}`));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        dates.add(`${currentMonth}-${currentYear}`);
        return Array.from(dates).map(d => {
            const [month, year] = d.split('-').map(Number);
            return { month, year, label: new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' }) };
        }).sort((a,b) => new Date(b.year, b.month).getTime() - new Date(a.year, a.month).getTime());
    }, [payments]);

    const handleDateChange = (value: string) => {
        const [month, year] = value.split('-').map(Number);
        setSelectedDate({ month, year });
    }

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
            const batch = writeBatch(db);
            
            const employeeRef = doc(db, `users/${userId}/employees`, employeeToDelete.id);
            batch.delete(employeeRef);

            const paymentsQuery = query(collection(db, `users/${userId}/payrollPayments`), where("employeeId", "==", employeeToDelete.id));
            const paymentsSnap = await getDocs(paymentsQuery);
            paymentsSnap.forEach(paymentDoc => batch.delete(paymentDoc.ref));

            await batch.commit();
            toast({ title: "Éxito", description: "Empleado y sus pagos han sido eliminados." });
        } catch (error) {
            console.error("Error deleting employee:", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar al empleado." });
        }
        setIsAlertOpen(false);
        setEmployeeToDelete(null);
    };

    const openNewEmployeeDialog = () => {
        setEditingEmployee(null);
        setIsEmployeeDialogOpen(true);
    };
    
    const handleRegisterPayment = (employee: Employee, paymentType: '4th' | '20th' | 'bonus') => {
        setPaymentContext({ employee, paymentType });
        setIsPaymentDialogOpen(true);
    };
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    return (
        <>
            <PageHeader
              title="Gestión de Nómina"
              description="Administra empleados y registra los pagos."
            >
              <Button onClick={openNewEmployeeDialog} size="icon" className="rounded-full h-10 w-10">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </PageHeader>
            
            <div className="mt-4 flex justify-start">
                <Select
                  value={`${selectedDate.month}-${selectedDate.year}`}
                  onValueChange={handleDateChange}
                  disabled={loading}
                >
                  <SelectTrigger className="w-[200px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Seleccionar Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map((d) => (
                      <SelectItem
                        key={`${d.month}-${d.year}`}
                        value={`${d.month}-${d.year}`}
                      >
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {loading ? (
                    [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : employees.length > 0 ? (
                    employees.map(employee => {
                        const status = employeePaymentStatus.get(employee.id) || { payment4th: false, payment20th: false };
                        return (
                            <Card key={employee.id} className="p-4 bg-card-foreground/5 rounded-xl flex flex-col">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg text-cyan-400">{employee.name}</h3>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditEmployee(employee)}><Edit className="h-4 w-4"/></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteEmployee(employee)}><Trash2 className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{employee.paymentMethod}: {employee.bank}</p>
                                    
                                    <div className="my-2 text-center">
                                        <div className="p-2 bg-background/50 rounded-lg">
                                            <p className="text-xs text-muted-foreground">Sueldo Mensual</p>
                                            <p className="font-semibold">{formatCurrency(employee.monthlySalary)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {status.payment4th ? <CheckCircle className="h-5 w-5 text-green-400"/> : <XCircle className="h-5 w-5 text-yellow-400"/>}
                                                <span>Pago Día 4</span>
                                            </div>
                                            <Button size="sm" variant={status.payment4th ? "outline" : "default"} disabled={status.payment4th} onClick={() => handleRegisterPayment(employee, '4th')}>
                                               {status.payment4th ? "Pagado" : "Pagar"}
                                            </Button>
                                        </div>
                                         <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                 {status.payment20th ? <CheckCircle className="h-5 w-5 text-green-400"/> : <XCircle className="h-5 w-5 text-yellow-400"/>}
                                                <span>Pago Día 20</span>
                                            </div>
                                            <Button size="sm" variant={status.payment20th ? "outline" : "default"} disabled={status.payment20th} onClick={() => handleRegisterPayment(employee, '20th')}>
                                                {status.payment20th ? "Pagado" : "Pagar"}
                                            </Button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Award className="h-5 w-5 text-yellow-400"/>
                                                <span>Bono Adicional</span>
                                            </div>
                                            <Button size="sm" variant={"default"} onClick={() => handleRegisterPayment(employee, 'bonus')}>
                                               Pagar Bono
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                ) : (
                    <Card className="md:col-span-2 flex items-center justify-center h-40">
                        <p className="text-muted-foreground">No tienes empleados. ¡Agrega uno para empezar!</p>
                    </Card>
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
                        onSuccess={() => setIsEmployeeDialogOpen(false)}
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
                        <DialogTitle>
                            {paymentContext?.paymentType === 'bonus' 
                                ? `Registrar Bono a ${paymentContext?.employee.name}`
                                : `Registrar Pago a ${paymentContext?.employee.name}`
                            }
                        </DialogTitle>
                    </DialogHeader>
                     {paymentContext && (
                        <PayrollPaymentForm
                            employee={paymentContext.employee}
                            paymentType={paymentContext.paymentType}
                            selectedDate={selectedDate}
                            accounts={accounts}
                            onSuccess={() => setIsPaymentDialogOpen(false)}
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

    

    
