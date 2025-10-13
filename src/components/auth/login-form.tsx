
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { saveUserProfile } from "@/lib/actions/user.actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(2, { message: "El nombre es requerido." }),
  email: z.string().email({ message: "Por favor ingresa un email válido." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { userProfile, isAuthReady, loading: authLoading, userId, configError } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const { formState: { isSubmitting } } = form;

  useEffect(() => {
    if (isAuthReady && userProfile) {
      router.replace("/dashboard");
    }
  }, [isAuthReady, userProfile, router]);
  
  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || "",
        email: userProfile.email || "",
      });
    }
  }, [userProfile, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Double check userId is present before submitting
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Error de Autenticación",
        description: "Sesión de usuario no encontrada. Por favor, espera un momento y vuelve a intentarlo.",
      });
      return;
    }

    const result = await saveUserProfile({ userId, ...values });

    if (result.success) {
      toast({
        title: "¡Perfil Guardado!",
        description: "Bienvenido a MonsterFinance.",
      });
      router.push("/dashboard");
    } else {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: result.message,
      });
    }
  }

  const isLoading = isSubmitting || authLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Nombre</FormLabel>
              <FormControl>
                <Input
                  placeholder="Tu nombre completo"
                  className="w-full p-3 border border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-gray-700 text-gray-100"
                  {...field}
                  disabled={isLoading}
                />
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
              <FormLabel className="text-gray-300">Correo Electrónico</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  className="w-full p-3 border border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-gray-700 text-gray-100"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full p-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition duration-300"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {authLoading ? 'Inicializando...' : 'Guardando...'}
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
    </Form>
  );
}
