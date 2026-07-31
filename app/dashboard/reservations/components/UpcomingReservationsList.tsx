"use client";

import { useMemo, useState } from "react";
import type {
  Court,
  Facility,
  Reservation,
  ReservationStatus,
} from "../types";
import {
  formatCurrency,
  formatDateForDisplay,
  getPaymentStatusLabel,
  getStatusLabel,
  normalizeTime,
} from "../utils";

type UpcomingReservationsListProps = {
  courts: Court[];
  facilities: Facility[];
  loading: boolean;
  reservations: Reservation[];
  onSelectReservation: (reservation: Reservation) => void;
};

export function UpcomingReservationsList({
  courts,
  facilities,
  loading,
  reservations,
  onSelectReservation,
}: UpcomingReservationsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [facilityId, setFacilityId] = useState("all");
  const [courtId, setCourtId] = useState("all");
  const [status, setStatus] = useState<
    ReservationStatus | "all"
  >("all");

  const filterCourts = useMemo(() => {
    return courts.filter(
      (court) =>
        facilityId === "all" ||
        court.facility_id === facilityId
    );
  }, [courts, facilityId]);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = searchQuery
      .trim()
      .toLocaleLowerCase("tr-TR");

    return reservations.filter((reservation) => {
      const court = courts.find(
        (courtItem) => courtItem.id === reservation.court_id
      );
      const matchesSearch =
        normalizedQuery === "" ||
        reservation.customer_name
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery) ||
        (reservation.customer_phone ?? "").includes(
          normalizedQuery
        );
      const matchesFacility =
        facilityId === "all" ||
        court?.facility_id === facilityId;
      const matchesCourt =
        courtId === "all" || reservation.court_id === courtId;
      const matchesStatus =
        status === "all" || reservation.status === status;

      return (
        matchesSearch &&
        matchesFacility &&
        matchesCourt &&
        matchesStatus
      );
    });
  }, [reservations, courts, searchQuery, facilityId, courtId, status]);

  const groupedReservations = useMemo(() => {
    return filteredReservations.reduce<
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
  }, [filteredReservations]);

  const hasActiveFilters =
    searchQuery !== "" ||
    facilityId !== "all" ||
    courtId !== "all" ||
    status !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFacilityId("all");
    setCourtId("all");
    setStatus("all");
  };

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
          {filteredReservations.length}
          {hasActiveFilters && ` / ${reservations.length}`} rezervasyon
        </span>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">
            Müşteri Ara
          </label>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Ad veya telefon"
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition placeholder:text-gray-600 focus:border-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">
            Tesis
          </label>
          <select
            value={facilityId}
            onChange={(event) => {
              setFacilityId(event.target.value);
              setCourtId("all");
            }}
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
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">
            Saha
          </label>
          <select
            value={courtId}
            onChange={(event) => setCourtId(event.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition focus:border-white"
          >
            <option value="all">Tüm Sahalar</option>
            {filterCourts.map((court) => (
              <option key={court.id} value={court.id}>
                {court.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-gray-500">
            Durum
          </label>
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as ReservationStatus | "all"
              )
            }
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition focus:border-white"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="confirmed">Onaylandı</option>
            <option value="completed">Tamamlandı</option>
            <option value="cancelled">İptal</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-gray-500 transition hover:text-white"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}

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
      ) : filteredReservations.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-800 p-8 text-center">
          <p className="font-medium">
            Filtrelere uygun rezervasyon bulunamadı
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm text-gray-500 transition hover:text-white"
          >
            Filtreleri temizle
          </button>
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
