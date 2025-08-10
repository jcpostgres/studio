
"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import type { Income, IncomeServiceDetail } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingUp, ClipboardList, Calendar } from "lucide-react";

interface MonthlyBreakdown {
    month: number;
    monthName: string;
    units: number;
    income: number;
}

interface ServiceReport {
    serviceName: string;
    totalUnits: number;
    totalIncome: number;
    monthlyBreakdown: MonthlyBreakdown[];
}

export default function ServiceReportPage() {
    const { userId } = useAuth();
    const [loading, setLoading] = useState(true);
    
    const [allIncomes, setAllIncomes] = useState<Income[]>([]);
    const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());

    useEffect(() => {
        if (!userId || !db) return;
        setLoading(true);
        const unsubIncomes = onSnapshot(collection(db, `users/${userId}/incomes`), (snap) => {
            setAllIncomes(snap.docs.map(doc => ({...doc.data(), id: doc.id} as Income)));
            setLoading(false);
        });
        return () => unsubIncomes();
    }, [userId]);

    const filteredIncomes = useMemo(() => {
        const parseDate = (dateString: string) => new Date(`${dateString}T00:00:00`);
        return allIncomes.filter(income => parseDate(income.date).getFullYear().toString() === filterYear);
    }, [allIncomes, filterYear]);
    
    const serviceReports = useMemo<ServiceReport[]>(() => {
        const reports: { [key: string]: ServiceReport } = {};
        const parseDate = (dateString: string) => new Date(`${dateString}T00:00:00`);

        filteredIncomes.forEach(income => {
            income.servicesDetails.forEach(service => {
                if (!reports[service.name]) {
                    reports[service.name] = {
                        serviceName: service.name,
                        totalUnits: 0,
                        totalIncome: 0,
                        monthlyBreakdown: Array.from({ length: 12 }, (_, i) => ({
                            month: i,
                            monthName: new Date(0, i).toLocaleString('es-ES', { month: 'long' }),
                            units: 0,
                            income: 0,
                        })),
                    };
                }
                const report = reports[service.name];
                report.totalUnits += 1; // Each service detail instance counts as one unit
                report.totalIncome += service.amount;

                const monthIndex = parseDate(income.date).getMonth();
                report.monthlyBreakdown[monthIndex].units += 1;
                report.monthlyBreakdown[monthIndex].income += service.amount;
            });
        });

        return Object.values(reports).sort((a, b) => b.totalIncome - a.totalIncome);
    }, [filteredIncomes]);

    const annualSummary = useMemo(() => {
        const totalIncome = serviceReports.reduce((sum, report) => sum + report.totalIncome, 0);
        const totalServices = serviceReports.reduce((sum, report) => sum + report.totalUnits, 0);
        return { totalIncome, totalServices };
    }, [serviceReports]);

    const availableYears = useMemo(() => {
        const years = new Set(allIncomes.map(inc => new Date(inc.date).getFullYear().toString()));
        const currentYear = new Date().getFullYear().toString();
        if (!years.has(currentYear)) { years.add(currentYear); }
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [allIncomes]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

    const MetricCard = ({ title, value, icon: Icon, loading, formatAsCurrency = false }: { title: string, value: number, icon: React.ElementType, loading: boolean, formatAsCurrency?: boolean }) => (
        <Card className="p-4 bg-card-foreground/5 rounded-xl flex flex-col justify-between">
            <div className="flex items-center mb-4">
                <div className={`flex items-center justify-center h-10 w-10 rounded-full bg-cyan-500/10 text-cyan-400 mr-4`}>
                    <Icon className="h-5 w-5" />
                </div>
                <p className="text-md text-muted-foreground">{title}</p>
            </div>
            {loading ? <Skeleton className="h-8 w-3/4" /> : <p className="text-3xl font-bold">{formatAsCurrency ? formatCurrency(value) : value}</p>}
        </Card>
    );
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <PageHeader title="Reporte de Servicios"/>
                <Select value={filterYear} onValueChange={setFilterYear} disabled={loading}>
                    <SelectTrigger className="w-[120px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard title="Total Servicios" value={annualSummary.totalServices} icon={ClipboardList} loading={loading} />
                <MetricCard title="Ingresos Totales" value={annualSummary.totalIncome} icon={TrendingUp} loading={loading} formatAsCurrency />
            </div>

            <div className="space-y-4">
                 {loading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)
                ) : serviceReports.length > 0 ? (
                    <Accordion type="multiple" className="w-full space-y-4">
                        {serviceReports.map((report) => (
                             <Card key={report.serviceName} className="bg-card-foreground/5 rounded-xl overflow-hidden">
                                <AccordionItem value={report.serviceName} className="border-b-0">
                                    <AccordionTrigger className="p-4 hover:no-underline">
                                        <div className="flex justify-between items-center w-full">
                                            <h3 className="text-xl font-bold text-cyan-400">{report.serviceName}</h3>
                                            <div className="text-right">
                                                <p className="text-sm text-muted-foreground">{report.totalUnits} vendidos</p>
                                                <p className="text-lg font-semibold text-green-400">{formatCurrency(report.totalIncome)}</p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="bg-background/50 px-4 pb-4 space-y-2">
                                           {report.monthlyBreakdown.filter(m => m.units > 0).map(month => (
                                                <div key={month.month} className="flex justify-between items-center p-3 bg-card/50 rounded-lg">
                                                    <p className="font-medium capitalize">{month.monthName}</p>
                                                    <div className="text-right">
                                                         <p className="text-sm text-muted-foreground">{month.units} unidades</p>
                                                         <p className="font-semibold text-green-400">{formatCurrency(month.income)}</p>
                                                    </div>
                                                </div>
                                           ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                             </Card>
                        ))}
                    </Accordion>
                ) : (
                    <Card className="flex items-center justify-center h-40">
                        <p className="text-muted-foreground">No hay datos de servicios para el año seleccionado.</p>
                    </Card>
                )}
            </div>
        </div>
    );
}

    