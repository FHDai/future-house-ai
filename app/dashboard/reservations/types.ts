export type Facility = {
  id: string;
  name: string;
};

export type Court = {
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

export type Customer = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
};

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type PaymentStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "refunded";

export type Reservation = {
  id: string;
  court_id: string;
  customer_id: string | null;
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

export type ReservationAuditLog = {
  id: string;
  reservation_id: string;
  court_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  old_record: Partial<Reservation> | null;
  new_record: Partial<Reservation> | null;
  changed_by: string | null;
  changed_at: string;
};

export type ReservationForm = {
  courtId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  totalPrice: string;
  saveCustomer: boolean;
};

export type CalendarDay = {
  date: Date;
  dateValue: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isPast: boolean;
  reservationCount: number;
  isToday: boolean;
  isSelected: boolean;
};

export type TimeSlot = {
  time: string;
  isAvailable: boolean;
  reservation: Reservation | null;
  unavailableReason: "reserved" | "lead-time" | null;
};
