import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { initialData } from "../src/tools";
import {
  isScheduled,
  scheduleLabel,
  isCompleted,
  localDay,
  toggleTask,
} from "../src/routines/types";
import { loadData, saveData } from "../src/storage";
describe("daily routines", () => {
  it("keeps existing routines daily and schedules volunteering only on Tuesdays", () => {
    const tool = initialData().tools[0];
    expect(isScheduled(tool, "2026-10-05")).toBe(true);
    expect(isScheduled(tool, "2026-10-06")).toBe(true);
    tool.days = [2];
    expect(isScheduled(tool, "2026-10-05")).toBe(false);
    expect(isScheduled(tool, "2026-10-06")).toBe(true);
    expect(isScheduled(tool, "2026-10-07")).toBe(false);
    expect(isScheduled(tool, "2026-10-13")).toBe(true);
    expect(scheduleLabel(tool)).toBe("Tue");
    tool.days = [0, 6];
    expect(isScheduled(tool, "2026-10-10")).toBe(true);
    expect(isScheduled(tool, "2026-10-11")).toBe(true);
    expect(isScheduled(tool, "2026-10-12")).toBe(false);
  });

  it("records snapshots and undo timestamps without losing history", () => {
    const data = initialData(),
      tool = data.tools[0],
      routine = tool.routines[0],
      task = routine.tasks[0],
      now = new Date(2026, 9, 5, 8, 30);
    const completed = toggleTask(data, tool, routine, task, now);
    expect(isCompleted(completed.activity, task.id, localDay(now))).toBe(true);
    expect(completed.activity[0]).toMatchObject({
      toolName: "Skincare",
      routineName: "Morning",
      taskName: "Cleanse",
      completedAt: now.toISOString(),
    });
    const undone = toggleTask(
      completed,
      tool,
      routine,
      task,
      new Date(2026, 9, 5, 8, 31),
    );
    expect(isCompleted(undone.activity, task.id, localDay(now))).toBe(false);
    expect(undone.activity[0].undoneAt).toBeTruthy();
    expect(toggleTask(undone, tool, routine, task, now).activity).toHaveLength(
      2,
    );
  });
  it("separates the same named task across routines and starts fresh tomorrow", () => {
    const data = initialData(),
      t = data.tools[0],
      r = t.routines[0],
      now = new Date(2026, 9, 5, 23, 59);
    const next = toggleTask(data, t, r, r.tasks[0], now);
    expect(
      isCompleted(next.activity, t.routines[1].tasks[0].id, localDay(now)),
    ).toBe(false);
    expect(
      isCompleted(
        next.activity,
        r.tasks[0].id,
        localDay(new Date(2026, 9, 6, 0, 0)),
      ),
    ).toBe(false);
  });
  it("persists configuration and history through IndexedDB reloads", async () => {
    const data = initialData();
    data.tools[0].routines[0].tasks[0].name = "My cleanser";
    data.tools[0].days = [2];
    const next = toggleTask(
      data,
      data.tools[0],
      data.tools[0].routines[0],
      data.tools[0].routines[0].tasks[0],
    );
    await saveData(next);
    expect(await loadData()).toEqual(next);
  });
});
