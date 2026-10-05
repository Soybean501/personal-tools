export type Schedule =
  | { kind: "daily" }
  | { kind: "weekdays"; days: number[] }
  | { kind: "interval"; every: number; start: string };

interface Scheduled {
  schedule?: Schedule;
  days?: number[]; // Legacy routine weekday setting.
}

export interface Task extends Scheduled {
  id: string;
  name: string;
}
export interface Routine {
  id: string;
  name: string;
  tasks: Task[];
}
export interface Tool extends Scheduled {
  id: string;
  name: string;
  description: string;
  icon?: string;
  accent: "sage" | "blue";
  routines: Routine[];
}
export interface Activity {
  id: string;
  toolId: string;
  toolName: string;
  routineId: string;
  routineName: string;
  taskId: string;
  taskName: string;
  day: string;
  completedAt: string;
  undoneAt?: string;
}
export interface AppData {
  version: 1;
  schedulingVersion?: 1;
  tools: Tool[];
  activity: Activity[];
  theme: "system" | "light" | "dark";
}
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function isCompleted(activity: Activity[], taskId: string, day: string) {
  return activity.some(
    (a) => a.taskId === taskId && a.day === day && !a.undoneAt,
  );
}
export function toggleTask(
  data: AppData,
  tool: Tool,
  routine: Routine,
  task: Task,
  now = new Date(),
): AppData {
  const day = localDay(now),
    timestamp = now.toISOString();
  const existing = data.activity.find(
    (a) => a.taskId === task.id && a.day === day && !a.undoneAt,
  );
  return {
    ...data,
    activity: existing
      ? data.activity.map((a) =>
          a.id === existing.id ? { ...a, undoneAt: timestamp } : a,
        )
      : [
          ...data.activity,
          {
            id: crypto.randomUUID(),
            toolId: tool.id,
            toolName: tool.name,
            routineId: routine.id,
            routineName: routine.name,
            taskId: task.id,
            taskName: task.name,
            day,
            completedAt: timestamp,
          },
        ],
  };
}

export const weekdays = [
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
  { day: 0, label: "Sunday", short: "Sun" },
];
// Calendar-day arithmetic deliberately ignores DST and the device's UTC offset.
function dayNumber(day: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NaN;
  const value = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(value) &&
    new Date(value).toISOString().slice(0, 10) === day
    ? value / 86400000
    : NaN;
}
export function effectiveSchedule(item: Scheduled): Schedule {
  return (
    item.schedule ??
    (item.days ? { kind: "weekdays", days: item.days } : { kind: "daily" })
  );
}
export function validSchedule(schedule: Schedule): boolean {
  if (schedule.kind === "daily") return true;
  if (schedule.kind === "weekdays")
    return (
      schedule.days.length > 0 &&
      schedule.days.every(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      )
    );
  return (
    Number.isInteger(schedule.every) &&
    schedule.every >= 2 &&
    schedule.every <= 365 &&
    Number.isFinite(dayNumber(schedule.start))
  );
}
export function isScheduled(item: Scheduled, day: string): boolean {
  const schedule = effectiveSchedule(item);
  if (!validSchedule(schedule)) return false;
  if (schedule.kind === "daily") return true;
  if (schedule.kind === "weekdays")
    return schedule.days.includes(new Date(`${day}T12:00:00`).getDay());
  const elapsed = dayNumber(day) - dayNumber(schedule.start);
  return elapsed >= 0 && elapsed % schedule.every === 0;
}
export function scheduleLabel(item: Scheduled): string {
  const schedule = effectiveSchedule(item);
  if (
    schedule.kind === "daily" ||
    (schedule.kind === "weekdays" && schedule.days.length === 7)
  )
    return "Every day";
  if (schedule.kind === "interval")
    return schedule.every === 2
      ? "Every other day"
      : `Every ${schedule.every} days`;
  return weekdays
    .filter((x) => schedule.days.includes(x.day))
    .map((x) => x.short)
    .join(", ");
}
export function scheduledTasks(tool: Tool, day: string): Task[] {
  return isScheduled(tool, day)
    ? tool.routines.flatMap((r) => r.tasks.filter((t) => isScheduled(t, day)))
    : [];
}

// Apply the user's Epiduo preference once; subsequent edits always win.
export function migrateSchedules(data: AppData, today = localDay()): AppData {
  if (data.schedulingVersion === 1) return data;
  const lastApplication = data.activity
    .filter(
      (a) =>
        a.taskId === "skin-pm-epiduo" &&
        !a.undoneAt &&
        a.day <= today &&
        Number.isFinite(dayNumber(a.day)),
    )
    .map((a) => a.day)
    .sort()
    .at(-1);
  return {
    ...data,
    schedulingVersion: 1,
    tools: data.tools.map((tool) => ({
      ...tool,
      routines: tool.routines.map((routine) => ({
        ...routine,
        tasks: routine.tasks.map((task) =>
          task.id === "skin-pm-epiduo" && !task.schedule
            ? {
                ...task,
                schedule: {
                  kind: "interval",
                  every: 2,
                  start: lastApplication ?? today,
                },
              }
            : task,
        ),
      })),
    })),
  };
}
