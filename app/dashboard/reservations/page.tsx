"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Facility = {
  id: string;
  name: string;
};

type Court = {
  id: string;
  facility_id: string;
  name: string;
  sport_type: string;
  price_per_hour: number;
  is_active: boolean;
  facilities: {
    name: string;
  }[] | null;
};

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
  total_price: number;
  payment_status: PaymentStatus;
  created_at: string;
};

type ReservationForm = {
  courtId: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  totalPrice: string;
};

type CalendarDay = {
  date: Date;
  dateValue: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

type TimeSlot = {
  time: string;
  isAvailable: boolean;
  reservation: Reservation | null;
};

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 24;
const SLOT_INTERVAL_MINUTES = 60;

const initialForm: ReservationForm = {
  courtId: "",
  customerName: "",
  customerPhone: "",
  startTime: "18:00",
  endTime: "19:00",
  status: "confirmed",
  paymentStatus: "unpaid",
  totalPrice: "",
};

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

function formatDateForDisplay(dateValue: string) {
  const date = parseDateValue(dateValue);

  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function timeToMinutes(time: string) {
  const normalizedTime = normalizeTime(time);
  const [hour, minute] = normalizedTime.split(":").map(Number);

  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;

  return minutesToTime(totalMinutes);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
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
    partial: "Kısmi Ödendi",
    paid: "Ödendi",
    refunded: "İade Edildi",
  };

  return labels[status];
}

function getCalendarDays(
  visibleMonth: Date,
  selectedDate: string
): CalendarDay[] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);

  const mondayBasedDay =
    firstDayOfMonth.getDay() === 0
      ? 6
      : firstDayOfMonth.getDay() - 1;

  const calendarStartDate = new Date(
    year,
    month,
    1 - mondayBasedDay
  );

  const todayValue = formatDateForInput(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);

    const dateValue = formatDateForInput(date);

    return {
      date,
      dateValue,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: dateValue === todayValue,
      isSelected: dateValue === selectedDate,
    };
  });
}

function doTimesOverlap(
  startTime: string,
  endTime: string,
  reservation: Reservation
) {
  const slotStart = timeToMinutes(startTime);
  const slotEnd = timeToMinutes(endTime);

  const reservationStart = timeToMinutes(
    reservation.start_time
  );

  const reservationEnd = timeToMinutes(
    reservation.end_time
  );

  return (
    slotStart < reservationEnd &&
    slotEnd > reservationStart
  );
}

