import Link from "next/link";

export default function DashboardPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border bg-card p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Личный кабинет</h1>
      <p className="text-sm text-muted-foreground">
        Вход выполнен, профиль завершен. Детальные разделы кабинета будут
        добавлены в следующей задаче.
      </p>
      <Link
        className="inline-flex text-sm font-medium underline underline-offset-4"
        href="/"
      >
        Вернуться на главную
      </Link>
    </section>
  );
}
