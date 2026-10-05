import { Check, Sun, Moon, ListChecks } from "lucide-react";
import { isCompleted, type Activity, type Routine, type Task } from "./types";
export function RoutineCard({
  routine,
  activity,
  day,
  onToggle,
}: {
  routine: Routine;
  activity: Activity[];
  day: string;
  onToggle: (task: Task) => void;
}) {
  const count = routine.tasks.filter((t) =>
    isCompleted(activity, t.id, day),
  ).length;
  const Icon =
    routine.name.toLowerCase() === "morning"
      ? Sun
      : routine.name.toLowerCase() === "evening"
        ? Moon
        : ListChecks;
  return (
    <section className="routine card">
      <div className="routine-heading">
        <h3>
          <Icon size={19} />
          {routine.name}
        </h3>
        <span>
          {count} / {routine.tasks.length}
        </span>
      </div>
      <div>
        {routine.tasks.map((task) => {
          const done = isCompleted(activity, task.id, day);
          return (
            <button
              className={`task ${done ? "done" : ""}`}
              key={task.id}
              onClick={() => onToggle(task)}
              aria-pressed={done}
            >
              <span className="checkbox">
                {done && <Check size={16} strokeWidth={3} />}
              </span>
              <span>{task.name}</span>
              {done && <span className="task-status">Done</span>}
            </button>
          );
        })}
        {!routine.tasks.length && (
          <p className="muted">Add a task in Edit routines.</p>
        )}
      </div>
    </section>
  );
}
