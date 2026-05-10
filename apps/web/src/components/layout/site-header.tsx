import Link from "next/link";

const navItems = [
  { label: "Главная", href: "/" },
  { label: "Расписание", href: "/schedule" },
  { label: "Игры", href: "/games" },
  { label: "Правила", href: "/rules" },
  { label: "Контакты", href: "/contacts" },
  { label: "Войти", href: "/auth/login" }
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link className="text-base font-semibold tracking-tight" href="/">
          Tabletop Booking
        </Link>

        <nav aria-label="Основная навигация" className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
