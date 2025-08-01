
export interface IncomeServiceDetail {
    name: string;
    amount: number;
}

export interface Income {
    id: string;
    date: string;
    client: string;
    brandName?: string;
    country: string;
    services: string[]; 
    servicesDetails: IncomeServiceDetail[]; 
    paymentAccount: string;
    responsible: string;
    observations: string;
    amountPaid: number;
    totalContractedAmount: number;
    commissionRate: number;
    commissionAmount: number;
    amountWithCommission: number;
    remainingBalance: number;
    timestamp: string; // ISO String
    dueDate: string | null; // ISO String
    status: 'active' | 'cancelled';
}

export interface Expense {
    id: string;
    date: string;
    type: 'variable' | 'fijo';
    category: string;
    amount: number;
    paymentAccount: string;
    responsible: string;
    observations: string;
    timestamp: string; // ISO String
}

export interface Employee {
    id: string;
    name: string;
    cedula: string;
    phone: string;
    bank: string;
    biWeeklySalary: number;
    monthlySalary: number;
    paymentMethod: string;
}

export interface PayrollPayment {
    id: string;
    employeeId: string;
    employeeName: string;
    paymentType: '4th' | '19th';
    month: number;
    year: number;
    totalAmount: number;
    paymentAccount: string;
    date: string;
    observations: string;
    timestamp: string; // ISO String
}

export interface Transaction {
    id: string;
    type: 'withdrawal' | 'accountTransfer';
    date: string;
    amount: number;
    account?: string;
    sourceAccount?: string;
    destinationAccount?: string;
    observations: string;
    timestamp: string; // ISO String
}

export interface Account {
    id: string;
    name: string;
    balance: number;
    commission: number;
    type: 'Efectivo' | 'Digital' | 'Bancario';
}

export interface Reminder {
    id: string;
    incomeId: string | null; // For income renewals
    adminPaymentId: string | null; // For administrative payments
    clientId: string;
    brandName: string;
    service: string;
    renewalAmount: number;
    debtAmount: number;
    dueDate: string;
    status: 'pending' | 'resolved';
    contact: string;
    message: string;
    timestamp: string; // ISO String
    resolvedAt: string | null; // ISO String
}

export interface AdminPayment {
    id: string;
    // General Data
    conceptName: string;
    category: 'Servicios Básicos' | 'Alquiler' | 'Seguros' | 'Préstamos/Créditos' | 'Suscripciones/Membresías' | 'Impuestos' | 'Otros';
    // Provider Data
    providerName: string;
    contractNumber?: string;
    referenceNumber?: string;
    providerId?: string; // RIF/C.I.
    // Payment Details
    paymentAmount?: number;
    paymentCurrency?: string;
    paymentFrequency?: 'Mensual' | 'Bimestral' | 'Trimestral' | 'Anual' | 'Única vez';
    paymentDueDate?: string | null;
    renewalDate?: string | null;
    paymentMethod?: string;
    // Bank Details
    beneficiaryBank?: string;
    beneficiaryAccountNumber?: string;
    beneficiaryAccountType?: 'Ahorro' | 'Corriente';
    // Notes
    notes?: string;
    // Timestamps
    createdAt: string; // ISO String
    updatedAt: string; // ISO String
}
