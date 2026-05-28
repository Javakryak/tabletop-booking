"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Главная", href: "/" },
  { label: "Расписание", href: "/schedule" },
  { label: "Игры", href: "/games" },
  { label: "Правила", href: "/rules" },
  { label: "Контакты", href: "/contacts" },
  { label: "Админ-панель", href: "/admin" },
  { label: "Войти", href: "/auth/login" }
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#4a0e0e] bg-[#7b1c1c] text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.14em]"
          href="/"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d4a017] bg-[#4a0e0e] text-sm font-bold text-[#f5e5cf]">
            Ш
          </span>
          <span>Штандарт</span>
        </Link>

        <nav aria-label="Основная навигация" className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium uppercase tracking-[0.08em] transition-colors ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "border-[#d4a017] bg-[#4a0e0e] text-[#f5e5cf]"
                  : "border-transparent bg-[#8b2626] text-[#f8e6e1] hover:bg-[#b0181c]"
              }`}
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
