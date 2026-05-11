import Link from "next/link";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export default function AuthLoginPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Вход через Telegram
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Основной способ входа в систему клуба. После успешной авторизации
          система направит вас в завершение профиля или сразу в личную зону.
        </p>
      </header>

      <article className="space-y-4 rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Точка интеграции с API: <code>{apiBaseUrl}/auth/telegram</code>
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            href="/auth/session?authenticated=1&profileCompleted=0&consentRequired=1"
          >
            Начать вход через Telegram
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            href="/auth/session?authenticated=0"
          >
            Проверить сценарий без сессии
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Демо-ссылки для проверки доступа к админ-панели:
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
            href="/admin?authenticated=1&role=admin"
          >
            Открыть как admin
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
            href="/admin?authenticated=1&role=owner"
          >
            Открыть как owner
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
            href="/admin?authenticated=1&role=user"
          >
            Открыть как user
          </Link>
        </div>
      </article>
    </section>
  );
}
