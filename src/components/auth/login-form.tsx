"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { saveUserProfile } from "@/lib/actions/user.actions";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
});

export function LoginForm() {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "User ID not found. Please wait a moment and try again.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await saveUserProfile({
        userId: userId,
        name: values.name,
        email: values.email,
      });
      toast({
        title: "Success!",
        description: "Your profile has been saved.",
      });
      router.push("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save your profile. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const isButtonDisabled = isSubmitting || authLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isButtonDisabled}>
          {authLoading ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
            </>
          ) : isSubmitting ? (
             <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
            </>
          ) : (
            "Enter"
          )}
        </Button>
      </form>
    </Form>
  );
}
