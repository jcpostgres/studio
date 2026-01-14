"use server";

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { schema } from '@/lib/schema.js';

let db: Awaited<ReturnType<typeof open>> | null = null;

async function assertDb() {
  if (!db) {
    db = await open({
      filename: './database.db',
      driver: sqlite3.Database,
    });
        // Ensure schema exists (create missing tables when DB was created before schema changes)
        try {
            await db.exec(schema as unknown as string);
        } catch (e) {
            console.error('Error ensuring DB schema:', e);
        }
  }
  return db;
}
import type {
  Account,
  Expense,
  Income,
  Transaction,
  PayrollPayment,
  Employee,
  Reminder,
  AdminPayment,
} from "@/lib/types";
import { randomUUID } from "crypto";

export async function getAccounts(userId: string): Promise<Account[]> {
  const db = await assertDb();
  return db.all<Account[]>("SELECT * FROM accounts WHERE userId = ?", userId);
}

export async function getExistingExpenseCategories(
  userId: string
): Promise<string[]> {
  const db = await assertDb();
  const categoriesData = await db.all<{ category: string }[]>(
    "SELECT DISTINCT category FROM expenses WHERE userId = ?",
    userId
  );
  return categoriesData.map((c) => c.category);
}

export async function saveExpense(
  userId: string,
  values: Omit<Expense, "id" | "timestamp" | "userId">
) {
  const db = await assertDb();
  await db.exec("BEGIN TRANSACTION");
  try {
    const expenseId = randomUUID();
    await db.run(
      `INSERT INTO expenses (id, userId, date, type, category, amount, paymentAccount, responsible, observations, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      expenseId,
      userId,
      values.date,
      values.type,
      values.category,
      values.amount,
      values.paymentAccount,
      values.responsible || "",
      values.observations || "",
      new Date().toISOString()
    );

    const account = await db.get<Account>(
      "SELECT balance FROM accounts WHERE id = ? AND userId = ?",
      values.paymentAccount,
      userId
    );
    if (!account) {
      throw new Error("La cuenta de pago no existe.");
    }
    const newBalance = account.balance - values.amount;
    await db.run(
      "UPDATE accounts SET balance = ? WHERE id = ?",
      newBalance,
      values.paymentAccount
    );

    await db.exec("COMMIT");
    return { success: true };
  } catch (error: any) {
    await db.exec("ROLLBACK");
    console.error("Error saving expense:", error);
    return { success: false, message: error.message };
  }
}

export async function getDashboardData(userId: string) {
  const db = await assertDb();
  const allIncomes = await db.all<Income[]>(
    "SELECT * FROM incomes WHERE userId = ?",
    userId
  );
  const allExpenses = await db.all<Expense[]>(
    "SELECT * FROM expenses WHERE userId = ?",
    userId
  );
  const allPayrollPayments = await db
    .all<PayrollPayment[]>("SELECT * FROM payrollPayments WHERE userId = ?", userId)
    .catch(() => []);
  const allTransactions = await db
    .all<Transaction[]>("SELECT * FROM transactions WHERE userId = ?", userId)
    .catch(() => []);
  const allAccounts = await db.all<Account[]>(
    "SELECT * FROM accounts WHERE userId = ?",
    userId
  );

  return {
    allIncomes,
    allExpenses,
    allPayrollPayments,
    allTransactions,
    allAccounts,
  };
}

export async function getReminders(userId: string): Promise<Reminder[]> {
    const db = await assertDb();
    return db.all<Reminder[]>("SELECT * FROM reminders WHERE userId = ? ORDER BY dueDate ASC", userId);
}

export async function getEmployees(userId: string): Promise<Employee[]> {
    const db = await assertDb();
    return db.all<Employee[]>("SELECT * FROM employees WHERE userId = ?", userId).catch(() => []);
}

export async function getExpenses(userId: string): Promise<Expense[]> {
    const db = await assertDb();
    return db.all<Expense[]>("SELECT * FROM expenses WHERE userId = ?", userId);
}

export async function deleteExpense(userId: string, expenseToDelete: Expense) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        // 1. Revertir el saldo de la cuenta
        const account = await db.get<Account>(
            "SELECT balance FROM accounts WHERE id = ? AND userId = ?",
            expenseToDelete.paymentAccount,
            userId
        );
        if (account) {
            const newBalance = account.balance + expenseToDelete.amount;
            await db.run("UPDATE accounts SET balance = ? WHERE id = ?", newBalance, expenseToDelete.paymentAccount);
        }

        // 2. Eliminar el gasto
        await db.run("DELETE FROM expenses WHERE id = ? AND userId = ?", expenseToDelete.id, userId);

        await db.exec('COMMIT');
        return { success: true };

    } catch (error: any) {
        await db.exec('ROLLBACK');
        console.error("Error deleting expense:", error);
        return { success: false, message: error.message };
    }
}

export async function saveIncome(
    userId: string,
    values: Omit<Income, 'id' | 'timestamp'> & { id?: string } // Allow optional id for editing
) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        const account = await db.get<Account>("SELECT * FROM accounts WHERE id = ? AND userId = ?", values.paymentAccount, userId);
        if (!account) {
            throw new Error("La cuenta de pago seleccionada no existe.");
        }

        const totalContractedAmount = values.servicesDetails.reduce((sum, service) => sum + service.amount, 0);
        const commissionRate = account.commission || 0;
        const commissionAmount = values.amountPaid * commissionRate;
        const amountWithCommission = values.amountPaid - commissionAmount;
        const remainingBalance = totalContractedAmount - values.amountPaid;

        const incomeId = values.id || randomUUID();

        const incomeData = {
            ...values,
            totalContractedAmount,
            commissionRate,
            commissionAmount,
            amountWithCommission,
            remainingBalance,
        };

        // Insert or update income
        await db.run(
            `INSERT INTO incomes (id, userId, date, client, brandName, country, servicesDetails, amountPaid, paymentAccount, responsible, observations, dueDate, status, totalContractedAmount, commissionRate, commissionAmount, amountWithCommission, remainingBalance, timestamp) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             date=excluded.date, client=excluded.client, brandName=excluded.brandName, country=excluded.country, servicesDetails=excluded.servicesDetails, amountPaid=excluded.amountPaid, paymentAccount=excluded.paymentAccount, responsible=excluded.responsible, observations=excluded.observations, dueDate=excluded.dueDate, status=excluded.status, totalContractedAmount=excluded.totalContractedAmount, commissionRate=excluded.commissionRate, commissionAmount=excluded.commissionAmount, amountWithCommission=excluded.amountWithCommission, remainingBalance=excluded.remainingBalance`,
            incomeId, userId, incomeData.date, incomeData.client, incomeData.brandName || "", incomeData.country, JSON.stringify(incomeData.servicesDetails), incomeData.amountPaid, incomeData.paymentAccount, incomeData.responsible, incomeData.observations || "", incomeData.dueDate || null, incomeData.status, incomeData.totalContractedAmount, incomeData.commissionRate, incomeData.commissionAmount, incomeData.amountWithCommission, incomeData.remainingBalance, new Date().toISOString()
        );

        // Update account balance
        const currentBalance = account.balance || 0;
        await db.run("UPDATE accounts SET balance = ? WHERE id = ?", currentBalance + amountWithCommission, values.paymentAccount);

        // Handle reminder
        await db.run("DELETE FROM reminders WHERE incomeId = ?", incomeId);
        const hasPlanServices = values.services.some(service => ['REDES', 'MONSTER HIVE'].includes(service));
        if (hasPlanServices && values.dueDate) {
            const renewalAmount = values.servicesDetails.filter(s => ['REDES', 'MONSTER HIVE'].includes(s.name)).reduce((sum, s) => sum + s.amount, 0);
            const reminderMessage = `Recordatorio de Renovación: El plan de ${values.client} vence el ${values.dueDate}. Monto: $${renewalAmount.toFixed(2)}.`;
            await db.run(
                `INSERT INTO reminders (id, userId, incomeId, clientId, brandName, service, renewalAmount, debtAmount, dueDate, status, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                incomeId, userId, incomeId, values.client, values.brandName || "", values.services.filter(s => ['REDES', 'MONSTER HIVE'].includes(s)).join(', '), renewalAmount, remainingBalance, values.dueDate, 'pending', reminderMessage, new Date().toISOString()
            );
        }

        await db.exec('COMMIT');
        return { success: true };
    } catch (error: any) {
        await db.exec('ROLLBACK');
        console.error("Error saving income:", error);
        return { success: false, message: error.message };
    }
}

