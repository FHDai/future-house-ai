import { describe, expect, it } from "vitest";

import type { Reservation } from "./types";
import {
  buildSpecialBookingMailto,
  doTimesOverlap,
  getCalendarDays,
  getReservationAuditChanges,
  getReservationFormError,
  hasReservationScheduleChanged,
  isReservationDurationAllowed,
  isReservationTimeAllowed,
} from "./utils";

describe("isReservationTimeAllowed", () => {
  const now = new Date(2026, 6, 31, 12, 0, 0);

  it("allows a reservation exactly three hours later", () => {
    expect(
      isReservationTimeAllowed("2026-07-31", "15:00", now)
    ).toBe(true);
  });

  it("rejects a reservation less than three hours later", () => {
    expect(
      isReservationTimeAllowed("2026-07-31", "14:59", now)
    ).toBe(false);
  });

  it("rejects a reservation in the past", () => {
    expect(
      isReservationTimeAllowed("2026-07-30", "18:00", now)
    ).toBe(false);
  });
});

describe("isReservationDurationAllowed", () => {
  it("allows reservations up to exactly two hours", () => {
    expect(isReservationDurationAllowed("10:00", "11:00")).toBe(
      true
    );
    expect(isReservationDurationAllowed("10:00", "12:00")).toBe(
      true
    );
  });

  it("rejects longer and invalid reservations", () => {
    expect(isReservationDurationAllowed("10:00", "12:01")).toBe(
      false
    );
    expect(isReservationDurationAllowed("10:00", "10:00")).toBe(
      false
    );
  });
});

describe("buildSpecialBookingMailto", () => {
  it("creates a prefilled email to the booking contact", () => {
    const mailto = buildSpecialBookingMailto({
      courtName: "Merkez Saha",
      customerName: "Ali Yılmaz",
      endTime: "14:00",
      reservationDate: "2026-08-10",
      startTime: "10:00",
    });

    expect(mailto).toContain("mailto:kerem@futurehouse.digital");
    expect(decodeURIComponent(mailto)).toContain("Ali Yılmaz");
    expect(decodeURIComponent(mailto)).toContain("Merkez Saha");
  });
});

describe("getCalendarDays", () => {
  it("marks past, selected and reserved days correctly", () => {
    const days = getCalendarDays(
      new Date(2026, 6, 1),
      "2026-07-31",
      {
        "2026-07-31": 2,
        "2026-08-01": 1,
      },
      new Date(2026, 6, 31, 12, 0, 0)
    );

    const previousDay = days.find(
      (day) => day.dateValue === "2026-07-30"
    );
    const today = days.find(
      (day) => day.dateValue === "2026-07-31"
    );
    const nextMonthDay = days.find(
      (day) => day.dateValue === "2026-08-01"
    );

    expect(days).toHaveLength(42);
    expect(previousDay?.isPast).toBe(true);
    expect(today).toMatchObject({
      isPast: false,
      isToday: true,
      isSelected: true,
      reservationCount: 2,
    });
    expect(nextMonthDay).toMatchObject({
      isCurrentMonth: false,
      isPast: false,
      reservationCount: 1,
    });
  });
});

describe("doTimesOverlap", () => {
  const reservation: Reservation = {
    id: "reservation-1",
    court_id: "court-1",
    customer_id: null,
    customer_name: "Test Müşteri",
    customer_phone: null,
    reservation_date: "2026-08-01",
    start_time: "10:00:00",
    end_time: "11:00:00",
    status: "confirmed",
    total_price: 500,
    payment_status: "unpaid",
    created_at: "2026-07-31T12:00:00.000Z",
  };

  it("detects overlapping time ranges", () => {
    expect(doTimesOverlap("09:30", "10:30", reservation)).toBe(
      true
    );
    expect(doTimesOverlap("10:30", "11:30", reservation)).toBe(
      true
    );
  });

  it("allows adjacent time ranges", () => {
    expect(doTimesOverlap("09:00", "10:00", reservation)).toBe(
      false
    );
    expect(doTimesOverlap("11:00", "12:00", reservation)).toBe(
      false
    );
  });
});

