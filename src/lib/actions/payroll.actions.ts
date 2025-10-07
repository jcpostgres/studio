
"use server";

import { doc, setDoc, deleteDoc, writeBatch, collection, getDocs, query, where, getDoc } from "firebase/firestore";
import { assertDb } from "@/lib/firebase";
import { z } from "zod";
import type { Employee, PayrollPayment, Expense } from "@/lib/types";

// --- Employee Actions ---

const employeeSchema = z.object({
    name: z.string().min(2, "El nombre es requerido."),
    cedula: z.string().min(6, "La cédula es requerida."),
    phone: z.string().min(7, "El teléfono es requerido."),
    bank: z.string().min(2, "El banco es requerido."),
    paymentMethod: z.string().min(2, "El método de pago es requerido."),
    biWeeklySalary: z.coerce.number().positive("El salario quincenal debe ser positivo."),
});

interface SaveEmployeeParams {
    userId: string;
    employeeData: z.infer<typeof employeeSchema>;
    employeeId?: string;
}

export async function saveEmployee({ userId, employeeData, employeeId }: SaveEmployeeParams) {
    try {
        const validatedData = employeeSchema.parse(employeeData);
        
        const docRef = employeeId
            ? doc(assertDb(), `users/${userId}/employees`, employeeId)
            : doc(collection(assertDb(), `users/${userId}/employees`));

        const dataToSave: Omit<Employee, 'id'> = {
            ...validatedData,
            monthlySalary: validatedData.biWeeklySalary * 2,
        };

        await setDoc(docRef, dataToSave, { merge: true });

        return { success: true, message: employeeId ? "Empleado actualizado." : "Empleado creado." };
    } catch (error) {
        console.error("Error saving employee:", error);
        return { success: false, message: "No se pudo guardar el empleado." };
    }
}

interface DeleteEmployeeParams {
    userId: string;
    employeeId: string;
}

export async function deleteEmployee({ userId, employeeId }: DeleteEmployeeParams) {
    try {
    const batch = writeBatch(assertDb());
        
    const employeeRef = doc(assertDb(), `users/${userId}/employees`, employeeId);
        batch.delete(employeeRef);

    const paymentsQuery = query(collection(assertDb(), `users/${userId}/payrollPayments`), where("employeeId", "==", employeeId));
        const paymentsSnap = await getDocs(paymentsQuery);
        paymentsSnap.forEach(doc => batch.delete(doc.ref));

        await batch.commit();

        return { success: true, message: "Empleado y sus pagos han sido eliminados." };
    } catch (error) {
        console.error("Error deleting employee:", error);
        return { success: false, message: "No se pudo eliminar al empleado." };
    }
}


// --- Payroll Payment Actions ---

const payrollPaymentSchema = z.object({
    date: z.string().min(1, "La fecha es requerida."),
    totalAmount: z.coerce.number().positive("El monto debe ser positivo."),
    paymentAccount: z.string().min(1, "La cuenta de pago es requerida."),
    observations: z.string().optional(),
});

interface SavePayrollPaymentParams {
    userId: string;
    paymentData: z.infer<typeof payrollPaymentSchema>;
    employeeId: string;
    employeeName: string;
    paymentType: '4th' | '20th' | 'bonus';
    month: number;
    year: number;
}

export async function savePayrollPayment(params: SavePayrollPaymentParams) {
    const { userId, paymentData, employeeId, employeeName, paymentType, month, year } = params;
    try {
        const validatedData = payrollPaymentSchema.parse(paymentData);
    const batch = writeBatch(assertDb());

        // 1. Create Payroll Payment Record
    const paymentRef = doc(collection(assertDb(), `users/${userId}/payrollPayments`));
        const paymentToSave: Omit<PayrollPayment, 'id'> = {
            employeeId,
            employeeName,
            paymentType,
            month,
            year,
            totalAmount: validatedData.totalAmount,
            date: validatedData.date,
            observations: validatedData.observations || "",
            timestamp: new Date().toISOString(),
            paymentAccount: validatedData.paymentAccount,
        };
        batch.set(paymentRef, paymentToSave);

        // 2. Create corresponding Expense record
    const expenseRef = doc(collection(assertDb(), `users/${userId}/expenses`));
        const expenseToSave: Omit<Expense, 'id'> = {
            date: validatedData.date,
            type: 'fijo',
            category: 'Nómina',
            amount: validatedData.totalAmount,
            paymentAccount: validatedData.paymentAccount,
            responsible: 'Sistema',
            observations: `Pago de nómina a ${employeeName}. Ref: ${paymentRef.id}`,
            timestamp: new Date().toISOString(),
        };
        batch.set(expenseRef, expenseToSave);

        // 3. Update Account Balance
    const accountRef = doc(assertDb(), `users/${userId}/accounts`, validatedData.paymentAccount);
    const accountSnap = await getDoc(accountRef);
        if (!accountSnap.exists()) {
            throw new Error("La cuenta de pago no existe.");
        }
        const newBalance = accountSnap.data().balance - validatedData.totalAmount;
        batch.update(accountRef, { balance: newBalance });

        await batch.commit();

        return { success: true, message: "Pago de nómina registrado como gasto exitosamente." };
    } catch (error) {
        console.error("Error saving payroll payment:", error);
        return { success: false, message: "No se pudo registrar el pago." };
    }
}
