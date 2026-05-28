import Link from "next/link";

import { publicNavItems } from "@/content/public-pages";

export default function HomePage() {
  return (
    <section className="space-y-10">
      <div className="page-head">
        <p className="page-eyebrow">Настольный клуб · с 2008 года</p>
        <h1 className="page-title sm:text-5xl">Штандарт · платформа бронирования</h1>
        <p className="page-lede">
          Публичный сайт клуба: расписание, каталог игр, правила и контакты.
          Бронирование отправляется как заявка и подтверждается администратором.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
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
            className="panel"
            key={item.href}
          >
            <h2 className="text-lg font-medium uppercase tracking-[0.04em]">
              {item.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            <Link
              className="mt-4 inline-flex text-sm font-medium uppercase tracking-[0.08em] text-[#7b1c1c] underline underline-offset-4"
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
