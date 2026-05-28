import { AuthSessionGate } from "@/components/auth/auth-session-gate";
import { Suspense } from "react";

function AuthSessionFallback() {
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
      <p className="page-eyebrow">Шаг 2 из 2</p>
      <h1 className="text-xl font-semibold uppercase tracking-[0.06em]">
        Проверяем вход...
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Определяем, нужно ли завершить профиль и обязательные согласия.
      </p>
    </section>
  );
}

export default function AuthSessionPage() {
  return (
    <Suspense fallback={<AuthSessionFallback />}>
      <AuthSessionGate />
    </Suspense>
  );
}
