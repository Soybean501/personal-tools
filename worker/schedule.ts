export function scheduledReminder(
  now: Date,
  timezone: string,
  morning: string,
  evening: string,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  const day = `${part("year")}-${part("month")}-${part("day")}`;
  const time = `${part("hour")}:${part("minute")}`;
  return time === morning
    ? { period: "morning" as const, day }
    : time === evening
      ? { period: "evening" as const, day }
      : undefined;
}
