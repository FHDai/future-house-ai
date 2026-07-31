"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "refunded";

type Reservation = {
  id: string;
  court_id: string;
  customer_name: string;
  customer_phone: string | null;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  total_price: number;
  created_at: string;
};

type Court = {
  id: string;
  name: string;
  sport_type: string;
  price_per_hour: number;
  is_active: boolean;
};

type Customer = {
  id: string;
  full_name: string;
  created_at: string;
};

type DashboardData = {
  reservations: Reservation[];
  courts: Court[];
  customers: Customer[];
  facilityCount: number;
};

type RevenueDay = {
  date: string;
  label: string;
  revenue: number;
};

const OPERATING_START_HOUR = 8;
const OPERATING_END_HOUR = 24;

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateValue(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function timeToMinutes(time: string) {
  const [hour, minute] = normalizeTime(time).split(":").map(Number);

  return hour * 60 + minute;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Günaydın";
  }

  if (hour < 18) {
    return "İyi günler";
  }

  return "İyi akşamlar";
}

function getStatusLabel(status: ReservationStatus) {
  const labels: Record<ReservationStatus, string> = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    cancelled: "İptal",
    completed: "Tamamlandı",
  };

  return labels[status];
}

function getPaymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    unpaid: "Ödenmedi",
    partial: "Kısmi ödendi",
    paid: "Ödendi",
    refunded: "İade edildi",
  };

  return labels[status];
}

function getReservationStatusClasses(status: ReservationStatus) {
  const classes: Record<ReservationStatus, string> = {
    pending: "border-amber-900 bg-amber-950/40 text-amber-300",
    confirmed: "border-blue-900 bg-blue-950/40 text-blue-300",
    completed:
      "border-emerald-900 bg-emerald-950/40 text-emerald-300",
    cancelled: "border-gray-800 bg-gray-900 text-gray-500",
  };

  return classes[status];
}

function getPaymentStatusClasses(status: PaymentStatus) {
  const classes: Record<PaymentStatus, string> = {
    unpaid: "text-red-300",
    partial: "text-amber-300",
    paid: "text-emerald-300",
    refunded: "text-gray-500",
  };

  return classes[status];
}

