
"use server";

import { doc, writeBatch, collection, getDoc } from "firebase/firestore";
import { z } from "zod";
import { suggestExpenseCategories } from "@/ai/flows/suggest-expense-categories";
import { db } from "@/lib/firebase";
import { Expense } from "@/lib/types";

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
