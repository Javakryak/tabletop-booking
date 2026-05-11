import { BookingCreationFlow } from "@/components/booking/booking-creation-flow";

export default function SchedulePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Календарь бронирования
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Выберите дату, комнату, стол и интервалы, затем отправьте заявку на
          бронь. После отправки требуется подтверждение администратора.
        </p>
      </header>

      <BookingCreationFlow />
    </section>
  );
}
