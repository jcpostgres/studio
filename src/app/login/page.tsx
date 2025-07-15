import { LoginForm } from "@/components/auth/login-form";
import { Coins } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                 <Coins className="h-8 w-8 text-primary" />
            </div>
          <h1 className="text-4xl font-bold text-primary">MonsterFinance</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome! Enter your details to get started.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
