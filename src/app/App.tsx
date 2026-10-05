import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Check,
  Home,
  Clock3,
  Settings,
  SlidersHorizontal,
  Download,
  Sun,
  Moon,
} from "lucide-react";
import { loadData, saveData } from "../storage";
import {
  isCompleted,
  isScheduled,
  scheduleLabel,
  scheduledTasks,
  localDay,
  toggleTask,
  type AppData,
  type Tool,
} from "../routines/types";
import { RoutineCard } from "../routines/RoutineCard";
import { ToolIcon } from "../components/Icon";
import { Editor } from "../pages/Editor";
import { NotificationsSettings } from "../notifications/NotificationsSettings";
type View = "home" | "history" | "settings" | string;
export function App() {
  const saving = useRef(false);
  const [data, setData] = useState<AppData>();
  const current = useRef<AppData | undefined>(undefined);
  const [view, setView] = useState<View>(location.hash.slice(1) || "home");
  const [day, setDay] = useState(localDay());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Tool>();
  const [selectedRoutine, setSelectedRoutine] = useState<string>();
  const [historyDay, setHistoryDay] = useState("");
  useEffect(() => {
    loadData()
      .then((d) => {
        current.current = d;
        setData(d);
      })
      .catch(() =>
        setError(
          "Unable to open local storage. Check that browser storage is enabled, then reload.",
        ),
      );
    const refresh = () => setDay(localDay());
    const timer = setInterval(refresh, 30000);
    const hash = () => {
      setView(location.hash.slice(1) || "home");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data?.theme ?? "system";
  }, [data?.theme]);
  async function persist(next: AppData) {
    if (saving.current) throw new Error("A save is already in progress");
    saving.current = true;
    setBusy(true);
    try {
      await saveData(next);
      current.current = next;
      setData(next);
      setError("");
    } catch (e) {
      setError("Could not save to this device. Your change was not saved.");
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const go = (v: View) => {
    location.hash = v;
  };
  const tool = data?.tools.find((t) => t.id === view);
  if (!data)
    return (
      <main className="shell">
        <h1>Personal Tools</h1>
        <p role="status">{error || "Loading…"}</p>
        {error && (
          <button className="primary" onClick={() => location.reload()}>
            Try again
          </button>
        )}
      </main>
    );
  const todayTools = data.tools.filter((t) => isScheduled(t, day));
  const tasks = todayTools.flatMap((t) => scheduledTasks(t, day));
  const done = tasks.filter((t) =>
    isCompleted(data.activity, t.id, day),
  ).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const progress = (t: Tool) => {
    const ts = scheduledTasks(t, day);
    return {
      total: ts.length,
      done: ts.filter((x) => isCompleted(data.activity, x.id, day)).length,
    };
  };
  const dateLabel = new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <>
      <main className="shell" aria-busy={busy} inert={!!editing}>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {view === "home" && (
          <>
            <div className="page-title">
              <h1>Today</h1>
              <p className="muted">{dateLabel}</p>
            </div>
            <div className="daily-summary">
              <span>
                {done} / {tasks.length} tasks complete
              </span>
              <span>{percent}%</span>
            </div>
            <progress
              className="daily-progress"
              value={done}
              max={tasks.length || 1}
              aria-label="Today's task completion"
            />
            <div className="section-heading">
              <div>
                <h2>Your routines</h2>
                <p className="muted">Choose a routine to reveal its tasks.</p>
              </div>
            </div>
            <div className="routine-selector">
              {todayTools.map((t) => {
                const p = progress(t);
                const expanded = selectedRoutine === t.id;
                return (
                  <div className={`routine-choice ${t.accent}`} key={t.id}>
                    <button
                      className={`tool-card card ${expanded ? "selected" : ""}`}
                      aria-expanded={expanded}
                      aria-controls={`tasks-${t.id}`}
                      onClick={() =>
                        setSelectedRoutine(expanded ? undefined : t.id)
                      }
                    >
                      <span className="routine-avatar">
                        <ToolIcon id={t.id} icon={t.icon} size={28} />
                      </span>
                      <div className="routine-card-copy">
                        <h2>{t.name}</h2>
                        <span className="muted">
                          {p.done} of {p.total} tasks complete
                        </span>
                        <progress
                          value={p.done}
                          max={p.total || 1}
                          aria-label={`${t.name} completion`}
                        />
                      </div>
                      <ChevronDown
                        className={expanded ? "rotated" : ""}
                        size={22}
                      />
                    </button>
                  </div>
                );
              })}
              {todayTools
                .filter((t) => t.id === selectedRoutine)
                .map((t) => (
                  <div
                    key={t.id}
                    id={`tasks-${t.id}`}
                    className={`routine-dropdown ${t.accent}`}
                  >
                    <div className="section-heading">
                      <span className="muted">
                        {t.description || "A little time for yourself."}
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setEditing(t)}
                      >
                        <SlidersHorizontal size={16} /> Edit
                      </button>
                    </div>
                    <div className="routine-grid">
                      {t.routines.map((r) => (
                        <RoutineCard
                          key={r.id}
                          routine={r}
                          activity={data.activity}
                          day={day}
                          disabled={busy}
                          onToggle={(task) => {
                            if (!busy)
                              void persist(
                                toggleTask(current.current!, t, r, task),
                              ).catch(() => {});
                          }}
                        />
                      ))}
                    </div>
                    {!t.routines.length && (
                      <p className="empty">Add a task list using Edit.</p>
                    )}
                  </div>
                ))}
              {!todayTools.length && (
                <div className="empty card">
                  {data.tools.length
                    ? "No routines scheduled for today. Enjoy your day!"
                    : "Create your first routine in Settings."}
                </div>
              )}
            </div>
          </>
        )}
        {tool && (
          <>
            <button className="text-button back" onClick={() => go("home")}>
              <ArrowLeft size={17} /> All tools
            </button>
            <div className={`tool-title ${tool.accent}`}>
              <h1>{tool.name}</h1>
            </div>
            <div className="section-heading">
              <div>
                <h2>Today’s routines</h2>
                <p className="muted">
                  {progress(tool).done} of {progress(tool).total} tasks complete
                </p>
              </div>
              <button className="text-button" onClick={() => setEditing(tool)}>
                <SlidersHorizontal size={16} /> Edit
              </button>
            </div>
            <div className={`routine-grid ${tool.accent}`}>
              {isScheduled(tool, day) &&
                tool.routines.map((r) => (
                  <RoutineCard
                    key={r.id}
                    routine={r}
                    activity={data.activity}
                    day={day}
                    onToggle={(task) => {
                      if (!busy)
                        void persist(
                          toggleTask(current.current!, tool, r, task),
                        ).catch(() => {});
                    }}
                  />
                ))}
            </div>
            {!isScheduled(tool, day) && (
              <p className="empty card">
                Repeat: {scheduleLabel(tool)}. You can change the schedule using
                Edit.
              </p>
            )}
            {!tool.routines.length && (
              <p className="muted">Add your first routine using Edit.</p>
            )}
          </>
        )}
        {view === "history" && (
          <>
            <div className="page-title">
              <h1>History</h1>
            </div>
            <label className="date-filter">
              Show a day{" "}
              <input
                type="date"
                value={historyDay}
                max={day}
                onChange={(e) => setHistoryDay(e.target.value)}
              />
              {historyDay && (
                <button
                  className="text-button"
                  onClick={() => setHistoryDay("")}
                >
                  All days
                </button>
              )}
            </label>
            {[
              ...new Set(
                data.activity
                  .filter((a) => !historyDay || a.day === historyDay)
                  .map((a) => a.day),
              ),
            ]
              .sort()
              .reverse()
              .map((d) => (
                <section className="history-day" key={d}>
                  <div className="section-heading">
                    <h2>
                      {d === day
                        ? "Today"
                        : new Date(`${d}T12:00:00`).toLocaleDateString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                    </h2>
                    <span className="muted">
                      {
                        data.activity.filter((a) => a.day === d && !a.undoneAt)
                          .length
                      }{" "}
                      completed
                    </span>
                  </div>
                  <div className="card">
                    {data.activity
                      .filter((a) => a.day === d)
                      .slice()
                      .reverse()
                      .map((a) => (
                        <div className="activity-row" key={a.id}>
                          <span
                            className={`activity-icon ${a.undoneAt ? "undone" : ""}`}
                          >
                            <Check size={17} />
                          </span>
                          <div>
                            <strong>{a.taskName}</strong>
                            <p>
                              {a.toolName} · {a.routineName}
                            </p>
                            {a.undoneAt && (
                              <p>
                                Undone at{" "}
                                {new Date(a.undoneAt).toLocaleTimeString(
                                  undefined,
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            )}
                          </div>
                          <time dateTime={a.completedAt}>
                            {new Date(a.completedAt).toLocaleTimeString(
                              undefined,
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </time>
                        </div>
                      ))}
                  </div>
                </section>
              ))}
            {!data.activity.some(
              (a) => !historyDay || a.day === historyDay,
            ) && (
              <div className="empty card">
                <p>No activity recorded.</p>
              </div>
            )}
          </>
        )}
        {view === "settings" && (
          <>
            <div className="page-title">
              <h1>Settings</h1>
            </div>
            <NotificationsSettings />
            <section className="settings-section card">
              <h2>Appearance</h2>
              <div className="theme-options">
                {(["system", "light", "dark"] as const).map((theme) => (
                  <button
                    key={theme}
                    aria-pressed={data.theme === theme}
                    className={data.theme === theme ? "selected" : ""}
                    onClick={() =>
                      void persist({ ...current.current!, theme }).catch(
                        () => {},
                      )
                    }
                  >
                    {theme === "light" ? (
                      <Sun size={18} />
                    ) : theme === "dark" ? (
                      <Moon size={18} />
                    ) : (
                      <Settings size={18} />
                    )}{" "}
                    {theme[0].toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </section>
            <section className="settings-section card">
              <h2>Routines</h2>
              <p>Create your own routines and customise their task lists.</p>
              {data.tools.map((t) => (
                <button
                  key={t.id}
                  className="settings-row"
                  onClick={() => setEditing(t)}
                >
                  <ToolIcon id={t.id} icon={t.icon} size={20} />
                  <span>
                    {t.name}
                    <small className="schedule-label">{scheduleLabel(t)}</small>
                  </span>
                  <SlidersHorizontal size={18} />
                </button>
              ))}
              <button
                className="text-button"
                onClick={() =>
                  setEditing({
                    id: crypto.randomUUID(),
                    name: "",
                    description: "",
                    icon: "leaf",
                    accent: "sage",
                    routines: [
                      {
                        id: crypto.randomUUID(),
                        name: "Daily",
                        tasks: [{ id: crypto.randomUUID(), name: "" }],
                      },
                    ],
                  })
                }
              >
                <Plus size={18} /> Add routine
              </button>
            </section>
            <section className="settings-section card">
              <h2>Data</h2>
              <p>
                Stored locally on this device. Export a backup before clearing
                browser data or changing your phone.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `personal-tools-${day}.json`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                <Download size={17} /> Export backup
              </button>
            </section>
            <section className="settings-section card">
              <h2>Add to your iPhone</h2>
              <p>
                Open your HTTPS site in Safari, tap Share, then Add to Home
                Screen. After the first visit, your routines work offline.
              </p>
              <span className="version">Personal Tools · v0.1.0</span>
            </section>
          </>
        )}
        {!tool && !["home", "history", "settings"].includes(view) && (
          <>
            <h1>Page not found</h1>
            <button className="primary" onClick={() => go("home")}>
              Go home
            </button>
          </>
        )}
      </main>
      <nav
        className="bottom-nav"
        aria-label="Main navigation"
        inert={!!editing}
      >
        {[
          { id: "home", label: "Today", icon: Home },
          { id: "history", label: "History", icon: Clock3 },
          { id: "settings", label: "Settings", icon: Settings },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={view === id || (id === "home" && tool) ? "active" : ""}
            aria-current={view === id ? "page" : undefined}
            onClick={() => go(id)}
          >
            <Icon size={21} strokeWidth={1.7} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {editing && (
        <Editor
          tool={editing}
          onClose={() => setEditing(undefined)}
          onSave={(t) =>
            persist({
              ...current.current!,
              tools: current.current!.tools.some((x) => x.id === t.id)
                ? current.current!.tools.map((x) => (x.id === t.id ? t : x))
                : [...current.current!.tools, t],
            })
          }
        />
      )}
    </>
  );
}
