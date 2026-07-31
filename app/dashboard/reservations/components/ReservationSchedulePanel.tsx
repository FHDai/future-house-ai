import type {
  Court,
  Facility,
  Reservation,
  TimeSlot,
} from "../types";
import {
  formatCurrency,
  getPaymentStatusLabel,
  getStatusLabel,
  normalizeTime,
} from "../utils";

type ReservationSchedulePanelProps = {
  facilities: Facility[];
  filteredCourts: Court[];
  reservationsLoading: boolean;
  selectedCourt: Court | null;
  selectedCourtActiveReservations: Reservation[];
  selectedCourtId: string;
  selectedCourtReservations: Reservation[];
  selectedFacilityId: string;
  timeSlots: TimeSlot[];
  onCourtChange: (courtId: string) => void;
  onFacilityChange: (facilityId: string) => void;
  onOpenReservation: (
    startTime: string,
    courtId: string
  ) => void;
  onSelectReservation: (reservation: Reservation) => void;
};

export function ReservationSchedulePanel({
  facilities,
  filteredCourts,
  reservationsLoading,
  selectedCourt,
  selectedCourtActiveReservations,
  selectedCourtId,
  selectedCourtReservations,
  selectedFacilityId,
  timeSlots,
  onCourtChange,
  onFacilityChange,
  onOpenReservation,
  onSelectReservation,
}: ReservationSchedulePanelProps) {
  return (
    <div className="p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">
            Tesis
          </label>
          <select
            value={selectedFacilityId}
            onChange={(event) =>
              onFacilityChange(event.target.value)
            }
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition focus:border-white"
          >
            <option value="all">Tüm Tesisler</option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">
            Saha
          </label>
          <select
            value={selectedCourtId}
            onChange={(event) =>
              onCourtChange(event.target.value)
            }
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition focus:border-white"
          >
            {filteredCourts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name} · {court.sport_type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCourt && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-black px-4 py-3">
          <div>
            <p className="text-sm font-medium">
              {selectedCourt.name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {selectedCourt.facilities?.[0]?.name || "Tesis"}{" "}
              · {selectedCourt.sport_type}
            </p>
          </div>
          <p className="text-sm font-semibold">
            {formatCurrency(
              Number(selectedCourt.price_per_hour)
            )}
            <span className="font-normal text-gray-500">
              {" "}/ saat
            </span>
          </p>
        </div>
      )}

      <div className="mt-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
              Uygun Saatler
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              Saatini seç
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Uygun
            </span>
            <span className="flex items-center gap-1.5 text-gray-500">
              <span className="h-2 w-2 rounded-full bg-gray-700" />
              Dolu
            </span>
          </div>
        </div>

        {reservationsLoading ? (
          <div className="mt-6 rounded-2xl border border-gray-800 p-8 text-center text-sm text-gray-500">
            Uygun saatler yükleniyor...
          </div>
        ) : filteredCourts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-800 p-8 text-center">
            <p className="font-medium">
              Bu tesiste aktif saha bulunamadı
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Farklı bir tesis seçebilirsin.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.isAvailable}
                onClick={() =>
                  onOpenReservation(slot.time, selectedCourtId)
                }
                title={
                  slot.reservation
                    ? `${slot.reservation.customer_name} adına dolu`
                    : `${slot.time} için rezervasyon oluştur`
                }
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                  slot.isAvailable
                    ? "border-emerald-900 bg-emerald-950/30 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-950/60"
                    : "cursor-not-allowed border-gray-800 bg-gray-900 text-gray-600 line-through"
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-gray-800 pt-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
              Günün Programı
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              Mevcut rezervasyonlar
            </h3>
          </div>
          <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-400">
            {selectedCourtActiveReservations.length}{" "}
            rezervasyon
          </span>
        </div>

        {selectedCourtReservations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-gray-800 p-7 text-center">
            <p className="font-medium">
              Bu sahada rezervasyon yok
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Uygun saatlerden birini seçerek rezervasyon
              oluşturabilirsin.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {selectedCourtReservations.map((reservation) => {
              const isCancelled =
                reservation.status === "cancelled";

              return (
                <button
                  key={reservation.id}
                  type="button"
                  onClick={() => onSelectReservation(reservation)}
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition hover:border-gray-500 ${
                    isCancelled
                      ? "border-gray-800 bg-gray-900/50 opacity-60"
                      : "border-gray-800 bg-black"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                        reservation.payment_status === "paid"
                          ? "bg-emerald-950 text-emerald-300"
                          : reservation.status === "pending"
                            ? "bg-amber-950 text-amber-300"
                            : isCancelled
                              ? "bg-gray-800 text-gray-500"
                              : "bg-blue-950 text-blue-300"
                      }`}
                    >
                      {normalizeTime(reservation.start_time)}
                    </div>
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
                        {getStatusLabel(reservation.status)}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {formatCurrency(
                        Number(reservation.total_price)
                      )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {getPaymentStatusLabel(
                        reservation.payment_status
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
