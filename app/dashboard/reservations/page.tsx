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
import { ReservationCalendar } from "./components/ReservationCalendar";
import { ReservationDetailModal } from "./components/ReservationDetailModal";
import { ReservationFormModal } from "./components/ReservationFormModal";
import { ReservationSchedulePanel } from "./components/ReservationSchedulePanel";
import { UpcomingReservationsList } from "./components/UpcomingReservationsList";
import type {
  CalendarDay,
  Court,
  Customer,
  Facility,
  Reservation,
  ReservationAuditLog,
  ReservationForm,
  TimeSlot,
} from "./types";
import {
  addMinutesToTime,
  DAY_END_HOUR,
  DAY_START_HOUR,
  doTimesOverlap,
  formatCurrency,
  formatDateForInput,
  getCalendarDays,
  getReservationFormError,
  getReservationDateTime,
  hasReservationScheduleChanged,
  initialForm,
  isReservationDurationAllowed,
  isReservationTimeAllowed,
  minutesToTime,
  normalizeTime,
  parseDateValue,
  SLOT_INTERVAL_MINUTES,
  timeToMinutes,
} from "./utils";

export default function ReservationsPage() {
  const router = useRouter();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reservations, setReservations] = useState<
    Reservation[]
  >([]);
  const [upcomingReservations, setUpcomingReservations] =
    useState<Reservation[]>([]);

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
  const [upcomingReservationsLoading, setUpcomingReservationsLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(selectedDate);
  const [editingReservation, setEditingReservation] =
    useState<Reservation | null>(null);

  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [reservationAuditLogs, setReservationAuditLogs] =
    useState<ReservationAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

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

  const reservationCounts = useMemo(() => {
    return upcomingReservations.reduce<Record<string, number>>(
      (counts, reservation) => {
        if (reservation.status === "cancelled") {
          return counts;
        }

        return {
          ...counts,
          [reservation.reservation_date]:
            (counts[reservation.reservation_date] ?? 0) + 1,
        };
      },
      {}
    );
  }, [upcomingReservations]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(
      visibleMonth,
      selectedDate,
      reservationCounts
    );
  }, [visibleMonth, selectedDate, reservationCounts]);

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

      const meetsLeadTime = isReservationTimeAllowed(
        selectedDate,
        startTime
      );

      slots.push({
        time: startTime,
        isAvailable:
          !conflictingReservation && meetsLeadTime,
        reservation: conflictingReservation,
        unavailableReason: conflictingReservation
          ? "reserved"
          : meetsLeadTime
            ? null
            : "lead-time",
      });
    }

    return slots;
  }, [
    selectedCourtId,
    selectedCourtReservations,
    selectedDate,
  ]);

  const loadReservations = useCallback(
    async (date: string) => {
      setReservationsLoading(true);

      const { data, error } = await supabase
        .from("reservations")
        .select(`
          id,
          court_id,
          customer_id,
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

  const loadUpcomingReservations = useCallback(async () => {
    setUpcomingReservationsLoading(true);

    const todayValue = formatDateForInput(new Date());
    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id,
        court_id,
        customer_id,
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
      .gte("reservation_date", todayValue)
      .order("reservation_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      setMessage(
        `Gelecek rezervasyonlar yüklenemedi: ${error.message}`
      );
      setMessageType("error");
      setUpcomingReservationsLoading(false);
      return;
    }

    const now = new Date();
    const futureReservations = (
      (data ?? []) as Reservation[]
    ).filter(
      (reservation) =>
        getReservationDateTime(
          reservation.reservation_date,
          reservation.start_time
        ) >= now
    );

    setUpcomingReservations(futureReservations);
    setUpcomingReservationsLoading(false);
  }, []);

  const loadReservationAuditLogs = useCallback(
    async (reservationId: string) => {
      setAuditLoading(true);
      setAuditError("");

      const { data, error } = await supabase
        .from("reservation_audit_logs")
        .select(`
          id,
          reservation_id,
          court_id,
          operation,
          old_record,
          new_record,
          changed_by,
          changed_at
        `)
        .eq("reservation_id", reservationId)
        .order("changed_at", { ascending: false });

      if (error) {
        setReservationAuditLogs([]);
        setAuditError(
          `Değişiklik geçmişi yüklenemedi: ${error.message}`
        );
        setAuditLoading(false);
        return;
      }

      setReservationAuditLogs(
        (data ?? []) as ReservationAuditLog[]
      );
      setAuditLoading(false);
    },
    []
  );

  const openReservationDetails = (
    reservation: Reservation
  ) => {
    setSelectedReservation(reservation);
    setReservationAuditLogs([]);
    void loadReservationAuditLogs(reservation.id);
  };

  const closeReservationDetails = () => {
    setSelectedReservation(null);
    setReservationAuditLogs([]);
    setAuditError("");
  };

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

    const [facilitiesResult, courtsResult, customersResult] =
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

        supabase
          .from("customers")
          .select("id, full_name, phone, email")
          .order("full_name", { ascending: true }),
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

    if (customersResult.error) {
      setMessage(
        `Müşteriler yüklenemedi: ${customersResult.error.message}`
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
    setCustomers((customersResult.data ?? []) as Customer[]);

    if (courtData.length > 0) {
      setSelectedCourtId(courtData[0].id);

      setForm((currentForm) => ({
        ...currentForm,
        courtId: courtData[0].id,
      }));
    }

    await loadUpcomingReservations();

    setPageLoading(false);
  }, [router, loadUpcomingReservations]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadInitialData]);

  useEffect(() => {
    if (pageLoading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadReservations(selectedDate);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    selectedDate,
    pageLoading,
    loadReservations,
  ]);

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
    if (calendarDay.isPast) {
      return;
    }

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

    const defaultStartTime = isReservationTimeAllowed(
      selectedDate,
      "18:00"
    )
      ? "18:00"
      : timeSlots.find((slot) => slot.isAvailable)?.time;

    if (!startTime && !defaultStartTime) {
      setMessage(
        "Bugün için en az 3 saat önceden oluşturulabilecek uygun bir rezervasyon saati kalmadı."
      );
      setMessageType("error");
      return;
    }

    const targetStartTime =
      startTime || defaultStartTime || "18:00";

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

    setFormDate(selectedDate);
    setEditingReservation(null);
    setFormMessage("");
    setMessage("");
    setSelectedReservation(null);
    setShowForm(true);
  };

  const openReservationEditForm = (
    reservation: Reservation
  ) => {
    setForm({
      courtId: reservation.court_id,
      customerId: reservation.customer_id ?? "",
      customerName: reservation.customer_name,
      customerPhone: reservation.customer_phone ?? "",
      startTime: normalizeTime(reservation.start_time),
      endTime: normalizeTime(reservation.end_time),
      status: reservation.status,
      paymentStatus: reservation.payment_status,
      totalPrice: String(reservation.total_price),
      saveCustomer: false,
    });
    setFormDate(reservation.reservation_date);
    setEditingReservation(reservation);
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
    setEditingReservation(null);
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

  const handleSaveReservation = async (
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

    if (
      !isReservationDurationAllowed(
        form.startTime,
        form.endTime
      )
    ) {
      setFormMessage(
        "Standart rezervasyon süresi en fazla 2 saat olabilir. Daha uzun kiralama veya özel etkinlik için e-posta ile iletişime geç."
      );
      return;
    }

    const scheduleChanged =
      !editingReservation ||
      hasReservationScheduleChanged(
        editingReservation,
        formDate,
        form.courtId,
        form.startTime,
        form.endTime
      );

    if (
      scheduleChanged &&
      !isReservationTimeAllowed(
        formDate,
        form.startTime
      )
    ) {
      setFormMessage(
        "Rezervasyon başlangıcına en az 3 saat kalmalıdır. Geçmiş tarih ve saatler için rezervasyon oluşturamazsın."
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

    let customerId = form.customerId || null;
    let createdCustomer: Customer | null = null;

    if (!customerId && form.saveCustomer) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSaving(false);
        router.push("/login");
        return;
      }

      const { data: newCustomer, error: customerError } =
        await supabase
          .from("customers")
          .insert({
            owner_id: user.id,
            full_name: form.customerName.trim(),
            phone: form.customerPhone.trim() || null,
            email: null,
            notes: null,
          })
          .select("id, full_name, phone, email")
          .single();

      if (customerError) {
        setFormMessage(
          customerError.code === "23505"
            ? "Bu telefon numarasıyla kayıtlı bir müşteri zaten bulunuyor. Kayıtlı müşteriyi arayıp seçebilirsin."
            : `Müşteri oluşturulamadı: ${customerError.message}`
        );
        setSaving(false);
        return;
      }

      customerId = newCustomer.id;
      createdCustomer = newCustomer as Customer;
    }

    const reservationValues = {
      court_id: form.courtId,
      customer_id: customerId,
      customer_name: form.customerName.trim(),
      customer_phone: form.customerPhone.trim() || null,
      reservation_date: formDate,
      start_time: form.startTime,
      end_time: form.endTime,
      status: form.status,
      total_price: numericPrice,
      payment_status: form.paymentStatus,
    };

    const { error } = editingReservation
      ? await supabase
          .from("reservations")
          .update(
            scheduleChanged
              ? reservationValues
              : {
                  customer_name:
                    reservationValues.customer_name,
                  customer_phone:
                    reservationValues.customer_phone,
                  customer_id: reservationValues.customer_id,
                  status: reservationValues.status,
                  total_price: reservationValues.total_price,
                  payment_status:
                    reservationValues.payment_status,
                }
          )
          .eq("id", editingReservation.id)
      : await supabase
          .from("reservations")
          .insert(reservationValues);

    if (error) {
      if (createdCustomer) {
        await supabase
          .from("customers")
          .delete()
          .eq("id", createdCustomer.id);
      }

      setFormMessage(
        getReservationFormError(
          error,
          editingReservation ? "update" : "create"
        )
      );

      setSaving(false);
      return;
    }

    if (createdCustomer) {
      setCustomers((currentCustomers) =>
        [...currentCustomers, createdCustomer as Customer].sort(
          (firstCustomer, secondCustomer) =>
            firstCustomer.full_name.localeCompare(
              secondCustomer.full_name,
              "tr"
            )
        )
      );
    }

    setSaving(false);
    setShowForm(false);
    setFormMessage("");
    setForm(initialForm);
    setEditingReservation(null);

    if (formDate !== selectedDate) {
      const updatedDate = parseDateValue(formDate);
      setSelectedDate(formDate);
      setVisibleMonth(
        new Date(
          updatedDate.getFullYear(),
          updatedDate.getMonth(),
          1
        )
      );
    }

    await Promise.all([
      loadReservations(formDate),
      loadUpcomingReservations(),
    ]);

    setMessage(
      editingReservation
        ? "Rezervasyon başarıyla güncellendi."
        : "Rezervasyon başarıyla oluşturuldu."
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

    await Promise.all([
      loadReservations(selectedDate),
      loadUpcomingReservations(),
    ]);

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

    await Promise.all([
      loadReservations(selectedDate),
      loadUpcomingReservations(),
    ]);

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

    await Promise.all([
      loadReservations(selectedDate),
      loadUpcomingReservations(),
    ]);

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
                <ReservationCalendar
                  calendarDays={calendarDays}
                  selectedDate={selectedDate}
                  visibleMonth={visibleMonth}
                  onChangeMonth={changeVisibleMonth}
                  onGoToToday={goToToday}
                  onSelectDate={selectCalendarDate}
                />

                <ReservationSchedulePanel
                  facilities={facilities}
                  filteredCourts={filteredCourts}
                  reservationsLoading={reservationsLoading}
                  selectedCourt={selectedCourt}
                  selectedCourtActiveReservations={
                    selectedCourtActiveReservations
                  }
                  selectedCourtId={selectedCourtId}
                  selectedCourtReservations={
                    selectedCourtReservations
                  }
                  selectedFacilityId={selectedFacilityId}
                  timeSlots={timeSlots}
                  onCourtChange={(courtId) => {
                    setSelectedCourtId(courtId);
                    setMessage("");
                  }}
                  onFacilityChange={(facilityId) => {
                    setSelectedFacilityId(facilityId);
                    const availableCourts = courts.filter(
                      (court) =>
                        facilityId === "all" ||
                        court.facility_id === facilityId
                    );

                    setSelectedCourtId((currentCourtId) => {
                      const currentCourtIsAvailable =
                        availableCourts.some(
                          (court) => court.id === currentCourtId
                        );

                      return currentCourtIsAvailable
                        ? currentCourtId
                        : availableCourts[0]?.id ?? "";
                    });
                    setMessage("");
                  }}
                  onOpenReservation={openReservationForm}
                  onSelectReservation={openReservationDetails}
                />
              </div>
            </section>

            <UpcomingReservationsList
              courts={courts}
              facilities={facilities}
              loading={upcomingReservationsLoading}
              reservations={upcomingReservations}
              onSelectReservation={openReservationDetails}
            />
          </>
        )}
      </div>

      {showForm && (
        <ReservationFormModal
          courts={courts}
          customers={customers}
          mode={editingReservation ? "edit" : "create"}
          form={form}
          formMessage={formMessage}
          reservationDate={formDate}
          saving={saving}
          onClose={closeReservationForm}
          onCourtChange={updateFormCourt}
          onCustomerNameChange={(customerName) => {
            setForm((currentForm) => ({
              ...currentForm,
              customerName,
            }));
            setFormMessage("");
          }}
          onCustomerPhoneChange={(customerPhone) =>
            setForm((currentForm) => ({
              ...currentForm,
              customerPhone,
            }))
          }
          onCustomerSelect={(customer) => {
            setForm((currentForm) => ({
              ...currentForm,
              customerId: customer?.id ?? "",
              customerName:
                customer?.full_name ?? currentForm.customerName,
              customerPhone:
                customer?.phone ??
                (customer ? "" : currentForm.customerPhone),
              saveCustomer: false,
            }));
            setFormMessage("");
          }}
          onDateChange={(reservationDate) => {
            setFormDate(reservationDate);
            setFormMessage("");
          }}
          onPaymentStatusChange={(paymentStatus) =>
            setForm((currentForm) => ({
              ...currentForm,
              paymentStatus,
            }))
          }
          onSaveCustomerChange={(saveCustomer) =>
            setForm((currentForm) => ({
              ...currentForm,
              saveCustomer,
            }))
          }
          onStatusChange={(status) =>
            setForm((currentForm) => ({
              ...currentForm,
              status,
            }))
          }
          onSubmit={handleSaveReservation}
          onTimeChange={updateFormTime}
          onTotalPriceChange={(totalPrice) => {
            setForm((currentForm) => ({
              ...currentForm,
              totalPrice,
            }));
            setFormMessage("");
          }}
        />
      )}

      {selectedReservation && (
        <ReservationDetailModal
          auditError={auditError}
          auditLoading={auditLoading}
          auditLogs={reservationAuditLogs}
          courts={courts}
          reservation={selectedReservation}
          onCancel={() =>
            handleCancelReservation(selectedReservation)
          }
          onClose={closeReservationDetails}
          onComplete={() =>
            handleCompleteReservation(selectedReservation)
          }
          onEdit={() =>
            openReservationEditForm(selectedReservation)
          }
          onMarkAsPaid={() =>
            handleMarkAsPaid(selectedReservation)
          }
        />
      )}
    </main>
  );
}
