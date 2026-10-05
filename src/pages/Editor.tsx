import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ToolIcon, routineIcons } from "../components/Icon";
import { weekdays, type Tool } from "../routines/types";
export function Editor({
  tool,
  onSave,
  onClose,
}: {
  tool: Tool;
  onSave: (tool: Tool) => Promise<void>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    const elements = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled)",
        ),
      );
    elements()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!element.querySelector("button[disabled]")) onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = elements();
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    element.addEventListener("keydown", handle);
    return () => {
      element.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  const [draft, setDraft] = useState(() => structuredClone(tool));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (id: string, name: string) =>
    setDraft({
      ...draft,
      routines: draft.routines.map((r) => (r.id === id ? { ...r, name } : r)),
    });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !draft.name.trim() ||
      !draft.routines.every(
        (r) => r.name.trim() && r.tasks.every((t) => t.name.trim()),
      )
    ) {
      setError("Give the routine, each task list and every task a name.");
      return;
    }
    if (draft.days?.length === 0) {
      setError("Choose at least one day for this routine.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        routines: draft.routines.map((r) => ({
          ...r,
          name: r.name.trim(),
          tasks: r.tasks.map((t) => ({ ...t, name: t.name.trim() })),
        })),
      });
      onClose();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        className="editor card"
      >
        <div className="section-heading">
          <h2 id="editor-title">
            {tool.name ? "Edit routine" : "New routine"}
          </h2>
          <button
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close editor"
          >
            <X />
          </button>
        </div>

        <form onSubmit={submit}>
          <fieldset disabled={busy} className="routine-details">
            <legend>Routine details</legend>
            <label className="editor-field">
              Name
              <input
                autoComplete="off"
                placeholder="e.g. Movement"
                maxLength={60}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className="editor-field">
              Icon
              <span className="icon-select">
                <ToolIcon id={draft.id} icon={draft.icon} />
                <select
                  value={
                    draft.icon ||
                    (draft.id === "skincare"
                      ? "sparkles"
                      : draft.id === "oral-hygiene"
                        ? "smile"
                        : "leaf")
                  }
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                >
                  {routineIcons.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="editor-field">
              Colour
              <select
                value={draft.accent}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    accent: e.target.value as Tool["accent"],
                  })
                }
              >
                <option value="sage">Sage green</option>
                <option value="blue">Soft blue</option>
              </select>
            </label>
            <fieldset className="schedule-picker">
              <legend>Repeat on</legend>
              <button
                type="button"
                className="text-button"
                onClick={() => setDraft({ ...draft, days: undefined })}
              >
                Every day
              </button>
              <div className="weekday-options">
                {weekdays.map(({ day, label, short }) => {
                  const selected =
                    draft.days === undefined || draft.days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-label={label}
                      aria-pressed={selected}
                      className={selected ? "selected" : ""}
                      onClick={() => {
                        const days = draft.days ?? weekdays.map((x) => x.day);
                        setDraft({
                          ...draft,
                          days: selected
                            ? days.filter((x) => x !== day)
                            : [...days, day],
                        });
                      }}
                    >
                      {short}
                    </button>
                  );
                })}
              </div>
              <p className="muted">
                Only shown on Today and counted towards progress on these days.
              </p>
            </fieldset>
          </fieldset>
          <fieldset disabled={busy} className="task-lists">
            <legend>Task lists</legend>
            {draft.routines.map((r) => (
              <fieldset key={r.id}>
                <legend>Task list</legend>
                <div className="edit-row">
                  <input
                    aria-label="Task list name"
                    value={r.name}
                    onChange={(e) => update(r.id, e.target.value)}
                    maxLength={60}
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Remove ${r.name} task list`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        routines: draft.routines.filter((x) => x.id !== r.id),
                      })
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                {r.tasks.map((t) => (
                  <div className="edit-row" key={t.id}>
                    <input
                      aria-label="Task name"
                      value={t.name}
                      maxLength={100}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          routines: draft.routines.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  tasks: x.tasks.map((y) =>
                                    y.id === t.id
                                      ? { ...y, name: e.target.value }
                                      : y,
                                  ),
                                }
                              : x,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Remove ${t.name}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          routines: draft.routines.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  tasks: x.tasks.filter((y) => y.id !== t.id),
                                }
                              : x,
                          ),
                        })
                      }
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      routines: draft.routines.map((x) =>
                        x.id === r.id
                          ? {
                              ...x,
                              tasks: [
                                ...x.tasks,
                                { id: crypto.randomUUID(), name: "" },
                              ],
                            }
                          : x,
                      ),
                    })
                  }
                >
                  <Plus size={16} /> Add task
                </button>
              </fieldset>
            ))}
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setDraft({
                  ...draft,
                  routines: [
                    ...draft.routines,
                    { id: crypto.randomUUID(), name: "", tasks: [] },
                  ],
                })
              }
            >
              <Plus size={16} /> Add task list
            </button>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save routine"}
          </button>
        </form>
      </section>
    </div>
  );
}
