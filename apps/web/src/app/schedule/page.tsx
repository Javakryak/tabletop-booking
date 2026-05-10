import { scheduleBlocks } from "@/content/public-pages";

export default function SchedulePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Расписание клуба
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Базовая структура расписания. Реальные слоты и даты можно заменить
          без изменения layout-компонентов.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {scheduleBlocks.map((item) => (
          <article className="rounded-xl border border-border bg-card p-4" key={item.title}>
            <h2 className="text-lg font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.details}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
