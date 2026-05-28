import { contacts } from "@/content/public-pages";

export default function ContactsPage() {
  return (
    <section className="space-y-6">
      <header className="page-head">
        <p className="page-eyebrow">Связь и расположение</p>
        <h1 className="page-title">Контакты клуба</h1>
        <p className="page-lede">
          Структура контактной страницы для Telegram, почты и офлайн-локации.
        </p>
      </header>

      <div className="space-y-4">
        {contacts.map((contact) => (
          <article
            className="panel"
            key={contact.title}
          >
            <h2 className="text-lg font-medium uppercase tracking-[0.04em]">
              {contact.title}
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground">{contact.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{contact.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
