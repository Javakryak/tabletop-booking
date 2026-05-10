import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="space-y-6">
        <p className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          TASK-0601 Shell
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Платформа бронирования клуба
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Базовая оболочка Next.js уже готова для следующих задач: публичных
            страниц, авторизации и сценариев бронирования.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Войти через Telegram</Button>
          <Button variant="outline">Смотреть расписание</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-4" id="schedule">
          <h2 className="text-lg font-medium">Расписание</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            В этой секции появится актуальное расписание клуба.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4" id="games">
          <h2 className="text-lg font-medium">Игры</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Каталог игр будет добавлен в следующих задачах.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4" id="rules">
          <h2 className="text-lg font-medium">Правила</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Здесь будут правила клуба и бронирования.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-card p-4" id="contacts">
          <h2 className="text-lg font-medium">Контакты</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Контактные данные клуба будут опубликованы после согласования.
          </p>
        </article>
      </div>
    </section>
  );
}