export async function getIncomes(userId: string): Promise<Income[]> {
    const db = await assertDb();
    const incomes = await db.all<Income[]>("SELECT * FROM incomes WHERE userId = ?", userId);
    // Parsear servicesDetails de JSON string a objeto
    return incomes.map(income => ({
        ...income,
        servicesDetails: JSON.parse(income.servicesDetails as unknown as string)
    }));
}

export async function deleteIncome(userId: string, incomeToDelete: Income) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        // 1. Revertir el saldo de la cuenta
        const account = await db.get<Account>(
            "SELECT balance FROM accounts WHERE id = ? AND userId = ?",
            incomeToDelete.paymentAccount,
            userId
        );
        if (account) {
            const newBalance = account.balance - incomeToDelete.amountWithCommission;
            await db.run("UPDATE accounts SET balance = ? WHERE id = ?", newBalance, incomeToDelete.paymentAccount);
        }

        // 2. Eliminar el recordatorio asociado (si existe)
        // Usamos el ID del ingreso como ID del recordatorio
        await db.run("DELETE FROM reminders WHERE id = ? AND userId = ?", incomeToDelete.id, userId);

        // 3. Eliminar el ingreso
        await db.run("DELETE FROM incomes WHERE id = ? AND userId = ?", incomeToDelete.id, userId);

        await db.exec('COMMIT');
        return { success: true };

    } catch (error: any) {
        await db.exec('ROLLBACK');
        console.error("Error deleting income:", error);
        return { success: false, message: error.message };
    }
}

