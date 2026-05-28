"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

const navItems = [
  {
    href: "/admin",
    label: "Обзор"
  },
  {
    href: "/admin/bookings",
    label: "Брони"
  },
  {
    href: "/admin/schedule",
    label: "Дневной план"
  },
  {
    href: "/admin/users",
    label: "Пользователи"
  },
  {
    href: "/admin/audit-logs",
    label: "Audit log"
  },
  {
    href: "/admin/resources",
    label: "Ресурсы клуба"
  }
];

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-border bg-card p-6">
        <p className="page-eyebrow">Операционная зона</p>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.05em]">
          Админ-панель
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Доступно ролям admin и owner. Проверка прав на сервере обязательна для
          всех API-запросов.
        </p>
      </header>

      <nav
        aria-label="Навигация админ-панели"
        className="rounded-xl border border-[#2f1515] bg-[#1a0a0a] p-3"
      >
        <ul className="flex flex-wrap gap-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  className={`inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-[#d4a017] bg-[#4a0e0e] text-[#f5e5cf]"
                      : "border-transparent bg-[#2b1212] text-[#e6d2cd] hover:bg-[#3a1717]"
                  }`}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {children}
    </section>
  );
}
