import { Suspense, type ReactNode } from "react";

import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { AdminRouteGate } from "@/components/admin/admin-route-gate";

export default function AdminLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <Suspense
      fallback={
        <section className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Админ-панель</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Проверяем права доступа...
          </p>
        </section>
      }
    >
      <AdminRouteGate>
        <AdminLayoutShell>{children}</AdminLayoutShell>
      </AdminRouteGate>
    </Suspense>
  );
}