export async function markReminderAsResolved(userId: string, reminderId: string) {
    const db = await assertDb();
    try {
        await db.run("UPDATE reminders SET status = 'resolved', resolvedAt = ? WHERE id = ? AND userId = ?", 
            new Date().toISOString(), 
            reminderId, 
            userId
        );
        return { success: true };
    } catch (error: any) {
        console.error("Error resolving reminder:", error);
        return { success: false, message: error.message };
    }
}

export async function getIncomeForEdit(userId: string, incomeId: string): Promise<Income | null> {
    const db = await assertDb();
    const incomeData = await db.get<Income>("SELECT * FROM incomes WHERE id = ? AND userId = ?", incomeId, userId);
    if (!incomeData) return null;
    
    // SQLite almacena JSON como texto, hay que parsearlo
    return { ...incomeData, servicesDetails: JSON.parse(incomeData.servicesDetails as any) } as Income;
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
    const db = await assertDb();
    return db.all<Transaction[]>("SELECT * FROM transactions WHERE userId = ? ORDER BY timestamp DESC", userId);
}

export async function deleteTransaction(userId: string, transactionToDelete: Transaction) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        // Revertir cambios en las cuentas
        if (transactionToDelete.type === 'withdrawal' && transactionToDelete.account) {
            const account = await db.get<Account>("SELECT balance FROM accounts WHERE id = ?", transactionToDelete.account);
            if (account) {
                await db.run("UPDATE accounts SET balance = ? WHERE id = ?", account.balance + transactionToDelete.amount, transactionToDelete.account);
            }
        } else if (transactionToDelete.type === 'accountTransfer' && transactionToDelete.sourceAccount && transactionToDelete.destinationAccount) {
            const sourceAccount = await db.get<Account>("SELECT balance FROM accounts WHERE id = ?", transactionToDelete.sourceAccount);
            if (sourceAccount) {
                await db.run("UPDATE accounts SET balance = ? WHERE id = ?", sourceAccount.balance + transactionToDelete.amount, transactionToDelete.sourceAccount);
            }
            const destAccount = await db.get<Account>("SELECT balance FROM accounts WHERE id = ?", transactionToDelete.destinationAccount);
            if (destAccount) {
                await db.run("UPDATE accounts SET balance = ? WHERE id = ?", destAccount.balance - transactionToDelete.amount, transactionToDelete.destinationAccount);
            }
        }

        // Eliminar la transacción
        await db.run("DELETE FROM transactions WHERE id = ? AND userId = ?", transactionToDelete.id, userId);

        await db.exec('COMMIT');
        return { success: true };
    } catch (error: any) {
        await db.exec('ROLLBACK');
        console.error("Error deleting transaction:", error);
        return { success: false, message: error.message };
    }
}

