// src/lib/schema.ts
export const schema = `
    -- Tabla de Usuarios (aunque usemos uno mock, es buena práctica tenerla)
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT
    );

    -- Tabla de Cuentas
    CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0,
        type TEXT,
        commission REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Tabla de Gastos
    CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        paymentAccount TEXT NOT NULL,
        responsible TEXT,
        observations TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (paymentAccount) REFERENCES accounts(id)
    );

    -- Tabla de Ingresos
    CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        client TEXT NOT NULL,
        brandName TEXT,
        country TEXT NOT NULL,
        servicesDetails TEXT NOT NULL, -- JSON string
        amountPaid REAL NOT NULL,
        paymentAccount TEXT NOT NULL,
        responsible TEXT NOT NULL,
        observations TEXT,
        dueDate TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        totalContractedAmount REAL NOT NULL,
        commissionRate REAL NOT NULL,
        commissionAmount REAL NOT NULL,
        amountWithCommission REAL NOT NULL,
        remainingBalance REAL NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (paymentAccount) REFERENCES accounts(id)
    );

    -- Tabla de Recordatorios
    CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        incomeId TEXT,
        adminPaymentId TEXT,
        clientId TEXT,
        brandName TEXT,
        service TEXT,
        renewalAmount REAL,
        debtAmount REAL,
        dueDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        message TEXT,
        timestamp TEXT NOT NULL,
        resolvedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Tabla de Transacciones
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        account TEXT,
        sourceAccount TEXT,
        destinationAccount TEXT,
        observations TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Tabla de Pagos de Clientes (registro histórico de pagos aplicados a deudas)
    CREATE TABLE IF NOT EXISTS clientPayments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        clientName TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        account TEXT,
        incomeIds TEXT, -- JSON array of income ids this payment applied to
        timestamp TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Tabla de Pagos Administrativos
    CREATE TABLE IF NOT EXISTS adminPayments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        conceptName TEXT, category TEXT, providerName TEXT, contractNumber TEXT,
        referenceNumber TEXT, providerId TEXT, paymentAmount REAL, paymentCurrency TEXT,
        paymentFrequency TEXT, paymentDueDate TEXT, renewalDate TEXT, paymentMethod TEXT,
        beneficiaryBank TEXT, beneficiaryAccountNumber TEXT, beneficiaryAccountType TEXT,
        notes TEXT, createdAt TEXT, updatedAt TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Tabla de Empleados
    CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        name TEXT, cedula TEXT, phone TEXT, bank TEXT, paymentMethod TEXT,
        biWeeklySalary REAL, monthlySalary REAL,
        FOREIGN KEY (userId) REFERENCES users(id)
    );

    -- Tabla de Pagos de Nómina
    CREATE TABLE IF NOT EXISTS payrollPayments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        employeeId TEXT, employeeName TEXT, paymentType TEXT, month INTEGER, year INTEGER,
        totalAmount REAL, date TEXT, observations TEXT, timestamp TEXT, paymentAccount TEXT,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (employeeId) REFERENCES employees(id)
    );
`;
