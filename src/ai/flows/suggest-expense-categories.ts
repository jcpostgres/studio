'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting expense categories
 * based on a description provided by the user. This helps users quickly and accurately
 * classify their expenses.
 *
 * @remarks
 * - suggestExpenseCategories - A function that takes an expense description and returns suggested categories.
 * - SuggestExpenseCategoriesInput - The input type for the suggestExpenseCategories function.
 * - SuggestExpenseCategoriesOutput - The return type for the suggestExpenseCategories function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestExpenseCategoriesInputSchema = z.object({
  expenseDescription: z
    .string()
    .describe('A description of the uncategorized expense.'),
});
export type SuggestExpenseCategoriesInput = z.infer<typeof SuggestExpenseCategoriesInputSchema>;

const SuggestExpenseCategoriesOutputSchema = z.object({
  suggestedCategories: z
    .array(z.string())
    .describe('An array of suggested expense categories based on the description.'),
});
export type SuggestExpenseCategoriesOutput = z.infer<typeof SuggestExpenseCategoriesOutputSchema>;

export async function suggestExpenseCategories(
  input: SuggestExpenseCategoriesInput
): Promise<SuggestExpenseCategoriesOutput> {
  return suggestExpenseCategoriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestExpenseCategoriesPrompt',
  input: {schema: SuggestExpenseCategoriesInputSchema},
  output: {schema: SuggestExpenseCategoriesOutputSchema},
  prompt: `Given the following expense description, suggest three appropriate expense categories:

Expense Description: {{{expenseDescription}}}

Categories:`, 
  config: {
    // added safety settings to reduce the likelihood of harmful content
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const suggestExpenseCategoriesFlow = ai.defineFlow(
  {
    name: 'suggestExpenseCategoriesFlow',
    inputSchema: SuggestExpenseCategoriesInputSchema,
    outputSchema: SuggestExpenseCategoriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
