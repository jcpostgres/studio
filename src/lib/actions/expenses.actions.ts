"use server";

import { suggestExpenseCategories } from "@/ai/flows/suggest-expense-categories";

export async function suggestCategories(description: string) {
  if (!description) {
    return { success: false, message: "Description cannot be empty.", categories: null };
  }

  try {
    const result = await suggestExpenseCategories({ expenseDescription: description });
    return { success: true, message: "Suggestions fetched.", categories: result.suggestedCategories };
  } catch (error) {
    console.error("Error fetching category suggestions:", error);
    return { success: false, message: "Failed to get suggestions from AI.", categories: null };
  }
}
