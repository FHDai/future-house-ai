import type {
  CalendarDay,
  PaymentStatus,
  Reservation,
  ReservationForm,
  ReservationStatus,
} from "./types";

export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 24;
export const SLOT_INTERVAL_MINUTES = 60;
export const RESERVATION_LEAD_TIME_MINUTES = 180;

export const initialForm: ReservationForm = {
  courtId: "",
  customerName: "",
  customerPhone: "",
  startTime: "18:00",
  endTime: "19:00",
  status: "confirmed",
  paymentStatus: "unpaid",
  totalPrice: "",
};

export function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateValue(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function getReservationDateTime(
  dateValue: string,
  time: string
) {
  const date = parseDateValue(dateValue);
  const [hour, minute] = normalizeTime(time)
    .split(":")
    .map(Number);

  date.setHours(hour, minute, 0, 0);

  return date;
}

export function isReservationTimeAllowed(
  dateValue: string,
  startTime: string,
  now = new Date()
) {
  const reservationTime = getReservationDateTime(
    dateValue,
    startTime
  );
  const earliestAllowedTime = new Date(
    now.getTime() + RESERVATION_LEAD_TIME_MINUTES * 60 * 1000
  );

  return reservationTime >= earliestAllowedTime;
}

export function formatDateForDisplay(dateValue: string) {
  const date = parseDateValue(dateValue);

  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function normalizeTime(time: string) {
  return time.slice(0, 5);
}

export function timeToMinutes(time: string) {
  const normalizedTime = normalizeTime(time);
  const [hour, minute] = normalizedTime.split(":").map(Number);

  return hour * 60 + minute;
}

export function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(
    minute
  ).padStart(2, "0")}`;
}

export function addMinutesToTime(
  time: string,
  minutesToAdd: number
) {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;

  return minutesToTime(totalMinutes);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getStatusLabel(status: ReservationStatus) {
  const labels: Record<ReservationStatus, string> = {
    pending: "Bekliyor",
    confirmed: "Onaylandı",
    cancelled: "İptal",
    completed: "Tamamlandı",
  };

  return labels[status];
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    unpaid: "Ödenmedi",
    partial: "Kısmi Ödendi",
    paid: "Ödendi",
    refunded: "İade Edildi",
  };

  return labels[status];
}

export function getCalendarDays(
  visibleMonth: Date,
  selectedDate: string,
  reservationCounts: Record<string, number> = {},
  today = new Date()
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
  const todayValue = formatDateForInput(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStartDate);
    date.setDate(calendarStartDate.getDate() + index);

    const dateValue = formatDateForInput(date);

    return {
      date,
      dateValue,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isPast: dateValue < todayValue,
      reservationCount: reservationCounts[dateValue] ?? 0,
      isToday: dateValue === todayValue,
      isSelected: dateValue === selectedDate,
    };
  });
}

export function doTimesOverlap(
  startTime: string,
  endTime: string,
  reservation: Reservation
) {
  const slotStart = timeToMinutes(startTime);
  const slotEnd = timeToMinutes(endTime);
  const reservationStart = timeToMinutes(
    reservation.start_time
  );
  const reservationEnd = timeToMinutes(reservation.end_time);

  return (
    slotStart < reservationEnd &&
    slotEnd > reservationStart
  );
}
