"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

import {
  requiredConsentDocuments,
  type RequiredConsentId
} from "@/content/auth-flow";

type FormState = {
  displayName: string;
  email: string;
  phone: string;
};

const initialFormState: FormState = {
  displayName: "",
  phone: "",
  email: ""
};

export function ProfileCompletionForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [accepted, setAccepted] = useState<Record<RequiredConsentId, boolean>>({
    privacy_policy: false,
    personal_data_consent: false
  });
  const [touched, setTouched] = useState(false);

  const missingRequiredConsents = useMemo(
    () =>
      requiredConsentDocuments
        .filter((document) => !accepted[document.id])
        .map((document) => document.label),
    [accepted]
  );

  const isPhoneValid = /^\+?[0-9\s()-]{10,20}$/.test(form.phone.trim());
  const canSubmit =
    form.displayName.trim().length > 1 &&
    isPhoneValid &&
    missingRequiredConsents.length === 0;

  function handleConsentToggle(consentId: RequiredConsentId): void {
    setAccepted((previous) => ({
      ...previous,
      [consentId]: !previous[consentId]
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setTouched(true);

    if (!canSubmit) {
      return;
    }

    router.push("/dashboard?onboarding=complete");
  }

  return (
    <form
      className="mx-auto max-w-xl space-y-6 rounded-xl border border-border bg-card p-6"
      onSubmit={handleSubmit}
    >
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Завершите профиль</h1>
        <p className="text-sm text-muted-foreground">
          Для завершения регистрации нужны контактные данные и обязательные
          согласия.
        </p>
      </header>

      <div className="space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Имя для профиля</span>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              setForm((previous) => ({ ...previous, displayName: event.target.value }))
            }
            placeholder="Например, Иван"
            value={form.displayName}
          />
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Телефон для экстренной связи</span>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              setForm((previous) => ({ ...previous, phone: event.target.value }))
            }
            placeholder="+7 900 000-00-00"
            value={form.phone}
          />
          <span className="text-xs text-muted-foreground">
            Телефон обязателен перед реальным бронированием.
          </span>
        </label>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Email (необязательно)</span>
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(event) =>
              setForm((previous) => ({ ...previous, email: event.target.value }))
            }
            placeholder="name@example.com"
            type="email"
            value={form.email}
          />
        </label>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-border/80 p-4">
        <legend className="px-1 text-sm font-medium">Обязательные согласия</legend>
        {requiredConsentDocuments.map((document) => (
          <label className="flex items-start gap-3 text-sm" key={document.id}>
            <input
              checked={accepted[document.id]}
              className="mt-1 h-4 w-4 rounded border-input bg-background"
              onChange={() => handleConsentToggle(document.id)}
              type="checkbox"
            />
            <span>
              {document.label} (
              <Link className="underline underline-offset-4" href={document.href}>
                читать
              </Link>
              )
            </span>
          </label>
        ))}
      </fieldset>

      {touched && !canSubmit ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
          {!isPhoneValid ? "Проверьте формат телефона." : null}
          {missingRequiredConsents.length > 0 ? (
            <p>
              Регистрация заблокирована, пока не приняты обязательные согласия.
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canSubmit}
        type="submit"
      >
        Завершить регистрацию
      </button>
    </form>
  );
}
