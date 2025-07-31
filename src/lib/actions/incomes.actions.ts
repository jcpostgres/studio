
"use server";

import { doc, writeBatch, collection, getDoc, } from "firebase/firestore";
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
  // Use transform to handle empty string case for an optional date
  dueDate: z.string().optional().transform(val => val || null),
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
    const accountData = accountSnap.data();
    const accountCommission = accountData.commission || 0;

    const totalContractedAmount = validatedData.servicesDetails.reduce((sum, service) => sum + service.amount, 0);
    const commissionAmount = validatedData.amountPaid * accountCommission;
    const amountWithCommission = validatedData.amountPaid - commissionAmount;
    const remainingBalance = totalContractedAmount - validatedData.amountPaid;

    const finalIncomeDataObject: Omit<Income, 'id'> = {
      date: validatedData.date,
      client: validatedData.client,
      brandName: validatedData.brandName || "",
      country: validatedData.country,
      services: validatedData.services,
      servicesDetails: validatedData.servicesDetails,
      paymentAccount: validatedData.paymentAccount,
      responsible: validatedData.responsible,
      observations: validatedData.observations || "",
      amountPaid: validatedData.amountPaid,
      totalContractedAmount,
      commissionRate: accountCommission,
      commissionAmount,
      amountWithCommission,
      remainingBalance,
      timestamp: new Date().toISOString(),
      dueDate: validatedData.dueDate, // Already transformed to string | null
      status: validatedData.status,
    };

    const batch = writeBatch(db);

    let docRef;
    // --- EDITING EXISTING INCOME ---
    if (incomeId && previousIncomeData) {
        docRef = doc(db, `users/${userId}/incomes`, incomeId);
        
        // --- REVERT PREVIOUS TRANSACTION ---
        const prevAccountRef = doc(db, `users/${userId}/accounts`, previousIncomeData.paymentAccount);
        const prevAccountSnap = await getDoc(prevAccountRef);

        if (prevAccountSnap.exists()) {
            const prevBalance = prevAccountSnap.data().balance || 0;
            batch.update(prevAccountRef, {
                balance: prevBalance - previousIncomeData.amountWithCommission
            });
        }
        
        // --- APPLY NEW TRANSACTION ---
        // Note: We refetch the account data in case the previous tx was on the same account
        const currentAccountSnap = await getDoc(accountRef); 
        const currentBalance = currentAccountSnap.data()?.balance || 0;
        const balanceAfterRevert = (previousIncomeData.paymentAccount === validatedData.paymentAccount) 
            ? currentBalance - previousIncomeData.amountWithCommission
            : currentBalance;

        batch.update(accountRef, {
            balance: balanceAfterRevert + amountWithCommission
        });
        
        batch.set(docRef, finalIncomeDataObject);

    } else {
    // --- CREATING NEW INCOME ---
        docRef = doc(collection(db, `users/${userId}/incomes`));
        
        const currentBalance = accountData.balance || 0;
        batch.update(accountRef, {
            balance: currentBalance + amountWithCommission
        });

        batch.set(docRef, finalIncomeDataObject);
    }
    
    const newIncomeId = docRef.id;

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
            contact: '', 
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
