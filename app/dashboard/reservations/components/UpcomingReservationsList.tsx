import type { Court, Reservation } from "../types";
import {
  formatCurrency,
  formatDateForDisplay,
  getPaymentStatusLabel,
  getStatusLabel,
  normalizeTime,
} from "../utils";

type UpcomingReservationsListProps = {
  courts: Court[];
  loading: boolean;
  reservations: Reservation[];
  onSelectReservation: (reservation: Reservation) => void;
};

export function UpcomingReservationsList({
  courts,
  loading,
  reservations,
  onSelectReservation,
}: UpcomingReservationsListProps) {
  const groupedReservations = reservations.reduce<
    Record<string, Reservation[]>
  >((groups, reservation) => {
    const dateReservations =
      groups[reservation.reservation_date] ?? [];

    return {
      ...groups,
      [reservation.reservation_date]: [
        ...dateReservations,
        reservation,
      ],
    };
  }, {});

  return (
    <section className="mt-6 rounded-3xl border border-gray-800 bg-neutral-950 p-5 shadow-2xl sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
            Yaklaşan Program
          </p>
          <h2 className="mt-2 text-xl font-semibold">
            Tüm gelecek rezervasyonlar
          </h2>
        </div>
        <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">
          {reservations.length} rezervasyon
        </span>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-gray-800 p-8 text-center text-sm text-gray-500">
          Gelecek rezervasyonlar yükleniyor...
        </div>
      ) : reservations.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-800 p-8 text-center">
          <p className="font-medium">
            Gelecek rezervasyon bulunmuyor
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Oluşturulan yeni rezervasyonlar burada görünecek.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(groupedReservations).map(
            ([dateValue, dateReservations]) => (
              <div key={dateValue}>
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold capitalize">
                    {formatDateForDisplay(dateValue)}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {dateReservations.length} rezervasyon
                  </span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {dateReservations.map((reservation) => {
                    const isCancelled =
                      reservation.status === "cancelled";
                    const courtName =
                      courts.find(
                        (court) =>
                          court.id === reservation.court_id
                      )?.name || "Saha";

                    return (
                      <button
                        key={reservation.id}
                        type="button"
                        onClick={() =>
                          onSelectReservation(reservation)
                        }
                        className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition hover:border-gray-500 ${
                          isCancelled
                            ? "border-gray-800 bg-gray-900/50 opacity-60"
                            : "border-gray-800 bg-black"
                        }`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`truncate font-medium ${
                              isCancelled ? "line-through" : ""
                            }`}
                          >
                            {reservation.customer_name}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {normalizeTime(reservation.start_time)} –{" "}
                            {normalizeTime(reservation.end_time)} ·{" "}
                            {courtName}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {getStatusLabel(reservation.status)} ·{" "}
                            {getPaymentStatusLabel(
                              reservation.payment_status
                            )}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatCurrency(
                            Number(reservation.total_price)
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}
