import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Home,
  Clock3,
  Settings,
  SlidersHorizontal,
  Leaf,
  Download,
  Sun,
  Moon,
} from "lucide-react";
import { loadData, saveData } from "../storage";
import {
  isCompleted,
  localDay,
  toggleTask,
  type AppData,
  type Tool,
} from "../routines/types";
import { RoutineCard } from "../routines/RoutineCard";
import { ToolIcon } from "../components/Icon";
import { Editor } from "../pages/Editor";
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
        <p role="status">{error || "Getting your routines ready…"}</p>
        {error && (
          <button className="primary" onClick={() => location.reload()}>
            Try again
          </button>
        )}
      </main>
    );
  const tasks = data.tools.flatMap((t) => t.routines.flatMap((r) => r.tasks));
  const done = tasks.filter((t) =>
    isCompleted(data.activity, t.id, day),
  ).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const progress = (t: Tool) => {
    const ts = t.routines.flatMap((r) => r.tasks);
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
      <main className="shell" aria-busy={busy}>
        <header className="brand">
          <span className="brand-mark">
            <Leaf size={19} />
          </span>
          <span>personal tools</span>
          <span className="local-label">
            <span /> On this device
          </span>
        </header>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {view === "home" && (
          <>
            <div className="page-title">
              <p className="eyebrow">{dateLabel}</p>
              <h1>
                A little care,
                <br />
                every day<span className="accent-dot">.</span>
              </h1>
              <p className="subtitle">Your routines. Your own rhythm.</p>
            </div>
            <section className="daily-summary">
              <div>
                <span className="eyebrow">TODAY’S PROGRESS</span>
                <h2>
                  {done}
                  <span> / {tasks.length} tasks</span>
                </h2>
                <p>
                  {percent === 100 && tasks.length
                    ? "All done. Enjoy the rest of your day."
                    : "Small steps add up. You’ve got this."}
                </p>
              </div>
              <div
                className="progress-ring"
                style={{
                  background: `conic-gradient(var(--green) ${percent}%, var(--ring-track) 0)`,
                }}
              >
                <span>
                  {percent === 100 && tasks.length ? (
                    <Check size={28} />
                  ) : (
                    `${percent}%`
                  )}
                </span>
              </div>
            </section>
            <div className="section-heading">
              <h2>Your tools</h2>
              <span className="muted">
                {data.tools.length} everyday essentials
              </span>
            </div>
            <div className="tool-grid">
              {data.tools.map((t) => {
                const p = progress(t);
                return (
                  <button
                    key={t.id}
                    className={`tool-card card ${t.accent}`}
                    onClick={() => go(t.id)}
                  >
                    <div className="tool-card-top">
                      <span className="tool-icon">
                        <ToolIcon id={t.id} />
                      </span>
                      <ArrowRight size={20} />
                    </div>
                    <h2>{t.name}</h2>
                    <p>{t.description}</p>
                    <div className="mini-progress">
                      <span
                        style={{
                          width: `${p.total ? (p.done / p.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="tool-card-bottom">
                      <span>
                        {p.done} of {p.total} done
                      </span>
                      <span>
                        {p.total && p.done === p.total
                          ? "Complete"
                          : `${t.routines.length} routines`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="section-heading today-heading">
              <h2>Today’s routines</h2>
              <span className="muted">Tap to check off</span>
            </div>
            {data.tools.map((t) => (
              <div className={`tool-routines ${t.accent}`} key={t.id}>
                <div className="tool-label">
                  <ToolIcon id={t.id} size={17} />
                  <h3>{t.name}</h3>
                </div>
                <div className="routine-grid">
                  {t.routines.map((r) => (
                    <RoutineCard
                      key={r.id}
                      routine={r}
                      activity={data.activity}
                      day={day}
                      onToggle={(task) => {
                        if (!busy)
                          void persist(
                            toggleTask(current.current!, t, r, task),
                          ).catch(() => {});
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
            <p className="footnote">
              <Leaf size={14} /> A moment for yourself, morning and night.
            </p>
          </>
        )}
        {tool && (
          <>
            <button className="text-button back" onClick={() => go("home")}>
              <ArrowLeft size={17} /> All tools
            </button>
            <div className={`tool-title ${tool.accent}`}>
              <span className="tool-icon">
                <ToolIcon id={tool.id} size={28} />
              </span>
              <h1>{tool.name}</h1>
              <p className="subtitle">{tool.description}</p>
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
              {tool.routines.map((r) => (
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
            {!tool.routines.length && (
              <p className="muted">Add your first routine using Edit.</p>
            )}
            <p className="footnote">
              Completions are saved for today. Tomorrow starts fresh.
            </p>
          </>
        )}
        {view === "history" && (
          <>
            <div className="page-title">
              <p className="eyebrow">ONE DAY AT A TIME</p>
              <h1>
                Your activity<span className="accent-dot">.</span>
              </h1>
              <p className="subtitle">A record of the care you put in.</p>
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
                <Clock3 size={30} />
                <h2>A fresh start</h2>
                <p>Completed tasks will appear here.</p>
              </div>
            )}
          </>
        )}
        {view === "settings" && (
          <>
            <div className="page-title">
              <p className="eyebrow">MAKE IT YOURS</p>
              <h1>
                Settings<span className="accent-dot">.</span>
              </h1>
              <p className="subtitle">Simple tools, just for you.</p>
            </div>
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
              <h2>Your routines</h2>
              {data.tools.map((t) => (
                <button
                  key={t.id}
                  className="settings-row"
                  onClick={() => setEditing(t)}
                >
                  <ToolIcon id={t.id} size={20} />
                  <span>{t.name}</span>
                  <SlidersHorizontal size={18} />
                </button>
              ))}
            </section>
            <section className="settings-section card">
              <h2>Your data</h2>
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
      <nav className="bottom-nav" aria-label="Main navigation">
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
              tools: current.current!.tools.map((x) => (x.id === t.id ? t : x)),
            })
          }
        />
      )}
    </>
  );
}
