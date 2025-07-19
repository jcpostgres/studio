
"use server";

import { doc, writeBatch, collection, getDoc } from "firebase/firestore";
import { z } from "zod";
import { suggestExpenseCategories } from "@/ai/flows/suggest-expense-categories";
import { db } from "@/lib/firebase";

export async function suggestCategories(description: string) {
  if (!description) {
    return { success: false, message: "La descripción no puede estar vacía.", categories: null };
  }

  try {
    const result = await suggestExpenseCategories({ expenseDescription: description });
    return { success: true, message: "Sugerencias obtenidas.", categories: result.suggestedCategories };
  } catch (error) {
    console.error("Error obteniendo sugerencias de categorías:", error);
    return { success: false, message: "Falló la obtención de sugerencias de la IA.", categories: null };
  }
}

const expenseFormSchema = z.object({
  date: z.string().min(1, "La fecha es requerida."),
  type: z.enum(["fijo", "variable"]),
  category: z.string().min(2, "La categoría es requerida."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  paymentAccount: z.string().min(1, "La cuenta de pago es requerida."),
  responsible: z.string().optional(),
  observations: z.string().optional(),
});

interface SaveExpenseParams {
  userId: string;
  expenseData: z.infer<typeof expenseFormSchema>;
}

export async function saveExpense({ userId, expenseData }: SaveExpenseParams) {
  try {
    const validatedData = expenseFormSchema.parse(expenseData);
    
    const batch = writeBatch(db);

    // 1. Create the new expense document
    const expenseRef = doc(collection(db, `users/${userId}/expenses`));
    const finalExpenseData = {
      ...validatedData,
      timestamp: new Date().toISOString(),
    };
    batch.set(expenseRef, finalExpenseData);

    // 2. Update the account balance
    const accountRef = doc(db, `users/${userId}/accounts`, validatedData.paymentAccount);
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
      return { success: false, message: "La cuenta de pago no existe." };
    }
    const currentBalance = accountSnap.data()?.balance || 0;
    batch.update(accountRef, {
        balance: currentBalance - validatedData.amount
    });

    await batch.commit();
    return { success: true, message: "Gasto registrado correctamente." };

  } catch (error) {
    console.error("Error al guardar el gasto:", error);
    const errorMessage = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : "No se pudo guardar el gasto.";
    return { success: false, message: errorMessage };
  }
}