function DashboardCardIcon({
  type,
}: {
  type: "revenue" | "reservation" | "occupancy" | "customer";
}) {
  if (type === "revenue") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h3" />
      </svg>
    );
  }

  if (type === "reservation") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  }

  if (type === "occupancy") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-5 w-5"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    reservations: [],
    courts: [],
    customers: [],
    facilityCount: 0,
  });

  const [userEmail, setUserEmail] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState("");

  const today = useMemo(() => new Date(), []);
  const todayValue = useMemo(() => formatDateForInput(today), [today]);

  const sevenDaysAgoValue = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6);

    return formatDateForInput(date);
  }, [today]);

  const loadDashboardData = useCallback(async () => {
    setPageLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    setUserEmail(user.email ?? "");

    const [
      reservationsResult,
      courtsResult,
      customersResult,
      facilitiesResult,
    ] = await Promise.all([
      supabase
        .from("reservations")
        .select(`
          id,
          court_id,
          customer_name,
          customer_phone,
          reservation_date,
          start_time,
          end_time,
          status,
          payment_status,
          total_price,
          created_at
        `)
        .gte("reservation_date", sevenDaysAgoValue)
        .order("reservation_date", { ascending: true })
        .order("start_time", { ascending: true }),

      supabase
        .from("courts")
        .select(`
          id,
          name,
          sport_type,
          price_per_hour,
          is_active
        `)
        .order("name", { ascending: true }),

      supabase
        .from("customers")
        .select(`
          id,
          full_name,
          created_at
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("facilities")
        .select("id", {
          count: "exact",
          head: true,
        }),
    ]);

    if (reservationsResult.error) {
      setMessage(
        `Rezervasyon verileri yüklenemedi: ${reservationsResult.error.message}`
      );
      setPageLoading(false);
      return;
    }

    if (courtsResult.error) {
      setMessage(
        `Saha verileri yüklenemedi: ${courtsResult.error.message}`
      );
      setPageLoading(false);
      return;
    }

    if (customersResult.error) {
      setMessage(
        `Müşteri verileri yüklenemedi: ${customersResult.error.message}`
      );
      setPageLoading(false);
      return;
    }

    if (facilitiesResult.error) {
      setMessage(
        `Tesis verileri yüklenemedi: ${facilitiesResult.error.message}`
      );
      setPageLoading(false);
      return;
    }

    setDashboardData({
      reservations:
        (reservationsResult.data ?? []) as Reservation[],
      courts: (courtsResult.data ?? []) as Court[],
      customers: (customersResult.data ?? []) as Customer[],
      facilityCount: facilitiesResult.count ?? 0,
    });

    setPageLoading(false);
  }, [router, sevenDaysAgoValue]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const activeCourts = useMemo(() => {
    return dashboardData.courts.filter((court) => court.is_active);
  }, [dashboardData.courts]);

  const todayReservations = useMemo(() => {
    return dashboardData.reservations
      .filter(
        (reservation) =>
          reservation.reservation_date === todayValue
      )
      .sort(
        (firstReservation, secondReservation) =>
          timeToMinutes(firstReservation.start_time) -
          timeToMinutes(secondReservation.start_time)
      );
  }, [dashboardData.reservations, todayValue]);

  const activeTodayReservations = useMemo(() => {
    return todayReservations.filter(
      (reservation) => reservation.status !== "cancelled"
    );
  }, [todayReservations]);

  const todayRevenue = useMemo(() => {
    return activeTodayReservations.reduce(
      (total, reservation) =>
        total + Number(reservation.total_price),
      0
    );
  }, [activeTodayReservations]);

  const collectedTodayRevenue = useMemo(() => {
    return activeTodayReservations
      .filter(
        (reservation) =>
          reservation.payment_status === "paid"
      )
      .reduce(
        (total, reservation) =>
          total + Number(reservation.total_price),
        0
      );
  }, [activeTodayReservations]);

  const unpaidTodayRevenue = useMemo(() => {
    return Math.max(todayRevenue - collectedTodayRevenue, 0);
  }, [todayRevenue, collectedTodayRevenue]);

  const todayBookedMinutes = useMemo(() => {
    return activeTodayReservations.reduce(
      (total, reservation) => {
        const duration =
          timeToMinutes(reservation.end_time) -
          timeToMinutes(reservation.start_time);

        return total + Math.max(duration, 0);
      },
      0
    );
  }, [activeTodayReservations]);

  const occupancyRate = useMemo(() => {
    if (activeCourts.length === 0) {
      return 0;
    }

    const operatingMinutesPerCourt =
      (OPERATING_END_HOUR - OPERATING_START_HOUR) * 60;

    const totalCapacity =
      activeCourts.length * operatingMinutesPerCourt;

    return Math.min(
      Math.round((todayBookedMinutes / totalCapacity) * 100),
      100
    );
  }, [activeCourts.length, todayBookedMinutes]);

  const newCustomersToday = useMemo(() => {
    return dashboardData.customers.filter((customer) => {
      return formatDateForInput(new Date(customer.created_at)) === todayValue;
    }).length;
  }, [dashboardData.customers, todayValue]);

  const upcomingReservations = useMemo(() => {
    const currentMinutes =
      new Date().getHours() * 60 + new Date().getMinutes();

    return activeTodayReservations
      .filter(
        (reservation) =>
          timeToMinutes(reservation.end_time) > currentMinutes
      )
      .slice(0, 6);
  }, [activeTodayReservations]);

  const revenueByDay = useMemo<RevenueDay[]>(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - 6 + index);

      const dateValue = formatDateForInput(date);

      const revenue = dashboardData.reservations
        .filter(
          (reservation) =>
            reservation.reservation_date === dateValue &&
            reservation.status !== "cancelled"
        )
        .reduce(
          (total, reservation) =>
            total + Number(reservation.total_price),
          0
        );

      return {
        date: dateValue,
        label: new Intl.DateTimeFormat("tr-TR", {
          weekday: "short",
        }).format(date),
        revenue,
      };
    });
  }, [dashboardData.reservations, today]);

  const maximumDailyRevenue = useMemo(() => {
    return Math.max(
      ...revenueByDay.map((day) => day.revenue),
      1
    );
  }, [revenueByDay]);

  const weeklyRevenue = useMemo(() => {
    return revenueByDay.reduce(
      (total, day) => total + day.revenue,
      0
    );
  }, [revenueByDay]);

  const todayCancellationCount = useMemo(() => {
    return todayReservations.filter(
      (reservation) => reservation.status === "cancelled"
    ).length;
  }, [todayReservations]);

  const firstName = useMemo(() => {
    if (!userEmail) {
      return "Yönetici";
    }

    const emailName = userEmail.split("@")[0];

    return emailName
      .split(/[._-]/)
      .filter(Boolean)
      .map(
        (part) =>
          part.charAt(0).toLocaleUpperCase("tr-TR") +
          part.slice(1)
      )
      .join(" ");
  }, [userEmail]);

  if (pageLoading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-gray-800 border-t-white" />

          <p className="mt-4 text-sm text-gray-500">
            Dashboard hazırlanıyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="px-4 py-6 md:px-7 md:py-8">
      <div className="mx-auto max-w-[1500px]">
        {message && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-red-900 bg-red-950/30 px-5 py-4 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
            <span>{message}</span>

            <button
              type="button"
              onClick={loadDashboardData}
              className="shrink-0 rounded-lg border border-red-800 px-3 py-2 text-xs font-semibold transition hover:bg-red-950"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border border-gray-800 bg-neutral-950 p-6 md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />

          <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm capitalize text-gray-500">
                {formatLongDate(today)}
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                {getGreeting()}, {firstName}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400 md:text-base">
                Bugün{" "}
                <span className="font-medium text-white">
                  {activeTodayReservations.length} aktif rezervasyonun
                </span>{" "}
                bulunuyor. İşletmenin günlük performansını buradan
                takip edebilirsin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/customers"
                className="rounded-xl border border-gray-700 px-5 py-3 text-center text-sm font-semibold text-gray-200 transition hover:border-white hover:bg-white hover:text-black"
              >
                Yeni Müşteri
              </Link>

              <Link
                href="/dashboard/reservations"
                className="rounded-xl bg-white px-5 py-3 text-center text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Yeni Rezervasyon
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-800 bg-black text-gray-300">
                <DashboardCardIcon type="revenue" />
              </div>

              <span className="rounded-full border border-emerald-900 bg-emerald-950/30 px-2.5 py-1 text-xs text-emerald-300">
                Bugün
              </span>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Günlük Ciro
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatCurrency(todayRevenue)}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4 text-xs">
              <span className="text-gray-500">Tahsil edilen</span>
              <span className="font-medium text-emerald-300">
                {formatCurrency(collectedTodayRevenue)}
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-800 bg-black text-gray-300">
                <DashboardCardIcon type="reservation" />
              </div>

              <span className="rounded-full border border-blue-900 bg-blue-950/30 px-2.5 py-1 text-xs text-blue-300">
                {todayCancellationCount} iptal
              </span>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Rezervasyon
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {activeTodayReservations.length}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4 text-xs">
              <span className="text-gray-500">Yaklaşan</span>
              <span className="font-medium text-white">
                {upcomingReservations.length}
              </span>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-800 bg-black text-gray-300">
                <DashboardCardIcon type="occupancy" />
              </div>

              <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-400">
                {activeCourts.length} aktif saha
              </span>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Günlük Doluluk
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              %{occupancyRate}
            </p>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: `${occupancyRate}%`,
                }}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-800 bg-black text-gray-300">
                <DashboardCardIcon type="customer" />
              </div>

              <span className="rounded-full border border-violet-900 bg-violet-950/30 px-2.5 py-1 text-xs text-violet-300">
                +{newCustomersToday} bugün
              </span>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Toplam Müşteri
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {dashboardData.customers.length}
            </p>

            <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4 text-xs">
              <span className="text-gray-500">Tesis sayısı</span>
              <span className="font-medium text-white">
                {dashboardData.facilityCount}
              </span>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <article className="rounded-2xl border border-gray-800 bg-neutral-950">
            <div className="flex flex-col gap-4 border-b border-gray-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-600">
                  Günlük Operasyon
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Bugünkü program
                </h3>
              </div>

              <Link
                href="/dashboard/reservations"
                className="text-sm font-medium text-gray-400 transition hover:text-white"
              >
                Tüm rezervasyonları gör →
              </Link>
            </div>

            {todayReservations.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-800 bg-black text-gray-500">
                  <DashboardCardIcon type="reservation" />
                </div>

                <h4 className="mt-5 font-semibold">
                  Bugün için rezervasyon yok
                </h4>

                <p className="mt-2 text-sm text-gray-500">
                  İlk rezervasyonu oluşturarak günlük programı
                  başlatabilirsin.
                </p>

                <Link
                  href="/dashboard/reservations"
                  className="mt-5 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
                >
                  Rezervasyon Oluştur
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-900">
                {todayReservations.slice(0, 8).map((reservation) => {
                  const court = dashboardData.courts.find(
                    (courtItem) =>
                      courtItem.id === reservation.court_id
                  );

                  const isCancelled =
                    reservation.status === "cancelled";

                  return (
                    <Link
                      key={reservation.id}
                      href="/dashboard/reservations"
                      className={`flex flex-col gap-4 px-5 py-4 transition hover:bg-white/[0.025] sm:flex-row sm:items-center md:px-6 ${
                        isCancelled ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 min-w-16 shrink-0 items-center justify-center rounded-xl border border-gray-800 bg-black px-3 text-sm font-semibold">
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
                            {court?.name || "Saha"} ·{" "}
                            {normalizeTime(reservation.start_time)} –{" "}
                            {normalizeTime(reservation.end_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:ml-auto">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs ${getReservationStatusClasses(
                            reservation.status
                          )}`}
                        >
                          {getStatusLabel(reservation.status)}
                        </span>

                        <div className="min-w-24 text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(
                              Number(reservation.total_price)
                            )}
                          </p>

                          <p
                            className={`mt-1 text-xs ${getPaymentStatusClasses(
                              reservation.payment_status
                            )}`}
                          >
                            {getPaymentStatusLabel(
                              reservation.payment_status
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950">
            <div className="border-b border-gray-800 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.22em] text-gray-600">
                Sıradaki
              </p>

              <h3 className="mt-2 text-xl font-semibold">
                Yaklaşan rezervasyonlar
              </h3>
            </div>

            {upcomingReservations.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="font-medium">
                  Yaklaşan rezervasyon bulunmuyor
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Günün kalan saatleri şu an müsait.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {upcomingReservations.map((reservation, index) => {
                  const court = dashboardData.courts.find(
                    (courtItem) =>
                      courtItem.id === reservation.court_id
                  );

                  return (
                    <Link
                      key={reservation.id}
                      href="/dashboard/reservations"
                      className="flex items-center gap-4 rounded-xl border border-gray-800 bg-black p-4 transition hover:border-gray-600"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                          index === 0
                            ? "bg-white text-black"
                            : "bg-gray-900 text-gray-400"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {reservation.customer_name}
                        </p>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {court?.name || "Saha"}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-semibold">
                        {normalizeTime(reservation.start_time)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-800 p-4">
              <Link
                href="/dashboard/reservations"
                className="block rounded-xl border border-gray-700 px-4 py-3 text-center text-sm font-semibold transition hover:border-white hover:bg-white hover:text-black"
              >
                Takvimi Aç
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-gray-600">
                  Son 7 Gün
                </p>

                <h3 className="mt-2 text-xl font-semibold">
                  Gelir performansı
                </h3>
              </div>

              <div className="sm:text-right">
                <p className="text-xs text-gray-500">
                  Haftalık toplam
                </p>

                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(weeklyRevenue)}
                </p>
              </div>
            </div>

            <div className="mt-8 flex h-64 items-end gap-3 sm:gap-5">
              {revenueByDay.map((day) => {
                const barHeight =
                  day.revenue === 0
                    ? 4
                    : Math.max(
                        (day.revenue / maximumDailyRevenue) * 100,
                        8
                      );

                const isToday = day.date === todayValue;

                return (
                  <div
                    key={day.date}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <p className="mb-3 hidden text-xs font-medium text-gray-500 sm:block">
                      {formatCompactCurrency(day.revenue)}
                    </p>

                    <div className="flex h-full w-full items-end justify-center">
                      <div
                        className={`w-full max-w-14 rounded-t-xl transition-all ${
                          isToday
                            ? "bg-white"
                            : "bg-gray-800 hover:bg-gray-700"
                        }`}
                        style={{
                          height: `${barHeight}%`,
                        }}
                        title={`${day.label}: ${formatCurrency(
                          day.revenue
                        )}`}
                      />
                    </div>

                    <p
                      className={`mt-3 text-xs capitalize ${
                        isToday
                          ? "font-semibold text-white"
                          : "text-gray-600"
                      }`}
                    >
                      {day.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-gray-800 bg-neutral-950 p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-gray-600">
              Finansal Durum
            </p>

            <h3 className="mt-2 text-xl font-semibold">
              Günlük tahsilat
            </h3>

            <div className="mt-7 rounded-2xl border border-gray-800 bg-black p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-500">
                  Toplam ciro
                </span>

                <span className="font-semibold">
                  {formatCurrency(todayRevenue)}
                </span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width:
                      todayRevenue > 0
                        ? `${Math.min(
                            (collectedTodayRevenue / todayRevenue) *
                              100,
                            100
                          )}%`
                        : "0%",
                  }}
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-800 p-4">
                  <p className="text-xs text-gray-500">
                    Tahsil edildi
                  </p>

                  <p className="mt-2 text-lg font-semibold text-emerald-300">
                    {formatCurrency(collectedTodayRevenue)}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-800 p-4">
                  <p className="text-xs text-gray-500">
                    Bekleyen
                  </p>

                  <p className="mt-2 text-lg font-semibold text-amber-300">
                    {formatCurrency(unpaidTodayRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Link
                href="/dashboard/customers"
                className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-4 text-sm transition hover:border-gray-600"
              >
                <span className="text-gray-400">
                  Müşteri kayıtları
                </span>

                <span className="font-semibold">
                  {dashboardData.customers.length} →
                </span>
              </Link>

              <Link
                href="/dashboard/courts"
                className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-4 text-sm transition hover:border-gray-600"
              >
                <span className="text-gray-400">
                  Aktif sahalar
                </span>

                <span className="font-semibold">
                  {activeCourts.length} →
                </span>
              </Link>

              <Link
                href="/dashboard/facilities"
                className="flex items-center justify-between rounded-xl border border-gray-800 px-4 py-4 text-sm transition hover:border-gray-600 sm:col-span-2 xl:col-span-1"
              >
                <span className="text-gray-400">
                  Tesisler
                </span>

                <span className="font-semibold">
                  {dashboardData.facilityCount} →
                </span>
              </Link>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}