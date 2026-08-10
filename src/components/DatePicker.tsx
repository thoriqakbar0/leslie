import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface DatePickerProps {
  readonly onClose: () => void;
  readonly onSelect: (date: Date) => void;
  readonly selectedDate: Date;
}

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const dayLabelFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});
const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
  weekdayFormatter.format(new Date(2024, 0, 8 + index)),
);

function calendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameCalendarDate(left: Date, right: Date): boolean {
  return calendarDateKey(left) === calendarDateKey(right);
}

function calendarDates(month: Date): readonly Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  first.setDate(first.getDate() - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function moveMonth(value: Date, offset: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1);
}

function MonthArrow({ direction }: { readonly direction: "previous" | "next" }) {
  const path = direction === "previous" ? "m12.5 5-5 5 5 5" : "m7.5 5 5 5-5 5";
  return (
    <svg aria-hidden="true" className="month-arrow" viewBox="0 0 20 20">
      <path d={path} />
    </svg>
  );
}

/** Render a keyboard-operable calendar for selecting Leslie's active date. */
export function DatePicker({ onClose, onSelect, selectedDate }: DatePickerProps) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );
  const pickerRef = useRef<HTMLDivElement>(null);
  const dates = calendarDates(visibleMonth);
  const today = new Date();

  useEffect(() => {
    const selectedButton =
      pickerRef.current?.querySelector<HTMLButtonElement>('[aria-current="date"]');
    const firstCurrentMonthButton = pickerRef.current?.querySelector<HTMLButtonElement>(
      '[data-outside-month="false"]',
    );
    (selectedButton ?? firstCurrentMonthButton)?.focus();
  }, []);

  function focusDate(date: Date) {
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    globalThis.requestAnimationFrame(() => {
      pickerRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${calendarDateKey(date)}"]`)
        ?.focus();
    });
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    let nextDate: Date | null = null;
    if (event.key === "ArrowLeft")
      nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    if (event.key === "ArrowRight")
      nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    if (event.key === "ArrowUp")
      nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
    if (event.key === "ArrowDown")
      nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    if (event.key === "Home") {
      nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - ((date.getDay() + 6) % 7),
      );
    }
    if (event.key === "End") {
      nextDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + (7 - (date.getDay() || 7)),
      );
    }
    if (event.key === "PageUp")
      nextDate = new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
    if (event.key === "PageDown")
      nextDate = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
    if (nextDate === null) return;
    event.preventDefault();
    focusDate(nextDate);
  }

  return (
    <div
      aria-label="Choose date"
      className="date-picker"
      id="date-picker"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      ref={pickerRef}
      role="dialog"
    >
      <div className="date-picker-header">
        <button
          aria-label="Previous month"
          onClick={() => setVisibleMonth((current) => moveMonth(current, -1))}
          type="button"
        >
          <MonthArrow direction="previous" />
        </button>
        <strong aria-live="polite">{monthFormatter.format(visibleMonth)}</strong>
        <button
          aria-label="Next month"
          onClick={() => setVisibleMonth((current) => moveMonth(current, 1))}
          type="button"
        >
          <MonthArrow direction="next" />
        </button>
      </div>

      <div aria-hidden="true" className="date-picker-weekdays">
        {weekdayLabels.map((weekday) => (
          <span key={weekday}>{weekday.slice(0, 2)}</span>
        ))}
      </div>

      <div className="date-picker-grid">
        {dates.map((date) => {
          const isSelected = isSameCalendarDate(date, selectedDate);
          const isOutsideMonth = date.getMonth() !== visibleMonth.getMonth();
          return (
            <button
              aria-current={isSelected ? "date" : undefined}
              aria-label={dayLabelFormatter.format(date)}
              className={isSameCalendarDate(date, today) ? "is-today" : ""}
              data-calendar-day=""
              data-date={calendarDateKey(date)}
              data-outside-month={String(isOutsideMonth)}
              key={calendarDateKey(date)}
              onClick={() => onSelect(date)}
              onKeyDown={(event) => handleDayKeyDown(event, date)}
              tabIndex={isSelected ? 0 : -1}
              type="button"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <button className="date-picker-today" onClick={() => onSelect(today)} type="button">
        Today
      </button>
    </div>
  );
}
