import type { Court, Reservation } from "../types";
import {
  formatCurrency,
  formatDateForDisplay,
  getPaymentStatusLabel,
  getStatusLabel,
  normalizeTime,
} from "../utils";

type ReservationDetailModalProps = {
  courts: Court[];
  reservation: Reservation;
  onCancel: () => void;
  onClose: () => void;
  onComplete: () => void;
  onMarkAsPaid: () => void;
};

export function ReservationDetailModal({
  courts,
  reservation,
  onCancel,
  onClose,
  onComplete,
  onMarkAsPaid,
}: ReservationDetailModalProps) {
  const courtName =
    courts.find((court) => court.id === reservation.court_id)
      ?.name || "Saha";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-gray-800 bg-neutral-950 p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Rezervasyon Detayı
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {reservation.customer_name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:border-white hover:text-white"
          >
            Kapat
          </button>
        </div>

        <div className="mt-7 space-y-4 border-y border-gray-800 py-6 text-sm">
          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Saha</span>
            <span className="text-right font-medium">
              {courtName}
            </span>
          </div>

          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Tarih</span>
            <span className="text-right capitalize">
              {formatDateForDisplay(reservation.reservation_date)}
            </span>
          </div>

          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Saat</span>
            <span>
              {normalizeTime(reservation.start_time)} –{" "}
              {normalizeTime(reservation.end_time)}
            </span>
          </div>

          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Telefon</span>
            <span>
              {reservation.customer_phone || "Belirtilmedi"}
            </span>
          </div>

          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Durum</span>
            <span>{getStatusLabel(reservation.status)}</span>
          </div>

          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Ödeme</span>
            <span>
              {getPaymentStatusLabel(
                reservation.payment_status
              )}
            </span>
          </div>

          <div className="flex justify-between gap-5">
            <span className="text-gray-500">Toplam Tutar</span>
            <span className="font-semibold">
              {formatCurrency(Number(reservation.total_price))}
            </span>
          </div>
        </div>

        {reservation.status !== "cancelled" && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {reservation.payment_status !== "paid" && (
              <button
                type="button"
                onClick={onMarkAsPaid}
                className="rounded-xl border border-emerald-800 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-950"
              >
                Ödendi İşaretle
              </button>
            )}

            {reservation.status !== "completed" && (
              <button
                type="button"
                onClick={onComplete}
                className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium transition hover:border-white"
              >
                Tamamlandı İşaretle
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-red-900 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950 sm:col-span-2"
            >
              Rezervasyonu İptal Et
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
