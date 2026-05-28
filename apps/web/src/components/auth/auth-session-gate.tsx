"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type GateState = "loading" | "unauthenticated";

function isTrue(value: string | null): boolean {
  return value === "1" || value === "true";
}

export function AuthSessionGate() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<GateState>("loading");

  useEffect(() => {
    const timer = setTimeout(() => {
      const authenticated = isTrue(searchParams.get("authenticated"));
      const profileCompleted = isTrue(searchParams.get("profileCompleted"));
      const consentRequired = isTrue(searchParams.get("consentRequired"));

      if (!authenticated) {
        setState("unauthenticated");
        return;
      }

      if (profileCompleted && !consentRequired) {
        router.replace("/dashboard");
        return;
      }

      router.replace("/auth/complete-profile");
    }, 900);

    return () => clearTimeout(timer);
  }, [router, searchParams]);

  if (state === "loading") {
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

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6">
      <h1 className="text-xl font-semibold uppercase tracking-[0.06em]">
        Сессия не найдена
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Вы не авторизованы. Начните вход через Telegram снова.
      </p>
      <Link
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-[#5e1414]"
        href="/auth/login"
      >
        Перейти к входу
      </Link>
    </section>
  );
}
