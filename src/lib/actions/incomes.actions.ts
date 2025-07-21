
"use server";

import { doc, setDoc, addDoc, collection, writeBatch, getDoc, updateDoc, deleteDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { Income, Reminder } from "@/lib/types";

const serviceDetailSchema = z.object({
  name: z.string(),
  amount: z.coerce.number().min(0, "El monto no puede ser negativo."),
});

const incomeFormSchema = z.object({
  date: z.string().min(1),
  client: z.string().min(2),
  brandName: z.string().optional(),
  country: z.string().min(1),
  services: z.array(z.string()).min(1),
  servicesDetails: z.array(serviceDetailSchema),
  amountPaid: z.coerce.number().min(0),
  paymentAccount: z.string().min(1),
  responsible: z.string().min(1),
  observations: z.string().optional(),
  dueDate: z.string().optional().or(z.literal('')),
  status: z.enum(["active", "cancelled"]),
});

interface SaveIncomeParams {
  userId: string;
  incomeData: z.infer<typeof incomeFormSchema>;
  incomeId?: string | null;
  previousIncomeData?: Income | null;
}

const servicesRequiringDueDate = ['REDES', 'MONSTER HIVE'];

export async function saveIncome({ userId, incomeData, incomeId, previousIncomeData }: SaveIncomeParams) {
  try {
    const validatedData = incomeFormSchema.parse(incomeData);
    
    const accountRef = doc(db, `users/${userId}/accounts`, validatedData.paymentAccount);
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
        return { success: false, message: "La cuenta de pago seleccionada no existe." };
    }
    const accountCommission = accountSnap.data()?.commission || 0;

    const totalContractedAmount = validatedData.servicesDetails.reduce((sum, service) => sum + service.amount, 0);
    const commissionAmount = validatedData.amountPaid * accountCommission;
    const amountWithCommission = validatedData.amountPaid - commissionAmount;
    const remainingBalance = totalContractedAmount - validatedData.amountPaid;

    const finalIncomeDataObject: Omit<Income, 'id'> = {
      ...validatedData,
      totalContractedAmount,
      commissionRate: accountCommission,
      commissionAmount,
      amountWithCommission,
      remainingBalance,
      timestamp: new Date().toISOString(),
      dueDate: validatedData.dueDate || null,
    };
    
    // Remove empty optional fields so Firestore doesn't store them as null
    if (!finalIncomeDataObject.brandName) delete (finalIncomeDataObject as any).brandName;
    if (!finalIncomeDataObject.observations) delete (finalIncomeDataObject as any).observations;
    if (!finalIncomeDataObject.dueDate) finalIncomeDataObject.dueDate = null;


    const batch = writeBatch(db);

    let docRef;
    if (incomeId && previousIncomeData) {
        // ---- UPDATE LOGIC ----
        docRef = doc(db, `users/${userId}/incomes`, incomeId);
        
        // 1. Revert old balance
        const prevAccountRef = doc(db, `users/${userId}/accounts`, previousIncomeData.paymentAccount);
        const prevAccountSnap = await getDoc(prevAccountRef);
        if (prevAccountSnap.exists()) {
            batch.update(prevAccountRef, {
                balance: (prevAccountSnap.data()?.balance || 0) - previousIncomeData.amountWithCommission
            });
        }

        // 2. Apply new balance
        batch.update(accountRef, {
            balance: (accountSnap.data()?.balance || 0) + amountWithCommission
        });

        // 3. Update income
        batch.set(docRef, finalIncomeDataObject);

    } else {
        // ---- CREATE LOGIC ----
        docRef = doc(collection(db, `users/${userId}/incomes`));
        
        // 1. Apply balance
        batch.update(accountRef, {
            balance: (accountSnap.data()?.balance || 0) + amountWithCommission
        });

        // 2. Create income
        batch.set(docRef, finalIncomeDataObject);
    }
    
    const newIncomeId = docRef.id;

    // ---- REMINDER LOGIC ----
    const hasPlanServices = finalIncomeDataObject.services.some(service => servicesRequiringDueDate.includes(service));
    
    if (hasPlanServices && finalIncomeDataObject.dueDate) {
        const renewalAmount = finalIncomeDataObject.servicesDetails
            .filter(s => servicesRequiringDueDate.includes(s.name))
            .reduce((sum, s) => sum + s.amount, 0);

        const reminderMessage = `Recordatorio de Renovación: El plan de ${finalIncomeDataObject.client} vence el ${finalIncomeDataObject.dueDate}. Monto: $${renewalAmount.toFixed(2)}.`;
        
        const reminderData: Omit<Reminder, 'id'> = {
            incomeId: newIncomeId,
            clientId: finalIncomeDataObject.client,
            brandName: finalIncomeDataObject.brandName || "",
            service: finalIncomeDataObject.services.filter(s => servicesRequiringDueDate.includes(s)).join(', '),
            renewalAmount: renewalAmount,
            debtAmount: finalIncomeDataObject.remainingBalance,
            dueDate: finalIncomeDataObject.dueDate,
            status: 'pending',
            contact: '', // To be filled later
            message: reminderMessage,
            timestamp: new Date().toISOString(),
            resolvedAt: null,
        };

        const reminderRef = doc(db, `users/${userId}/reminders`, newIncomeId);
        batch.set(reminderRef, reminderData, { merge: true });
    }

    await batch.commit();

    return { success: true, message: incomeId ? "Ingreso actualizado correctamente." : "Ingreso registrado correctamente." };

  } catch (error) {
    console.error("Error saving income:", error);
    const errorMessage = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : "No se pudo guardar el ingreso.";
    return { success: false, message: errorMessage };
  }
}
