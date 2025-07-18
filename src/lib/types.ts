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
    amount1: number;
    account1: string;
    amount2: number;
    account2: string;
    totalAmount: number;
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
}

export interface Reminder {
    id: string;
    incomeId: string;
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
