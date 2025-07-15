import { LoginForm } from "@/components/auth/login-form";

const MonsterIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8 text-primary"
    >
      <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M9 9h0" />
      <path d="M15 9h0" />
      <path d="M9 14h6" />
    </svg>
);


export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                 <MonsterIcon />
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
