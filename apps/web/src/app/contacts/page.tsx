import { contacts } from "@/content/public-pages";

export default function ContactsPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Контакты клуба
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Структура контактной страницы для Telegram, почты и офлайн-локации.
        </p>
      </header>

      <div className="space-y-4">
        {contacts.map((contact) => (
          <article
            className="rounded-xl border border-border bg-card p-4"
            key={contact.title}
          >
            <h2 className="text-lg font-medium">{contact.title}</h2>
            <p className="mt-1 text-sm font-medium text-foreground">{contact.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{contact.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