export async function getAdminPayments(userId: string, filterCategory: string, searchTerm: string): Promise<AdminPayment[]> {
    const db = await assertDb();
    let sql = "SELECT * FROM adminPayments WHERE userId = ?";
    const params: any[] = [userId];

    if (filterCategory !== "Todos") {
      sql += " AND category = ?";
      params.push(filterCategory);
    }

    if (searchTerm) {
      sql += " AND (conceptName LIKE ? OR providerName LIKE ? OR contractNumber LIKE ?)";
      const term = `%${searchTerm.toLowerCase()}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY conceptName ASC";

    return db.all<AdminPayment[]>(sql, ...params);
}

export async function deleteAdminPayment(userId: string, paymentId: string) {
    const db = await assertDb();
    try {
        await db.run("DELETE FROM adminPayments WHERE id = ? AND userId = ?", paymentId, userId);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting admin payment:", error);
        return { success: false, message: error.message };
    }
}

export async function saveTransaction(
    userId: string,
    values: Omit<Transaction, 'timestamp'> & { id?: string },
    transactionToEdit?: Transaction | null
) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');

    try {
        // 1. Revertir la transacción anterior si se está editando
        if (transactionToEdit) {
            if (transactionToEdit.type === 'withdrawal' && transactionToEdit.account) {
                await db.run(
                    "UPDATE accounts SET balance = balance + ? WHERE id = ? AND userId = ?",
                    transactionToEdit.amount, transactionToEdit.account, userId
                );
            } else if (transactionToEdit.type === 'accountTransfer' && transactionToEdit.sourceAccount && transactionToEdit.destinationAccount) {
                await db.run(
                    "UPDATE accounts SET balance = balance + ? WHERE id = ? AND userId = ?",
                    transactionToEdit.amount, transactionToEdit.sourceAccount, userId
                );
                await db.run(
                    "UPDATE accounts SET balance = balance - ? WHERE id = ? AND userId = ?",
                    transactionToEdit.amount, transactionToEdit.destinationAccount, userId
                );
            }
        }

        // 2. Aplicar la nueva transacción
        if (values.type === 'withdrawal') {
            const account = await db.get("SELECT id FROM accounts WHERE id = ? AND userId = ?", values.account, userId);
            if (!account) throw new Error("La cuenta de retiro no existe.");
            await db.run(
                "UPDATE accounts SET balance = balance - ? WHERE id = ?",
                values.amount, values.account
            );
        } else if (values.type === 'accountTransfer') {
            const sourceAccount = await db.get("SELECT id FROM accounts WHERE id = ? AND userId = ?", values.sourceAccount, userId);
            const destAccount = await db.get("SELECT id FROM accounts WHERE id = ? AND userId = ?", values.destinationAccount, userId);
            if (!sourceAccount || !destAccount) throw new Error("Una de las cuentas para la transferencia no existe.");

            await db.run(
                "UPDATE accounts SET balance = balance - ? WHERE id = ?",
                values.amount, values.sourceAccount
            );
            await db.run(
                "UPDATE accounts SET balance = balance + ? WHERE id = ?",
                values.amount, values.destinationAccount
            );
        }

        // 3. Insertar o actualizar el registro de la transacción
        const transactionId = values.id || randomUUID();
        await db.run(
            `INSERT INTO transactions (id, userId, type, date, amount, account, sourceAccount, destinationAccount, observations, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             type=excluded.type, date=excluded.date, amount=excluded.amount, account=excluded.account, 
             sourceAccount=excluded.sourceAccount, destinationAccount=excluded.destinationAccount, observations=excluded.observations`,
            transactionId, userId, values.type, values.date, values.amount, values.account,
            values.sourceAccount, values.destinationAccount, values.observations, new Date().toISOString()
        );

        await db.exec('COMMIT');
        return { success: true };

    } catch (error: any) {
        await db.exec('ROLLBACK');
        console.error("Error saving transaction:", error);
        return { success: false, message: error.message };
    }
}

export async function getPayrollReportData(userId: string) {
    const db = await assertDb();
    const employees = await db.all<Employee[]>("SELECT * FROM employees WHERE userId = ?", userId).catch(() => []);
    const allPayments = await db.all<PayrollPayment[]>("SELECT * FROM payrollPayments WHERE userId = ?", userId).catch(() => []);
    return { employees, allPayments };
}

export async function saveAccount(
    userId: string,
    values: { name: string; balance: number; commission: number; type: "Efectivo" | "Digital" | "Bancario"; },
    editingAccountId?: string | null
) {
    const db = await assertDb();
    try {
        if (editingAccountId) {
            // When editing, we only update name, commission, and type. Balance is calculated.
            await db.run(
                "UPDATE accounts SET name = ?, commission = ?, type = ? WHERE id = ? AND userId = ?",
                values.name,
                values.commission / 100,
                values.type,
                editingAccountId,
                userId
            );
        } else {
            // When creating, we set all values.
            const newAccountId = randomUUID();
            await db.run(
                "INSERT INTO accounts (id, userId, name, balance, commission, type) VALUES (?, ?, ?, ?, ?, ?)",
                newAccountId,
                userId,
                values.name,
                values.balance,
                values.commission / 100,
                values.type
            );
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error saving account:", error);
        return { success: false, message: error.message };
    }
}

export async function deleteAccount(userId: string, accountId: string) {
    const db = await assertDb();
    try {
        // Note: This will fail if the account is referenced by incomes or expenses due to foreign key constraints.
        // A more robust solution would check for dependencies before deleting.
        await db.run("DELETE FROM accounts WHERE id = ? AND userId = ?", accountId, userId);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting account:", error);
        return { success: false, message: error.message };
    }
}

export async function saveAdminPayment(
    userId: string,
    values: any, // Using any as the form type is local to the component
    editingPaymentId?: string | null
) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        const docId = editingPaymentId || randomUUID();

        const existingData = editingPaymentId ? await db.get('SELECT createdAt FROM adminPayments WHERE id = ?', editingPaymentId) : null;

        const dataToSave = {
            ...values,
            paymentDueDate: values.paymentDueDate || null,
            renewalDate: values.renewalDate || null,
            createdAt: existingData?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // This assumes the adminPayments table exists and matches this structure.
        // You might need to add it to your `src/lib/schema.ts` if it's not there.
        await db.run(
            `INSERT INTO adminPayments (id, userId, conceptName, category, providerName, contractNumber, referenceNumber, providerId, paymentAmount, paymentCurrency, paymentFrequency, paymentDueDate, renewalDate, paymentMethod, beneficiaryBank, beneficiaryAccountNumber, beneficiaryAccountType, notes, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             conceptName=excluded.conceptName, category=excluded.category, providerName=excluded.providerName, contractNumber=excluded.contractNumber, referenceNumber=excluded.referenceNumber, providerId=excluded.providerId, paymentAmount=excluded.paymentAmount, paymentCurrency=excluded.paymentCurrency, paymentFrequency=excluded.paymentFrequency, paymentDueDate=excluded.paymentDueDate, renewalDate=excluded.renewalDate, paymentMethod=excluded.paymentMethod, beneficiaryBank=excluded.beneficiaryBank, beneficiaryAccountNumber=excluded.beneficiaryAccountNumber, beneficiaryAccountType=excluded.beneficiaryAccountType, notes=excluded.notes, updatedAt=excluded.updatedAt`,
            docId, userId, dataToSave.conceptName, dataToSave.category, dataToSave.providerName, dataToSave.contractNumber, dataToSave.referenceNumber, dataToSave.providerId, dataToSave.paymentAmount, dataToSave.paymentCurrency, dataToSave.paymentFrequency, dataToSave.paymentDueDate, dataToSave.renewalDate, dataToSave.paymentMethod, dataToSave.beneficiaryBank, dataToSave.beneficiaryAccountNumber, dataToSave.beneficiaryAccountType, dataToSave.notes, dataToSave.createdAt, dataToSave.updatedAt
        );

        // Handle reminder
        await db.run("DELETE FROM reminders WHERE adminPaymentId = ?", docId);
        if (dataToSave.paymentDueDate) {
            const reminderMessage = `Recordatorio de Pago: ${dataToSave.conceptName} vence el ${new Date(dataToSave.paymentDueDate).toLocaleDateString()}.`;
            await db.run(
                `INSERT INTO reminders (id, userId, adminPaymentId, clientId, brandName, service, renewalAmount, debtAmount, dueDate, status, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                docId, userId, docId, dataToSave.providerName, dataToSave.conceptName, dataToSave.category, dataToSave.paymentAmount || 0, 0, dataToSave.paymentDueDate, 'pending', reminderMessage, new Date().toISOString()
            );
        }

        await db.exec('COMMIT');
        return { success: true };

    } catch (error: any) {
        if (db) {
            await db.exec('ROLLBACK');
        }
        console.error("Error saving admin payment:", error);
        return { success: false, message: error.message };
    }
}

export async function getPayrollPageData(userId: string) {
    const db = await assertDb();
    // The .catch(() => []) is to prevent errors if the tables don't exist yet.
    const employees = await db.all<Employee[]>("SELECT * FROM employees WHERE userId = ?", userId).catch(() => []);
    const payments = await db.all<PayrollPayment[]>("SELECT * FROM payrollPayments WHERE userId = ?", userId).catch(() => []);
    const accounts = await db.all<Account[]>("SELECT * FROM accounts WHERE userId = ?", userId).catch(() => []);
    return { employees, payments, accounts };
}

export async function deleteEmployee(userId: string, employeeId: string) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        // Delete associated payments first
        await db.run("DELETE FROM payrollPayments WHERE employeeId = ? AND userId = ?", employeeId, userId);

        // Delete the employee
        await db.run("DELETE FROM employees WHERE id = ? AND userId = ?", employeeId, userId);

        await db.exec('COMMIT');
        return { success: true };
    } catch (error: any) {
        if (db) {
            await db.exec('ROLLBACK');
        }
        console.error("Error deleting employee:", error);
        return { success: false, message: error.message };
    }
}

