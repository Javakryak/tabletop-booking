import Link from "next/link";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

export default function AuthLoginPage() {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_minmax(0,1fr)]">
      <aside className="panel bg-[#4a0e0e] text-[#f7e9e6]">
        <p className="page-eyebrow text-[#d8b9b3]">Авторизация</p>
        <h1 className="mt-1 text-4xl font-semibold uppercase tracking-[0.06em]">
          Вход через Telegram
        </h1>
        <p className="mt-4 text-sm text-[#d8b9b3]">
          Основной способ входа в систему клуба. После успешной авторизации
          система направит вас к завершению профиля или сразу в личную зону.
        </p>
        <p className="mt-6 rounded-md border border-[#7b1c1c] bg-[#3a0a0a] p-3 text-xs text-[#c8aba7]">
          API endpoint: <code>{apiBaseUrl}/auth/telegram</code>
        </p>
      </aside>

      <article className="panel space-y-4">
        <p className="page-eyebrow">Действия</p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium uppercase tracking-[0.08em] text-primary-foreground transition-colors hover:bg-[#5e1414]"
            href="/auth/session?authenticated=1&profileCompleted=0&consentRequired=1"
          >
            Начать вход
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 py-2 text-sm font-medium uppercase tracking-[0.08em] transition-colors hover:bg-muted"
            href="/auth/session?authenticated=0"
          >
            Без сессии
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Демо-ссылки для проверки доступа к админ-панели:
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-xs font-medium uppercase tracking-[0.08em] transition-colors hover:bg-muted"
            href="/admin?authenticated=1&role=admin"
          >
            Открыть как admin
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-xs font-medium uppercase tracking-[0.08em] transition-colors hover:bg-muted"
            href="/admin?authenticated=1&role=owner"
          >
            Открыть как owner
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-card px-3 text-xs font-medium uppercase tracking-[0.08em] transition-colors hover:bg-muted"
            href="/admin?authenticated=1&role=user"
          >
            Открыть как user
          </Link>
        </div>
      </article>
    </section>
  );
}
