import Link from "next/link";

import { publicNavItems } from "@/content/public-pages";

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="space-y-6">
        <p className="inline-flex rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Клуб настольных игр
        </p>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Платформа бронирования клуба
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Публичный сайт клуба: знакомство с расписанием, подборками игр,
            правилами и каналами связи.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            href="/schedule"
          >
            Смотреть расписание
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            href="/contacts"
          >
            Связаться с клубом
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {publicNavItems.map((item) => (
          <article
            className="rounded-xl border border-border bg-card p-4"
            key={item.href}
          >
            <h2 className="text-lg font-medium">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            <Link
              className="mt-4 inline-flex text-sm font-medium text-foreground underline underline-offset-4"
              href={item.href}
            >
              Перейти
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
