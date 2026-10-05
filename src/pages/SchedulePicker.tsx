import { useState } from "react";
import {
  localDay,
  scheduleLabel,
  validSchedule,
  weekdays,
  type Schedule,
} from "../routines/types";

export function SchedulePicker({
  schedule,
  onChange,
  label,
}: {
  schedule: Schedule;
  onChange: (schedule: Schedule) => void;
  label: string;
}) {
  const [customInterval, setCustomInterval] = useState(
    schedule.kind === "interval" && schedule.every !== 2,
  );
  const mode =
    schedule.kind === "interval"
      ? customInterval
        ? "interval"
        : "alternate"
      : schedule.kind;
  const upcoming =
    schedule.kind === "interval" && validSchedule(schedule)
      ? Array.from({ length: 5 }, (_, offset) => {
          const date = new Date(`${schedule.start}T12:00:00`);
          date.setDate(date.getDate() + offset * schedule.every);
          return date;
        })
      : [];
  return (
    <div className="schedule-picker">
      <label className="editor-field">
        Repeat
        <select
          aria-label={`${label} repeat`}
          value={mode}
          onChange={(e) => {
            const kind = e.target.value;
            setCustomInterval(kind === "interval");
            onChange(
              kind === "daily"
                ? { kind: "daily" }
                : kind === "weekdays"
                  ? { kind: "weekdays", days: weekdays.map((x) => x.day) }
                  : {
                      kind: "interval",
                      every: kind === "alternate" ? 2 : 3,
                      start:
                        schedule.kind === "interval"
                          ? schedule.start
                          : localDay(),
                    },
            );
          }}
        >
          <option value="daily">Every day</option>
          <option value="alternate">Every other day</option>
          <option value="weekdays">Selected weekdays</option>
          <option value="interval">Every N days</option>
        </select>
      </label>
      {schedule.kind === "weekdays" && (
        <div
          className="weekday-options"
          role="group"
          aria-label={`${label} weekdays`}
        >
          {weekdays.map(({ day, label: weekday, short }) => {
            const selected = schedule.days.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-label={weekday}
                aria-pressed={selected}
                className={selected ? "selected" : ""}
                onClick={() =>
                  onChange({
                    kind: "weekdays",
                    days: selected
                      ? schedule.days.filter((x) => x !== day)
                      : [...schedule.days, day],
                  })
                }
              >
                {short}
              </button>
            );
          })}
        </div>
      )}
      {schedule.kind === "interval" && (
        <>
          {mode === "interval" && (
            <label className="editor-field">
              Days between repeats
              <input
                type="number"
                min={2}
                max={365}
                required
                value={schedule.every || ""}
                aria-label={`${label} days between repeats`}
                onChange={(e) =>
                  onChange({ ...schedule, every: Number(e.target.value) })
                }
              />
            </label>
          )}
          <label className="editor-field">
            Start date
            <input
              type="date"
              required
              value={schedule.start}
              aria-label={`${label} start date`}
              onChange={(e) => onChange({ ...schedule, start: e.target.value })}
            />
          </label>
          <p className="muted">
            {schedule.every === 2
              ? "One day on, one day off, even across weeks."
              : scheduleLabel({ schedule })}{" "}
            Skipping a task keeps this schedule.
          </p>
          {schedule.start && upcoming.length > 0 && (
            <p className="muted">
              From your start date:{" "}
              {upcoming
                .map((date) =>
                  date.toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  }),
                )
                .join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
