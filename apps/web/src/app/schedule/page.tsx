import { BookingCalendarDemo } from "@/components/booking/booking-calendar-demo";

export default function SchedulePage() {
  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Календарь бронирования
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Базовые компоненты выбора даты, комнаты, стола и слотов. Отправка
          заявки и серверная валидация добавляются отдельным шагом.
        </p>
      </header>

      <BookingCalendarDemo />
    </section>
  );
}
