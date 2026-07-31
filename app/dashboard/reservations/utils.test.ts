import { describe, expect, it } from "vitest";

import type { Reservation } from "./types";
import {
  doTimesOverlap,
  getCalendarDays,
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
