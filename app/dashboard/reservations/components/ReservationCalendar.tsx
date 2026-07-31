import type { CalendarDay } from "../types";
import {
  formatDateForDisplay,
  formatMonthTitle,
} from "../utils";

type ReservationCalendarProps = {
  calendarDays: CalendarDay[];
  selectedDate: string;
  visibleMonth: Date;
  onChangeMonth: (direction: number) => void;
  onGoToToday: () => void;
  onSelectDate: (calendarDay: CalendarDay) => void;
};

const dayNames = [
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
  "Paz",
];

export function ReservationCalendar({
  calendarDays,
  selectedDate,
  visibleMonth,
  onChangeMonth,
  onGoToToday,
  onSelectDate,
}: ReservationCalendarProps) {
  return (
    <div className="border-b border-gray-800 p-5 sm:p-7 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChangeMonth(-1)}
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
          onClick={() => onChangeMonth(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition hover:border-white hover:text-white"
          aria-label="Sonraki ay"
        >
          →
        </button>
      </div>

      <button
        type="button"
        onClick={onGoToToday}
        className="mt-5 w-full rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition hover:border-white hover:text-white"
      >
        Bugüne Git
      </button>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center text-xs text-gray-600">
        {dayNames.map((dayName) => (
          <div key={dayName} className="py-2">
            {dayName}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((calendarDay) => (
          <button
            key={calendarDay.dateValue}
            type="button"
            onClick={() => onSelectDate(calendarDay)}
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
  );
}