export default function ReservationsPage() {
  const router = useRouter();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);

  const [selectedDate, setSelectedDate] = useState(
    formatDateForInput(new Date())
  );

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );
  });

  const [selectedFacilityId, setSelectedFacilityId] =
    useState("all");

  const [selectedCourtId, setSelectedCourtId] =
    useState("");

  const [form, setForm] =
    useState<ReservationForm>(initialForm);

  const [pageLoading, setPageLoading] = useState(true);
  const [reservationsLoading, setReservationsLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const [message, setMessage] = useState("");
  const [formMessage, setFormMessage] = useState("");

  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      return (
        selectedFacilityId === "all" ||
        court.facility_id === selectedFacilityId
      );
    });
  }, [courts, selectedFacilityId]);

  const selectedCourt = useMemo(() => {
    return (
      courts.find((court) => court.id === selectedCourtId) ??
      null
    );
  }, [courts, selectedCourtId]);

  const selectedCourtReservations = useMemo(() => {
    if (!selectedCourtId) {
      return [];
    }

    return reservations
      .filter(
        (reservation) =>
          reservation.court_id === selectedCourtId
      )
      .sort(
        (firstReservation, secondReservation) =>
          timeToMinutes(firstReservation.start_time) -
          timeToMinutes(secondReservation.start_time)
      );
  }, [reservations, selectedCourtId]);

  const activeReservations = useMemo(() => {
    return reservations.filter(
      (reservation) => reservation.status !== "cancelled"
    );
  }, [reservations]);

  const selectedCourtActiveReservations = useMemo(() => {
    return selectedCourtReservations.filter(
      (reservation) => reservation.status !== "cancelled"
    );
  }, [selectedCourtReservations]);

  const dailyRevenue = useMemo(() => {
    return activeReservations.reduce(
      (total, reservation) =>
        total + Number(reservation.total_price),
      0
    );
  }, [activeReservations]);

  const collectedRevenue = useMemo(() => {
    return activeReservations
      .filter(
        (reservation) =>
          reservation.payment_status === "paid"
      )
      .reduce(
        (total, reservation) =>
          total + Number(reservation.total_price),
        0
      );
  }, [activeReservations]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(visibleMonth, selectedDate);
  }, [visibleMonth, selectedDate]);

  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedCourtId) {
      return [];
    }

    const slots: TimeSlot[] = [];

    for (
      let minutes = DAY_START_HOUR * 60;
      minutes < DAY_END_HOUR * 60;
      minutes += SLOT_INTERVAL_MINUTES
    ) {
      const startTime = minutesToTime(minutes);
      const endTime = minutesToTime(
        minutes + SLOT_INTERVAL_MINUTES
      );

      const conflictingReservation =
        selectedCourtReservations.find((reservation) => {
          if (reservation.status === "cancelled") {
            return false;
          }

          return doTimesOverlap(
            startTime,
            endTime,
            reservation
          );
        }) ?? null;

      slots.push({
        time: startTime,
        isAvailable: !conflictingReservation,
        reservation: conflictingReservation,
      });
    }

    return slots;
  }, [selectedCourtId, selectedCourtReservations]);

  const loadReservations = useCallback(
    async (date: string) => {
      setReservationsLoading(true);

      const { data, error } = await supabase
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
          total_price,
          payment_status,
          created_at
        `)
        .eq("reservation_date", date)
        .order("start_time", { ascending: true });

      if (error) {
        setMessage(
          `Rezervasyonlar yüklenemedi: ${error.message}`
        );
        setMessageType("error");
        setReservationsLoading(false);
        return;
      }

      setReservations((data ?? []) as Reservation[]);
      setReservationsLoading(false);
    },
    []
  );

  const loadInitialData = useCallback(async () => {
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

    const [facilitiesResult, courtsResult] =
      await Promise.all([
        supabase
          .from("facilities")
          .select("id, name")
          .order("name", { ascending: true }),

        supabase
          .from("courts")
          .select(`
            id,
            facility_id,
            name,
            sport_type,
            price_per_hour,
            is_active,
            facilities (
              name
            )
          `)
          .eq("is_active", true)
          .order("name", { ascending: true }),
      ]);

    if (facilitiesResult.error) {
      setMessage(
        `Tesisler yüklenemedi: ${facilitiesResult.error.message}`
      );
      setMessageType("error");
      setPageLoading(false);
      return;
    }

    if (courtsResult.error) {
      setMessage(
        `Sahalar yüklenemedi: ${courtsResult.error.message}`
      );
      setMessageType("error");
      setPageLoading(false);
      return;
    }

    const facilityData =
      (facilitiesResult.data ?? []) as Facility[];

    const courtData =
      (courtsResult.data ?? []) as Court[];

    setFacilities(facilityData);
    setCourts(courtData);

    if (courtData.length > 0) {
      setSelectedCourtId(courtData[0].id);

      setForm((currentForm) => ({
        ...currentForm,
        courtId: courtData[0].id,
      }));
    }

    setPageLoading(false);
  }, [router]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!pageLoading) {
      loadReservations(selectedDate);
    }
  }, [
    selectedDate,
    pageLoading,
    loadReservations,
  ]);

  useEffect(() => {
    if (filteredCourts.length === 0) {
      setSelectedCourtId("");
      return;
    }

    const selectedCourtStillVisible =
      filteredCourts.some(
        (court) => court.id === selectedCourtId
      );

    if (!selectedCourtStillVisible) {
      setSelectedCourtId(filteredCourts[0].id);
    }
  }, [filteredCourts, selectedCourtId]);

  const calculateSuggestedPrice = (
    courtId: string,
    startTime: string,
    endTime: string
  ) => {
    const court = courts.find(
      (courtItem) => courtItem.id === courtId
    );

    if (!court) {
      return "";
    }

    const durationInMinutes =
      timeToMinutes(endTime) -
      timeToMinutes(startTime);

    if (durationInMinutes <= 0) {
      return "";
    }

    const price =
      Number(court.price_per_hour) *
      (durationInMinutes / 60);

    return String(
      Math.round(price * 100) / 100
    );
  };

  const selectCalendarDate = (calendarDay: CalendarDay) => {
    setSelectedDate(calendarDay.dateValue);
    setSelectedReservation(null);
    setMessage("");

    if (!calendarDay.isCurrentMonth) {
      setVisibleMonth(
        new Date(
          calendarDay.date.getFullYear(),
          calendarDay.date.getMonth(),
          1
        )
      );
    }
  };

  const changeVisibleMonth = (direction: number) => {
    setVisibleMonth((currentMonth) => {
      return new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + direction,
        1
      );
    });
  };

  const goToToday = () => {
    const today = new Date();

    setVisibleMonth(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

    setSelectedDate(formatDateForInput(today));
    setSelectedReservation(null);
    setMessage("");
  };

  const openReservationForm = (
    startTime?: string,
    courtId?: string
  ) => {
    const targetCourtId =
      courtId ||
      selectedCourtId ||
      filteredCourts[0]?.id ||
      courts[0]?.id ||
      "";

    const targetStartTime = startTime || "18:00";

    const targetEndTime = addMinutesToTime(
      targetStartTime,
      SLOT_INTERVAL_MINUTES
    );

    setForm({
      ...initialForm,
      courtId: targetCourtId,
      startTime: targetStartTime,
      endTime: targetEndTime,
      totalPrice: calculateSuggestedPrice(
        targetCourtId,
        targetStartTime,
        targetEndTime
      ),
    });

    setFormMessage("");
    setMessage("");
    setSelectedReservation(null);
    setShowForm(true);
  };

  const closeReservationForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setFormMessage("");
  };

  const updateFormCourt = (courtId: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      courtId,
      totalPrice: calculateSuggestedPrice(
        courtId,
        currentForm.startTime,
        currentForm.endTime
      ),
    }));

    setFormMessage("");
  };

  const updateFormTime = (
    field: "startTime" | "endTime",
    value: string
  ) => {
    const nextForm = {
      ...form,
      [field]: value,
    };

    setForm({
      ...nextForm,
      totalPrice: calculateSuggestedPrice(
        nextForm.courtId,
        nextForm.startTime,
        nextForm.endTime
      ),
    });

    setFormMessage("");
  };

  const handleCreateReservation = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setFormMessage("");

    if (!form.courtId) {
      setFormMessage(
        "Rezervasyon için bir saha seçmelisin."
      );
      return;
    }

    if (!form.customerName.trim()) {
      setFormMessage("Müşteri adı zorunludur.");
      return;
    }

    if (
      timeToMinutes(form.endTime) <=
      timeToMinutes(form.startTime)
    ) {
      setFormMessage(
        "Bitiş saati başlangıç saatinden sonra olmalıdır."
      );
      return;
    }

    if (
      timeToMinutes(form.startTime) <
        DAY_START_HOUR * 60 ||
      timeToMinutes(form.endTime) >
        DAY_END_HOUR * 60
    ) {
      setFormMessage(
        "Rezervasyon saati 08:00 ile 24:00 arasında olmalıdır."
      );
      return;
    }

    const numericPrice = Number(form.totalPrice);

    if (
      form.totalPrice.trim() === "" ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      setFormMessage(
        "Geçerli bir toplam ücret gir."
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("reservations")
      .insert({
        court_id: form.courtId,
        customer_name: form.customerName.trim(),
        customer_phone:
          form.customerPhone.trim() || null,
        reservation_date: selectedDate,
        start_time: form.startTime,
        end_time: form.endTime,
        status: form.status,
        total_price: numericPrice,
        payment_status: form.paymentStatus,
      });

    if (error) {
      const normalizedErrorMessage =
        error.message.toLowerCase();

      const isOverlapError =
        error.code === "23P01" ||
        normalizedErrorMessage.includes(
          "reservations_no_time_overlap"
        ) ||
        normalizedErrorMessage.includes(
          "conflicting key"
        );

      if (isOverlapError) {
        setFormMessage(
          "Bu saha için seçilen saat aralığında başka bir rezervasyon bulunuyor. Lütfen farklı bir saat seç."
        );
      } else {
        setFormMessage(
          `Rezervasyon oluşturulamadı: ${error.message}`
        );
      }

      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setFormMessage("");
    setForm(initialForm);

    await loadReservations(selectedDate);

    setMessage(
      "Rezervasyon başarıyla oluşturuldu."
    );
    setMessageType("success");
  };

  const handleCancelReservation = async (
    reservation: Reservation
  ) => {
    const confirmed = window.confirm(
      `${reservation.customer_name} adına oluşturulan rezervasyonu iptal etmek istediğine emin misin?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
      })
      .eq("id", reservation.id);

    if (error) {
      setMessage(
        `Rezervasyon iptal edilemedi: ${error.message}`
      );
      setMessageType("error");
      return;
    }

    setSelectedReservation(null);

    await loadReservations(selectedDate);

    setMessage("Rezervasyon iptal edildi.");
    setMessageType("success");
  };

  const handleCompleteReservation = async (
    reservation: Reservation
  ) => {
    const { error } = await supabase
      .from("reservations")
      .update({
        status: "completed",
      })
      .eq("id", reservation.id);

    if (error) {
      setMessage(
        `Rezervasyon güncellenemedi: ${error.message}`
      );
      setMessageType("error");
      return;
    }

    setSelectedReservation(null);

    await loadReservations(selectedDate);

    setMessage(
      "Rezervasyon tamamlandı olarak işaretlendi."
    );
    setMessageType("success");
  };

  const handleMarkAsPaid = async (
    reservation: Reservation
  ) => {
    const { error } = await supabase
      .from("reservations")
      .update({
        payment_status: "paid",
      })
      .eq("id", reservation.id);

    if (error) {
      setMessage(
        `Ödeme durumu güncellenemedi: ${error.message}`
      );
      setMessageType("error");
      return;
    }

    setSelectedReservation(null);

    await loadReservations(selectedDate);

    setMessage(
      "Rezervasyon ödendi olarak işaretlendi."
    );
    setMessageType("success");
  };

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-gray-400">
          Rezervasyon ekranı hazırlanıyor...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 border-b border-gray-800 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 transition hover:text-white"
            >
              ← Dashboard
            </Link>

            <p className="mt-6 text-xs uppercase tracking-[0.35em] text-gray-500">
              SportOS
            </p>

            <h1 className="mt-3 text-3xl font-bold md:text-4xl">
              Rezervasyonlar
            </h1>

            <p className="mt-3 max-w-2xl text-gray-400">
              Tarihi, tesisi ve sahayı seç. Uygun saat
              üzerinden hızlıca rezervasyon oluştur.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openReservationForm()}
            disabled={courts.length === 0}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeni Rezervasyon
          </button>
        </header>

        {message && (
          <div
            className={`mt-6 rounded-xl border px-5 py-4 text-sm ${
              messageType === "error"
                ? "border-red-900 bg-red-950/30 text-red-200"
                : "border-emerald-900 bg-emerald-950/30 text-emerald-200"
            }`}
          >
            {message}
          </div>
        )}

        {courts.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-gray-800 bg-neutral-950 p-10 text-center">
            <h2 className="text-xl font-semibold">
              Rezervasyon oluşturmak için saha gerekiyor
            </h2>

            <p className="mt-3 text-gray-500">
              Önce en az bir aktif saha oluşturmalısın.
            </p>

            <Link
              href="/dashboard/courts"
              className="mt-6 inline-block rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Sahalara Git
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-gray-800 bg-neutral-950 px-5 py-4">
                <p className="text-sm text-gray-500">
                  Günlük Rezervasyon
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {activeReservations.length}
                </p>
              </article>

              <article className="rounded-2xl border border-gray-800 bg-neutral-950 px-5 py-4">
                <p className="text-sm text-gray-500">
                  Günlük Ciro
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(dailyRevenue)}
                </p>
              </article>

              <article className="rounded-2xl border border-gray-800 bg-neutral-950 px-5 py-4">
                <p className="text-sm text-gray-500">
                  Tahsil Edilen
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {formatCurrency(collectedRevenue)}
                </p>
              </article>
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-gray-800 bg-neutral-950 shadow-2xl">
              <div className="grid lg:grid-cols-[420px_minmax(0,1fr)]">
                <div className="border-b border-gray-800 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        changeVisibleMonth(-1)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition hover:border-white hover:text-white"
                      aria-label="Önceki ay"
                    >
                      ←
                    </button>

                    <div className="text-center">
                      <p className="text-xs uppercase tracking-[0.25em] text-gray-500">
                        Tarih Seç
                      </p>

                      <h2 className="mt-2 text-lg font-semibold capitalize">
                        {formatMonthTitle(visibleMonth)}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        changeVisibleMonth(1)
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition hover:border-white hover:text-white"
                      aria-label="Sonraki ay"
                    >
                      →
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={goToToday}
                    className="mt-5 w-full rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition hover:border-white hover:text-white"
                  >
                    Bugüne Git
                  </button>

                  <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs text-gray-600">
                    {[
                      "Pzt",
                      "Sal",
                      "Çar",
                      "Per",
                      "Cum",
                      "Cmt",
                      "Paz",
                    ].map((dayName) => (
                      <div
                        key={dayName}
                        className="py-2"
                      >
                        {dayName}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((calendarDay) => (
                      <button
                        key={calendarDay.dateValue}
                        type="button"
                        onClick={() =>
                          selectCalendarDate(calendarDay)
                        }
                        className={`relative flex aspect-square items-center justify-center rounded-xl text-sm transition ${
                          calendarDay.isSelected
                            ? "bg-white font-semibold text-black"
                            : calendarDay.isCurrentMonth
                              ? "text-white hover:bg-gray-800"
                              : "text-gray-700 hover:bg-gray-900"
                        }`}
                      >
                        {calendarDay.dayNumber}

                        {calendarDay.isToday &&
                          !calendarDay.isSelected && (
                            <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-white" />
                          )}
                      </button>
                    ))}
                  </div>

                  <div className="mt-7 rounded-2xl border border-gray-800 bg-black p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-600">
                      Seçilen Tarih
                    </p>

                    <p className="mt-2 text-sm font-medium capitalize">
                      {formatDateForDisplay(selectedDate)}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-7">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500">
                        Tesis
                      </label>

                      <select
                        value={selectedFacilityId}
                        onChange={(event) => {
                          setSelectedFacilityId(
                            event.target.value
                          );
                          setMessage("");
                        }}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition focus:border-white"
                      >
                        <option value="all">
                          Tüm Tesisler
                        </option>

                        {facilities.map((facility) => (
                          <option
                            key={facility.id}
                            value={facility.id}
                          >
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
                        onChange={(event) => {
                          setSelectedCourtId(
                            event.target.value
                          );
                          setMessage("");
                        }}
                        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm outline-none transition focus:border-white"
                      >
                        {filteredCourts.map((court) => (
                          <option
                            key={court.id}
                            value={court.id}
                          >
                            {court.name} ·{" "}
                            {court.sport_type}
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
                          {selectedCourt.facilities?.[0]
                            ?.name || "Tesis"}{" "}
                          · {selectedCourt.sport_type}
                        </p>
                      </div>

                      <p className="text-sm font-semibold">
                        {formatCurrency(
                          Number(
                            selectedCourt.price_per_hour
                          )
                        )}
                        <span className="font-normal text-gray-500">
                          {" "}
                          / saat
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
                              openReservationForm(
                                slot.time,
                                selectedCourtId
                              )
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
                        {
                          selectedCourtActiveReservations.length
                        }{" "}
                        rezervasyon
                      </span>
                    </div>

                    {selectedCourtReservations.length ===
                    0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-gray-800 p-7 text-center">
                        <p className="font-medium">
                          Bu sahada rezervasyon yok
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                          Uygun saatlerden birini seçerek
                          rezervasyon oluşturabilirsin.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">
                        {selectedCourtReservations.map(
                          (reservation) => {
                            const isCancelled =
                              reservation.status ===
                              "cancelled";

                            return (
                              <button
                                key={reservation.id}
                                type="button"
                                onClick={() =>
                                  setSelectedReservation(
                                    reservation
                                  )
                                }
                                className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition hover:border-gray-500 ${
                                  isCancelled
                                    ? "border-gray-800 bg-gray-900/50 opacity-60"
                                    : "border-gray-800 bg-black"
                                }`}
                              >
                                <div className="flex min-w-0 items-center gap-4">
                                  <div
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                                      reservation.payment_status ===
                                      "paid"
                                        ? "bg-emerald-950 text-emerald-300"
                                        : reservation.status ===
                                            "pending"
                                          ? "bg-amber-950 text-amber-300"
                                          : isCancelled
                                            ? "bg-gray-800 text-gray-500"
                                            : "bg-blue-950 text-blue-300"
                                    }`}
                                  >
                                    {normalizeTime(
                                      reservation.start_time
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <p
                                      className={`truncate font-medium ${
                                        isCancelled
                                          ? "line-through"
                                          : ""
                                      }`}
                                    >
                                      {
                                        reservation.customer_name
                                      }
                                    </p>

                                    <p className="mt-1 truncate text-xs text-gray-500">
                                      {normalizeTime(
                                        reservation.start_time
                                      )}{" "}
                                      –{" "}
                                      {normalizeTime(
                                        reservation.end_time
                                      )}{" "}
                                      ·{" "}
                                      {getStatusLabel(
                                        reservation.status
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-semibold">
                                    {formatCurrency(
                                      Number(
                                        reservation.total_price
                                      )
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
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-800 bg-neutral-950 p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  Yeni Rezervasyon
                </p>

                <h2 className="mt-3 text-2xl font-semibold">
                  Rezervasyon bilgileri
                </h2>

                <p className="mt-2 capitalize text-sm text-gray-500">
                  {formatDateForDisplay(selectedDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReservationForm}
                disabled={saving}
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:border-white hover:text-white disabled:opacity-50"
              >
                Kapat
              </button>
            </div>

            {formMessage && (
              <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-4 text-sm text-red-200">
                <p className="font-medium">
                  Rezervasyon oluşturulamadı
                </p>

                <p className="mt-1 text-red-300">
                  {formMessage}
                </p>
              </div>
            )}

            <form
              onSubmit={handleCreateReservation}
              className="mt-7 grid gap-5 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-gray-300">
                  Saha
                </label>

                <select
                  value={form.courtId}
                  onChange={(event) =>
                    updateFormCourt(event.target.value)
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
                >
                  {courts.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.facilities?.[0]?.name ||
                        "Tesis"}{" "}
                      — {court.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Müşteri Adı
                </label>

                <input
                  type="text"
                  value={form.customerName}
                  onChange={(event) => {
                    setForm((currentForm) => ({
                      ...currentForm,
                      customerName: event.target.value,
                    }));

                    setFormMessage("");
                  }}
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
                    setForm((currentForm) => ({
                      ...currentForm,
                      customerPhone: event.target.value,
                    }))
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
                    updateFormTime(
                      "startTime",
                      event.target.value
                    )
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
                    updateFormTime(
                      "endTime",
                      event.target.value
                    )
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
                    setForm((currentForm) => ({
                      ...currentForm,
                      status: event.target
                        .value as ReservationStatus,
                    }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
                >
                  <option value="confirmed">
                    Onaylandı
                  </option>

                  <option value="pending">
                    Bekliyor
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Ödeme Durumu
                </label>

                <select
                  value={form.paymentStatus}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      paymentStatus: event.target
                        .value as PaymentStatus,
                    }))
                  }
                  disabled={saving}
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 outline-none focus:border-white disabled:opacity-60"
                >
                  <option value="unpaid">
                    Ödenmedi
                  </option>

                  <option value="partial">
                    Kısmi Ödendi
                  </option>

                  <option value="paid">
                    Ödendi
                  </option>
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
                    onChange={(event) => {
                      setForm((currentForm) => ({
                        ...currentForm,
                        totalPrice: event.target.value,
                      }));

                      setFormMessage("");
                    }}
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
                  onClick={closeReservationForm}
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
                    : "Rezervasyonu Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-gray-800 bg-neutral-950 p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                  Rezervasyon Detayı
                </p>

                <h2 className="mt-3 text-2xl font-semibold">
                  {selectedReservation.customer_name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReservation(null)
                }
                className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:border-white hover:text-white"
              >
                Kapat
              </button>
            </div>

            <div className="mt-7 space-y-4 border-y border-gray-800 py-6 text-sm">
              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Saha
                </span>

                <span className="text-right font-medium">
                  {courts.find(
                    (court) =>
                      court.id ===
                      selectedReservation.court_id
                  )?.name || "Saha"}
                </span>
              </div>

              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Tarih
                </span>

                <span className="text-right capitalize">
                  {formatDateForDisplay(
                    selectedReservation.reservation_date
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Saat
                </span>

                <span>
                  {normalizeTime(
                    selectedReservation.start_time
                  )}{" "}
                  –{" "}
                  {normalizeTime(
                    selectedReservation.end_time
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Telefon
                </span>

                <span>
                  {selectedReservation.customer_phone ||
                    "Belirtilmedi"}
                </span>
              </div>

              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Durum
                </span>

                <span>
                  {getStatusLabel(
                    selectedReservation.status
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Ödeme
                </span>

                <span>
                  {getPaymentStatusLabel(
                    selectedReservation.payment_status
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-5">
                <span className="text-gray-500">
                  Toplam Tutar
                </span>

                <span className="font-semibold">
                  {formatCurrency(
                    Number(
                      selectedReservation.total_price
                    )
                  )}
                </span>
              </div>
            </div>

            {selectedReservation.status !==
              "cancelled" && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {selectedReservation.payment_status !==
                  "paid" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleMarkAsPaid(
                        selectedReservation
                      )
                    }
                    className="rounded-xl border border-emerald-800 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-950"
                  >
                    Ödendi İşaretle
                  </button>
                )}

                {selectedReservation.status !==
                  "completed" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCompleteReservation(
                        selectedReservation
                      )
                    }
                    className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-medium transition hover:border-white"
                  >
                    Tamamlandı İşaretle
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleCancelReservation(
                      selectedReservation
                    )
                  }
                  className="rounded-xl border border-red-900 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950 sm:col-span-2"
                >
                  Rezervasyonu İptal Et
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}