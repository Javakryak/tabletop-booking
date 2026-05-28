import { rules } from "@/content/public-pages";

export default function RulesPage() {
  return (
    <section className="space-y-6">
      <header className="page-head">
        <p className="page-eyebrow">Редакция 4.2</p>
        <h1 className="page-title">Правила клуба</h1>
        <p className="page-lede">
          Базовый набор правил для публичной страницы. Пункты можно расширять и
          заменять без смены структуры.
        </p>
      </header>

      <div className="space-y-4">
        {rules.map((item) => (
          <article className="panel" key={item.title}>
            <h2 className="text-lg font-medium uppercase tracking-[0.04em]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
