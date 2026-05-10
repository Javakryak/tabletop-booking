import { rules } from "@/content/public-pages";

export default function RulesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Правила клуба
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Базовый набор правил для публичной страницы. Пункты можно расширять и
          заменять без смены структуры.
        </p>
      </header>

      <div className="space-y-4">
        {rules.map((item) => (
          <article className="rounded-xl border border-border bg-card p-4" key={item.title}>
            <h2 className="text-lg font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