describe("getReservationFormError", () => {
  it("returns a clear message for database time conflicts", () => {
    expect(
      getReservationFormError({
        code: "23P01",
        message: "conflicting key violates exclusion constraint",
      })
    ).toBe(
      "Bu saha için seçilen saat aralığında başka bir rezervasyon bulunuyor. Lütfen farklı bir saat seç."
    );
  });

  it("returns a clear message for booking window violations", () => {
    expect(
      getReservationFormError({
        code: "P0001",
        message: "reservations_booking_window_violation",
      })
    ).toContain("en az 3 saat");
  });

  it("returns a clear message for customer ownership violations", () => {
    expect(
      getReservationFormError({
        code: "P0001",
        message: "reservation_customer_ownership_violation",
      })
    ).toContain("bu işletmeye ait değil");
  });

  it("keeps unexpected database errors visible", () => {
    expect(
      getReservationFormError({
        code: "UNKNOWN",
        message: "Unexpected database error",
      })
    ).toBe(
      "Rezervasyon oluşturulamadı: Unexpected database error"
    );
  });
});

describe("hasReservationScheduleChanged", () => {
  const reservation: Reservation = {
    id: "reservation-1",
    court_id: "court-1",
    customer_id: null,
    customer_name: "Test Müşteri",
    customer_phone: null,
    reservation_date: "2026-08-01",
    start_time: "10:00:00",
    end_time: "11:00:00",
    status: "confirmed",
    total_price: 500,
    payment_status: "unpaid",
    created_at: "2026-07-31T12:00:00.000Z",
  };

  it("ignores database time precision when the schedule is unchanged", () => {
    expect(
      hasReservationScheduleChanged(
        reservation,
        "2026-08-01",
        "court-1",
        "10:00",
        "11:00"
      )
    ).toBe(false);
  });

  it("detects date, court and time changes", () => {
    expect(
      hasReservationScheduleChanged(
        reservation,
        "2026-08-02",
        "court-1",
        "10:00",
        "11:00"
      )
    ).toBe(true);
    expect(
      hasReservationScheduleChanged(
        reservation,
        "2026-08-01",
        "court-2",
        "10:00",
        "11:00"
      )
    ).toBe(true);
    expect(
      hasReservationScheduleChanged(
        reservation,
        "2026-08-01",
        "court-1",
        "10:30",
        "11:30"
      )
    ).toBe(true);
  });
});

describe("getReservationAuditChanges", () => {
  it("describes creation and deletion events", () => {
    const baseLog = {
      id: "audit-1",
      reservation_id: "reservation-1",
      court_id: "court-1",
      old_record: null,
      new_record: null,
      changed_by: "user-1",
      changed_at: "2026-08-01T00:00:00.000Z",
    };

    expect(
      getReservationAuditChanges({
        ...baseLog,
        operation: "INSERT",
      })
    ).toEqual(["Rezervasyon oluşturuldu."]);
    expect(
      getReservationAuditChanges({
        ...baseLog,
        operation: "DELETE",
      })
    ).toEqual(["Rezervasyon silindi."]);
  });

  it("describes status, payment and schedule updates", () => {
    const changes = getReservationAuditChanges({
      id: "audit-2",
      reservation_id: "reservation-1",
      court_id: "court-1",
      operation: "UPDATE",
      changed_by: "user-1",
      changed_at: "2026-08-01T00:00:00.000Z",
      old_record: {
        reservation_date: "2026-08-02",
        start_time: "10:00:00",
        end_time: "11:00:00",
        status: "pending",
        payment_status: "unpaid",
      },
      new_record: {
        reservation_date: "2026-08-03",
        start_time: "11:00:00",
        end_time: "12:00:00",
        status: "confirmed",
        payment_status: "paid",
      },
    });

    expect(changes).toContain("Tarih: 2026-08-02 → 2026-08-03");
    expect(changes).toContain(
      "Saat: 10:00–11:00 → 11:00–12:00"
    );
    expect(changes).toContain("Durum: Bekliyor → Onaylandı");
    expect(changes).toContain("Ödeme: Ödenmedi → Ödendi");
  });
});
