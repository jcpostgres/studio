
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import type { Employee, PayrollPayment } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, Award, Calendar } from "lucide-react";

interface EmployeeReport extends Employee {
    payments: PayrollPayment[];
    totalPaid: number;
}

export default function PayrollReportPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allPayments, setAllPayments] = useState<PayrollPayment[]>([]);
    
    const [selectedDate, setSelectedDate] = useState<{ month: number, year: number }>({
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
    });

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        const unsubEmployees = onSnapshot(collection(db, `users/${userId}/employees`), (snap) => 
            setEmployees(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee)))
        );
        const unsubPayments = onSnapshot(collection(db, `users/${userId}/payrollPayments`), (snap) => {
            setAllPayments(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as PayrollPayment)));
            setLoading(false);
        });

        return () => {
            unsubEmployees();
            unsubPayments();
        };
    }, [userId]);

    const filteredPayments = useMemo(() => {
        return allPayments.filter(p => p.month === selectedDate.month && p.year === selectedDate.year);
    }, [allPayments, selectedDate]);
    
    const employeeReports = useMemo<EmployeeReport[]>(() => {
        return employees.map(emp => {
            const empPayments = filteredPayments.filter(p => p.employeeId === emp.id);
            const totalPaid = empPayments.reduce((sum, p) => sum + p.totalAmount, 0);
            return {
                ...emp,
                payments: empPayments,
                totalPaid
            };
        });
    }, [employees, filteredPayments]);

    const summaryData = useMemo(() => {
        const totalPayroll = employees.reduce((sum, emp) => sum + emp.monthlySalary, 0);
        const totalPaid = employeeReports.reduce((sum, rep) => sum + rep.totalPaid, 0);
        const totalPending = totalPayroll - totalPaid;
        const totalBonuses = employeeReports.reduce((sum, rep) => {
            const salary = rep.monthlySalary;
            return sum + Math.max(0, rep.totalPaid - salary);
        }, 0);
        return { totalPayroll, totalPaid, totalPending, totalBonuses };
    }, [employees, employeeReports]);
    
    const availableDates = useMemo(() => {
        const dates = new Set(allPayments.map(p => `${p.month}-${p.year}`));
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        dates.add(`${currentMonth}-${currentYear}`);
        return Array.from(dates).map(d => {
            const [month, year] = d.split('-').map(Number);
            return { month, year, label: new Date(year, month).toLocaleString('es-ES', { month: 'long', year: 'numeric' }) };
        }).sort((a,b) => new Date(b.year, b.month).getTime() - new Date(a.year, a.month).getTime());
    }, [allPayments]);
    
    const handleDateChange = (value: string) => {
        const [month, year] = value.split('-').map(Number);
        setSelectedDate({ month, year });
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    const MetricCard = ({ title, value, icon: Icon, colorClass, loading }: { title: string, value: number, icon: React.ElementType, colorClass: string, loading: boolean }) => (
        <Card className="p-4 bg-card-foreground/5 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-muted-foreground">{title}</p>
                <div className={`flex items-center justify-center h-8 w-8 rounded-full ${colorClass}/20 text-${colorClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-2xl font-bold">{formatCurrency(value)}</p>}
        </Card>
    );
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader title="Reporte de Nómina"/>
                <Select value={`${selectedDate.month}-${selectedDate.year}`} onValueChange={handleDateChange} disabled={loading}>
                    <SelectTrigger className="w-[180px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Seleccionar Mes" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableDates.map(d => <SelectItem key={`${d.month}-${d.year}`} value={`${d.month}-${d.year}`}>{d.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Nómina" value={summaryData.totalPayroll} icon={DollarSign} colorClass="text-cyan-400" loading={loading} />
                <MetricCard title="Pagado" value={summaryData.totalPaid} icon={TrendingUp} colorClass="text-green-400" loading={loading} />
                <MetricCard title="Pendiente" value={summaryData.totalPending} icon={Clock} colorClass="text-yellow-400" loading={loading} />
                <MetricCard title="Bonos" value={summaryData.totalBonuses} icon={Award} colorClass="text-primary" loading={loading} />
            </div>

            <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Detalle por Empleado</h2>
                <div className="space-y-4">
                    {loading ? (
                         [...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)
                    ) : (
                        employeeReports.map(emp => (
                            <Card key={emp.id} className="p-4 bg-card-foreground/5 rounded-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">{emp.name}</h3>
                                        <p className="text-sm text-muted-foreground">{emp.cedula}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Sueldo Mensual</p>
                                        <p className="font-bold text-lg text-cyan-400">{formatCurrency(emp.monthlySalary)}</p>
                                    </div>
                                </div>
                                
                                <p className="font-semibold mb-2">Pagos del Mes</p>
                                <div className="space-y-2 mb-4">
                                   {emp.payments.length > 0 ? emp.payments.map(p => (
                                     <div key={p.id} className="bg-card/50 p-3 rounded-lg flex justify-between items-center">
                                       <div>
                                            <p className="font-medium">Pago del {p.paymentType === '4th' ? 'Día 4' : 'Día 19'}</p>
                                            <p className="text-xl font-bold">{formatCurrency(p.totalAmount)}</p>
                                       </div>
                                       <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Pagado</Badge>
                                     </div>
                                   )) : <p className="text-sm text-muted-foreground p-3">No hay pagos registrados para este mes.</p>}
                                </div>
                                
                                <div className="bg-green-500/10 text-green-400 p-3 rounded-lg flex justify-between items-center font-bold">
                                    <p>Total Pagado este Mes:</p>
                                    <p>{formatCurrency(emp.totalPaid)}</p>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
