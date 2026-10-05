import { Check, Sun, Moon, ListChecks } from "lucide-react";
import {
  isScheduled,
  scheduleLabel,
  isCompleted,
  type Activity,
  type Routine,
  type Task,
} from "./types";
export function RoutineCard({
  routine,
  activity,
  day,
  onToggle,
  disabled = false,
}: {
  routine: Routine;
  activity: Activity[];
  day: string;
  onToggle: (task: Task) => void;
  disabled?: boolean;
}) {
  const tasks = routine.tasks.filter((t) => isScheduled(t, day));
  const count = tasks.filter((t) => isCompleted(activity, t.id, day)).length;
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
          {count} / {tasks.length}
        </span>
      </div>
      <div>
        {tasks.map((task) => {
          const done = isCompleted(activity, task.id, day);
          return (
            <button
              className={`task ${done ? "done" : ""}`}
              key={task.id}
              onClick={() => onToggle(task)}
              aria-pressed={done}
              disabled={disabled}
            >
              <span className="checkbox">
                {done && <Check size={16} strokeWidth={3} />}
              </span>
              <span>
                {task.name}
                {task.schedule && task.schedule.kind !== "daily" && (
                  <small className="schedule-label">
                    {scheduleLabel(task)}
                  </small>
                )}
              </span>
              {done && <span className="task-status">Done</span>}
            </button>
          );
        })}
        {!!routine.tasks.length && !tasks.length && (
          <p className="muted">No tasks scheduled for today.</p>
        )}
        {!routine.tasks.length && (
          <p className="muted">Add a task in Edit routines.</p>
        )}
      </div>
    </section>
  );
}
