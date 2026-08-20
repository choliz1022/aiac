import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12">
      <Suspense fallback={<div className="text-sm text-zinc-600">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
