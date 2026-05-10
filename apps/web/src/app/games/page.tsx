import { gameCategories } from "@/content/public-pages";

export default function GamesPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Каталог игр
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Категории и примеры игр как шаблон будущего каталога клуба.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {gameCategories.map((category) => (
          <article
            className="rounded-xl border border-border bg-card p-4"
            key={category.title}
          >
            <h2 className="text-lg font-medium">{category.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {category.examples.map((example) => (
                <li key={example}>• {example}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
