import { gameCategories } from "@/content/public-pages";

export default function GamesPage() {
  return (
    <section className="space-y-6">
      <header className="page-head">
        <p className="page-eyebrow">Библиотека клуба</p>
        <h1 className="page-title">Каталог игр</h1>
        <p className="page-lede">
          Категории и примеры игр как шаблон будущего каталога клуба.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {gameCategories.map((category) => (
          <article
            className="panel"
            key={category.title}
          >
            <h2 className="text-lg font-medium uppercase tracking-[0.04em]">
              {category.title}
            </h2>
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
