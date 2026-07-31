import type { FormEvent } from "react";
import type {
  Court,
  PaymentStatus,
  ReservationForm,
  ReservationStatus,
} from "../types";
import {
  buildSpecialBookingMailto,
  formatDateForDisplay,
  isReservationDurationAllowed,
} from "../utils";

type ReservationFormModalProps = {
  courts: Court[];
  mode: "create" | "edit";
  form: ReservationForm;
  formMessage: string;
  reservationDate: string;
  saving: boolean;
  onClose: () => void;
  onCourtChange: (courtId: string) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onPaymentStatusChange: (value: PaymentStatus) => void;
  onStatusChange: (value: ReservationStatus) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTimeChange: (
    field: "startTime" | "endTime",
    value: string
  ) => void;
  onTotalPriceChange: (value: string) => void;
};

export function ReservationFormModal({
  courts,
  mode,
  form,
  formMessage,
  reservationDate,
  saving,
  onClose,
  onCourtChange,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onDateChange,
  onPaymentStatusChange,
  onStatusChange,
  onSubmit,
  onTimeChange,
  onTotalPriceChange,
}: ReservationFormModalProps) {
  const isEditing = mode === "edit";
  const selectedCourtName =
    courts.find((court) => court.id === form.courtId)?.name ??
    "";
  const durationIsAllowed = isReservationDurationAllowed(
    form.startTime,
    form.endTime
  );
  const specialBookingMailto = buildSpecialBookingMailto({
    courtName: selectedCourtName,
    customerName: form.customerName,
    endTime: form.endTime,
    reservationDate,
    startTime: form.startTime,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-neutral-950 p-6 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              {isEditing
                ? "Rezervasyonu Düzenle"
                : "Yeni Rezervasyon"}
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Rezervasyon bilgileri
            </h2>
            <p className="mt-2 capitalize text-sm text-gray-500">
              {formatDateForDisplay(reservationDate)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:border-white hover:text-white disabled:opacity-50"
          >
            Kapat
          </button>
        </div>

        {formMessage && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-4 text-sm text-red-200">
            <p className="font-medium">
              {isEditing
                ? "Rezervasyon güncellenemedi"
                : "Rezervasyon oluşturulamadı"}
            </p>
            <p className="mt-1 text-red-300">{formMessage}</p>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-7 grid gap-5 md:grid-cols-2"
        >
          {isEditing && (
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-gray-300">
                Tarih
              </label>
              <input
                type="date"
                value={reservationDate}
                onChange={(event) =>
                  onDateChange(event.target.value)
                }
                disabled={saving}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">
              Saha
            </label>
            <select
              value={form.courtId}
              onChange={(event) =>
                onCourtChange(event.target.value)
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.facilities?.[0]?.name || "Tesis"}{" "}
                  — {court.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`rounded-2xl border px-4 py-4 md:col-span-2 ${
              durationIsAllowed
                ? "border-amber-900/70 bg-amber-950/20"
                : "border-amber-700 bg-amber-950/40"
            }`}
          >
            <p className="text-sm font-medium text-amber-200">
              Uzun süreli kiralama veya özel etkinlik
            </p>
            <p className="mt-1 text-sm text-amber-300/80">
              Standart rezervasyonlar en fazla 2 saattir. Daha
              uzun kiralama, turnuva, organizasyon veya farklı bir
              etkinlik için bizimle iletişime geç.
            </p>
            {!durationIsAllowed && (
              <p className="mt-2 text-sm font-medium text-amber-200">
                Seçtiğin saat aralığı 2 saat sınırını aşıyor.
              </p>
            )}
            <a
              href={specialBookingMailto}
              className="mt-3 inline-flex rounded-xl border border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-900/40"
            >
              E-posta ile iletişime geç
            </a>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Müşteri Adı
            </label>
            <input
              type="text"
              value={form.customerName}
              onChange={(event) =>
                onCustomerNameChange(event.target.value)
              }
              placeholder="Örnek: Ali Yılmaz"
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Telefon
            </label>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(event) =>
                onCustomerPhoneChange(event.target.value)
              }
              placeholder="05XX XXX XX XX"
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Başlangıç
            </label>
            <input
              type="time"
              value={form.startTime}
              min="08:00"
              max="23:00"
              step="1800"
              onChange={(event) =>
                onTimeChange("startTime", event.target.value)
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Bitiş
            </label>
            <input
              type="time"
              value={form.endTime}
              min="09:00"
              max="23:59"
              step="1800"
              onChange={(event) =>
                onTimeChange("endTime", event.target.value)
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Rezervasyon Durumu
            </label>
            <select
              value={form.status}
              onChange={(event) =>
                onStatusChange(
                  event.target.value as ReservationStatus
                )
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            >
              <option value="confirmed">Onaylandı</option>
              <option value="pending">Bekliyor</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-gray-300">
              Ödeme Durumu
            </label>
            <select
              value={form.paymentStatus}
              onChange={(event) =>
                onPaymentStatusChange(
                  event.target.value as PaymentStatus
                )
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
            >
              <option value="unpaid">Ödenmedi</option>
              <option value="partial">Kısmi Ödendi</option>
              <option value="paid">Ödendi</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm text-gray-300">
              Toplam Ücret
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.totalPrice}
                onChange={(event) =>
                  onTotalPriceChange(event.target.value)
                }
                placeholder="2500"
                disabled={saving}
                className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 pr-14 outline-none focus:border-white disabled:opacity-60"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                TL
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-800 pt-5 md:col-span-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-medium transition hover:border-white disabled:opacity-60"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Kaydediliyor..."
                : isEditing
                  ? "Değişiklikleri Kaydet"
                  : "Rezervasyonu Oluştur"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
