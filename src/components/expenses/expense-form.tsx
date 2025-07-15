"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { suggestCategories } from "@/lib/actions/expenses.actions";

const formSchema = z.object({
  description: z
    .string()
    .min(3, { message: "Description must be at least 3 characters." }),
  category: z
    .string()
    .min(2, { message: "Category must be at least 2 characters." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
});

export function ExpenseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      category: "",
      amount: 0,
    },
  });

  const handleSuggestCategories = async () => {
    const description = form.getValues("description");
    if (!description || description.length < 3) {
      toast({
        variant: "destructive",
        title: "Description too short",
        description: "Please enter a longer description to get suggestions.",
      });
      return;
    }

    setIsSuggesting(true);
    setSuggestions([]);
    try {
      const result = await suggestCategories(description);
      if (result.success && result.categories) {
        setSuggestions(result.categories);
      } else {
        toast({
          variant: "destructive",
          title: "Suggestion Failed",
          description: result.message,
        });
      }
    } catch (error) {
       toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred.",
        });
    } finally {
        setIsSuggesting(false);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    // Here you would typically call a server action to save the expense
    console.log(values);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    toast({
      title: "Expense Saved!",
      description: `"${values.description}" has been recorded.`,
    });
    setIsLoading(false);
    router.push("/dashboard/expenses");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Monthly software subscription" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Category</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestCategories} disabled={isSuggesting}>
                   {isSuggesting ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                     <Sparkles className="mr-2 h-4 w-4" />
                   )}
                  Suggest
                </Button>
              </div>
              <FormControl>
                <Input placeholder="e.g., Software" {...field} />
              </FormControl>
              <FormMessage />
              {suggestions.length > 0 && (
                <FormDescription>
                  AI Suggestions:
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                        <Button type="button" key={i} variant="secondary" size="sm" onClick={() => form.setValue('category', s, { shouldValidate: true })}>
                            {s}
                        </Button>
                    ))}
                  </div>
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="0.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
            </>
          ) : (
            "Save Expense"
          )}
        </Button>
      </form>
    </Form>
  );
}
