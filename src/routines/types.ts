export interface Task {
  id: string;
  name: string;
}
export interface Routine {
  id: string;
  name: string;
  tasks: Task[];
}
export interface Tool {
  id: string;
  name: string;
  description: string;
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
