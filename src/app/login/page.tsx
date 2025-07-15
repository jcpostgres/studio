import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-16 w-16 text-primary">
              <path d="M12 12c-2 0-2-2-2-2s0-2 2-2 2 2 2 2-2 2-2 2z"/>
              <path d="M12 12c2 0 2-2 2-2s0-2-2-2-2 2-2 2 2 2 2 2z"/>
              <path d="M12 12v4c0 2-2 2-2 2s-2-2-2-2v-4"/>
              <path d="M12 12v4c0 2 2 2 2 2s2-2 2-2v-4"/>
              <path d="M6 12H4c-1 0-2 1-2 2v2c0 1 1 2 2 2h2"/>
              <path d="M18 12h2c1 0 2 1 2 2v2c0 1-1 2-2 2h-2"/>
            </svg>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-cyan-400">
            Bienvenido a MonsterFinance
          </h1>
          <p className="mt-2 text-gray-400">
            Ingresa tus datos para empezar a dominar tus finanzas.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
