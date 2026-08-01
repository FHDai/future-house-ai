"use client";

import { useMemo, useState } from "react";

export type CustomerHistoryReservation = {
  id: string;
  customer_id: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  payment_status: "unpaid" | "partial" | "paid" | "refunded";
  courts:
    | {
        name: string;
        facilities: { name: string }[] | null;
      }[]
    | null;
};

type CustomerSummary = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

type HistoryFilter = "upcoming" | "past" | "cancelled";

type Props = {
  customer: CustomerSummary;
  reservations: CustomerHistoryReservation[];
  onClose: () => void;
};

function getTodayValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

const statusLabels = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  cancelled: "İptal",
  completed: "Tamamlandı",
};

const paymentLabels = {
  unpaid: "Ödenmedi",
  partial: "Kısmi Ödeme",
  paid: "Ödendi",
  refunded: "İade Edildi",
};

export function CustomerReservationHistoryModal({
  customer,
  reservations,
  onClose,
}: Props) {
  const [filter, setFilter] = useState<HistoryFilter>("upcoming");
  const [expandedReservationId, setExpandedReservationId] = useState<
    string | null
  >(null);
  const today = getTodayValue();

  const groups = useMemo(() => {
    const activeReservations = reservations.filter(
      (reservation) => reservation.status !== "cancelled"
    );

    return {
      upcoming: activeReservations
        .filter((reservation) => reservation.reservation_date >= today)
        .sort((first, second) =>
          `${first.reservation_date}${first.start_time}`.localeCompare(
            `${second.reservation_date}${second.start_time}`
          )
        ),
      past: activeReservations
        .filter((reservation) => reservation.reservation_date < today)
        .sort((first, second) =>
          `${second.reservation_date}${second.start_time}`.localeCompare(
            `${first.reservation_date}${first.start_time}`
          )
        ),
      cancelled: reservations
        .filter((reservation) => reservation.status === "cancelled")
        .sort((first, second) =>
          `${second.reservation_date}${second.start_time}`.localeCompare(
            `${first.reservation_date}${first.start_time}`
          )
        ),
    };
  }, [reservations, today]);

  const totalSpent = reservations
    .filter((reservation) => reservation.status !== "cancelled")
    .reduce(
      (total, reservation) => total + Number(reservation.total_price),
      0
    );
  const visibleReservations = groups[filter];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-gray-800 bg-neutral-950 p-5 shadow-2xl md:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              Müşteri Detayı
            </p>
            <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
              {customer.full_name}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {[customer.phone, customer.email].filter(Boolean).join(" · ") ||
                "İletişim bilgisi bulunmuyor"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-400 transition hover:border-white hover:text-white"
          >
            Kapat
          </button>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-black p-4">
            <p className="text-xs text-gray-500">Toplam Rezervasyon</p>
            <p className="mt-2 text-2xl font-semibold">{reservations.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black p-4">
            <p className="text-xs text-gray-500">Toplam Harcama</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-black p-4">
            <p className="text-xs text-gray-500">Gelecek Rezervasyon</p>
            <p className="mt-2 text-2xl font-semibold">
              {groups.upcoming.length}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-gray-800 pb-3">
          {(
            [
              ["upcoming", "Gelecek", groups.upcoming.length],
              ["past", "Geçmiş", groups.past.length],
              ["cancelled", "İptal", groups.cancelled.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setExpandedReservationId(null);
              }}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${
                filter === value
                  ? "bg-white font-semibold text-black"
                  : "border border-gray-800 text-gray-400 hover:border-gray-600"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {visibleReservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">
              Bu bölümde rezervasyon bulunmuyor.
            </div>
          ) : (
            visibleReservations.map((reservation) => {
              const court = reservation.courts?.[0];
              const facility = court?.facilities?.[0];
              const expanded = expandedReservationId === reservation.id;

              return (
                <button
                  key={reservation.id}
                  type="button"
                  onClick={() =>
                    setExpandedReservationId(expanded ? null : reservation.id)
                  }
                  className="w-full rounded-2xl border border-gray-800 bg-black p-4 text-left transition hover:border-gray-600"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {formatDate(reservation.reservation_date)} · {formatTime(reservation.start_time)}–{formatTime(reservation.end_time)}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {[facility?.name, court?.name].filter(Boolean).join(" — ") ||
                          "Saha bilgisi bulunmuyor"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatCurrency(Number(reservation.total_price))}
                      </span>
                      <span className="text-xs text-gray-500">
                        {expanded ? "Daralt" : "Detay"}
                      </span>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 grid gap-3 border-t border-gray-800 pt-4 text-sm sm:grid-cols-2">
                      <p className="text-gray-500">
                        Durum: <span className="text-gray-200">{statusLabels[reservation.status]}</span>
                      </p>
                      <p className="text-gray-500">
                        Ödeme: <span className="text-gray-200">{paymentLabels[reservation.payment_status]}</span>
                      </p>
                      <p className="text-gray-500 sm:col-span-2">
                        Rezervasyon No: <span className="font-mono text-gray-300">{reservation.id}</span>
                      </p>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
