import { BookingCreationFlow } from "@/components/booking/booking-creation-flow";

export default function SchedulePage() {
  return (
    <section className="space-y-6">
      <header className="page-head">
        <p className="page-eyebrow">Шаг 1 · выбор стола и времени</p>
        <h1 className="page-title">Календарь бронирования</h1>
        <p className="page-lede">
          Выберите дату, комнату, стол и интервалы, затем отправьте заявку на
          бронь. После отправки требуется подтверждение администратора.
        </p>
      </header>

      <BookingCreationFlow />
    </section>
  );
}