export async function saveEmployee(
    userId: string,
    values: { name: string; cedula: string; phone: string; bank: string; paymentMethod?: string; biWeeklySalary: number; },
    editingEmployeeId?: string | null
) {
    const db = await assertDb();
    try {
        const docId = editingEmployeeId || randomUUID();
        const monthlySalary = values.biWeeklySalary * 2;
            
  
        // This assumes the employees table exists. It should be in schema.ts
        await db.run(
            `INSERT INTO employees (id, userId, name, cedula, phone, bank, biWeeklySalary, monthlySalary, paymentMethod)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             name=excluded.name, cedula=excluded.cedula, phone=excluded.phone, bank=excluded.bank, biWeeklySalary=excluded.biWeeklySalary, monthlySalary=excluded.monthlySalary, paymentMethod=excluded.paymentMethod`,
            docId,
            userId,
            values.name,
            values.cedula,
            values.phone,
            values.bank,
            values.paymentMethod,
            values.biWeeklySalary,
            monthlySalary,
        );
        return { success: true };
    } catch (error: any) {
        console.error("Error saving employee:", error);
        return { success: false, message: error.message };
    }
}

export async function savePayrollPayment(
    userId: string,
    employee: any, // Employee type from lib/types
    paymentType: '4th' | '20th' | 'bonus',
    selectedDate: { month: number; year: number },
    values: {
        date: string;
        totalAmount: number;
        paymentAccount: string;
        observations?: string;
    }
) {
    const db = await assertDb();
    await db.exec('BEGIN TRANSACTION');
    try {
        // 1. Create Payroll Payment Record
        const paymentId = randomUUID();
        await db.run(
            `INSERT INTO payrollPayments (id, userId, employeeId, employeeName, paymentType, month, year, totalAmount, date, observations, timestamp, paymentAccount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            paymentId, userId, employee.id, employee.name, paymentType, selectedDate.month, selectedDate.year,
            values.totalAmount, values.date, values.observations || "", new Date().toISOString(), values.paymentAccount
        );

        // 2. Create corresponding Expense record
        const expenseId = randomUUID();
        await db.run(
            `INSERT INTO expenses (id, userId, date, type, category, amount, paymentAccount, responsible, observations, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            expenseId, userId, values.date, 'fijo', 'Nómina', values.totalAmount, values.paymentAccount,
            'Sistema', values.observations || `Pago de nómina a ${employee.name}. Ref: ${paymentId}`, new Date().toISOString()
        );

        // 3. Update Account Balance
        const account = await db.get<Account>(
            "SELECT balance FROM accounts WHERE id = ? AND userId = ?",
            values.paymentAccount,
            userId
        );
        if (!account) {
            throw new Error("La cuenta de pago no existe.");
        }
        const newBalance = account.balance - values.totalAmount;
        await db.run("UPDATE accounts SET balance = ? WHERE id = ?", newBalance, values.paymentAccount);

        await db.exec('COMMIT');
        return { success: true };

    } catch (error: any) {
        if (db) {
            await db.exec('ROLLBACK');
        }
        console.error("Error saving payroll payment:", error);
        return { success: false, message: error.message };
    }
}

export async function saveClientPayment(
    userId: string,
    clientName: string,
    date: string,
    amount: number,
    account?: string,
    incomeIds?: string[]
) {
    const db = await assertDb();
    try {
        const id = randomUUID();
        await db.run(
            `INSERT INTO clientPayments (id, userId, clientName, date, amount, account, incomeIds, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            id, userId, clientName, date, amount, account || null, incomeIds ? JSON.stringify(incomeIds) : null, new Date().toISOString()
        );
        console.log(`Saved clientPayment ${id} for client=${clientName} amount=${amount}`);
        return { success: true };
    } catch (error: any) {
        console.error('Error saving client payment:', error);
        return { success: false, message: error.message };
    }
}

export async function getClientPayments(userId: string): Promise<any[]> {
    const db = await assertDb();
    try {
        const rows = await db.all<any[]>("SELECT * FROM clientPayments WHERE userId = ? ORDER BY timestamp DESC", userId);
        const mapped = rows.map(r => ({ ...r, incomeIds: r.incomeIds ? JSON.parse(r.incomeIds) : [] }));
        console.log(`Fetched ${mapped.length} clientPayments for user ${userId}`);
        return mapped;
    } catch (error: any) {
        console.error('Error fetching client payments:', error);
        return [];
    }
}