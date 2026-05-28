"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { ApiRequestError, apiRequest } from "@/lib/api-client";
import { extractRolesFromSearchParams, hasAdminRouteAccess } from "@/lib/role-access";

type AdminGateState =
  | "loading"
  | "allowed"
  | "unauthenticated"
  | "forbidden"
  | "error";

type AuthSession = {
  roles?: string[];
};

function isTrue(value: string | null): boolean {
  return value === "1" || value === "true";
}

function buildDemoDecision(searchParams: URLSearchParams): AdminGateState {
  const isAuthenticated = isTrue(searchParams.get("authenticated"));
  if (!isAuthenticated) {
    return "unauthenticated";
  }

  const roles = extractRolesFromSearchParams(searchParams);
  return hasAdminRouteAccess(roles) ? "allowed" : "forbidden";
}

export function AdminRouteGate({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AdminGateState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);
  const searchParamsText = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    let active = true;

    async function resolveAccess(): Promise<void> {
      setState("loading");
      setErrorMessage("");

      try {
        const session = await apiRequest<AuthSession>("/auth/me");
        const sessionRoles = Array.isArray(session.roles) ? session.roles : [];

        if (!active) {
          return;
        }

        setState(hasAdminRouteAccess(sessionRoles) ? "allowed" : "forbidden");
      } catch (error) {
        if (!active) {
          return;
        }

        if (error instanceof ApiRequestError) {
          if (error.status === 401) {
            setState("unauthenticated");
            return;
          }

          if (error.status === 404) {
            const demoState = buildDemoDecision(new URLSearchParams(searchParamsText));
            setState(demoState);
            return;
          }

          setState("error");
          setErrorMessage(error.message);
          return;
        }

        setState("error");
        setErrorMessage("Не удалось проверить доступ к админ-панели.");
      }
    }

    void resolveAccess();

    return () => {
      active = false;
    };
  }, [reloadKey, searchParamsText]);

  if (state === "loading") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="page-eyebrow">Операционная зона</p>
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Админ-панель
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Проверяем права доступа...
        </p>
      </section>
    );
  }

  if (state === "unauthenticated") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Доступ ограничен
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Для входа в админ-панель требуется активная сессия.
        </p>
        <Link
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-[#5e1414]"
          href="/auth/login"
        >
          Перейти ко входу
        </Link>
      </section>
    );
  }

  if (state === "forbidden") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Недостаточно прав
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Этот раздел доступен только администраторам и владельцу клуба.
        </p>
      </section>
    );
  }

  if (state === "error") {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold uppercase tracking-[0.05em]">
          Ошибка проверки доступа
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage || "Повторите попытку позже."}
        </p>
        <button
          className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          onClick={() => setReloadKey((previous) => previous + 1)}
          type="button"
        >
          Повторить
        </button>
      </section>
    );
  }

  return <>{children}</>;
}
