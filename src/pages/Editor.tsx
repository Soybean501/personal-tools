import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { Tool } from "../routines/types";
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
        element.querySelectorAll<HTMLElement>("button:not(:disabled),input"),
      );
    elements()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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
      !draft.routines.every(
        (r) => r.name.trim() && r.tasks.every((t) => t.name.trim()),
      )
    ) {
      setError("Give each routine and task a name.");
      return;
    }
    setBusy(true);
    try {
      await onSave({
        ...draft,
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
          <h2 id="editor-title">Edit routines</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X />
          </button>
        </div>
        <p className="muted">Make {tool.name.toLowerCase()} work for you.</p>
        <form onSubmit={submit}>
          {draft.routines.map((r) => (
            <fieldset key={r.id}>
              <legend>Routine</legend>
              <div className="edit-row">
                <input
                  aria-label="Routine name"
                  value={r.name}
                  onChange={(e) => update(r.id, e.target.value)}
                  maxLength={60}
                />
                <button
                  type="button"
                  className="icon-button danger"
                  aria-label={`Remove ${r.name} routine`}
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
            <Plus size={16} /> Add routine
          </button>
          {error && <p role="alert">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save routines"}
          </button>
        </form>
      </section>
    </div>
  );
}
