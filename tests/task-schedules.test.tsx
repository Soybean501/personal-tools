import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { initialData } from "../src/tools";
import {
  isScheduled,
  migrateSchedules,
  scheduledTasks,
  scheduleLabel,
  toggleTask,
  validSchedule,
  type Schedule,
} from "../src/routines/types";
import { RoutineCard } from "../src/routines/RoutineCard";
import { loadData, saveData } from "../src/storage";

const alternate = {
  schedule: { kind: "interval", every: 2, start: "2026-10-05" } as Schedule,
};
describe("task repeat schedules", () => {
  it("alternates across Sunday/Monday and month/year boundaries", () => {
    expect(isScheduled(alternate, "2026-10-04")).toBe(false);
    for (let offset = 0; offset < 400; offset++) {
      const day = new Date(Date.UTC(2026, 9, 5 + offset))
        .toISOString()
        .slice(0, 10);
      expect(isScheduled(alternate, day)).toBe(offset % 2 === 0);
    }
    expect(isScheduled(alternate, "2026-10-11")).toBe(true);
    expect(isScheduled(alternate, "2026-10-12")).toBe(false);
    expect(isScheduled(alternate, "2026-10-13")).toBe(true);
  });
  it("uses calendar days across UK daylight saving changes", () => {
    const item = {
      schedule: { kind: "interval", every: 2, start: "2026-10-24" } as Schedule,
    };
    expect(isScheduled(item, "2026-10-25")).toBe(false);
    expect(isScheduled(item, "2026-10-26")).toBe(true);
    item.schedule = { kind: "interval", every: 2, start: "2027-03-27" };
    expect(isScheduled(item, "2027-03-28")).toBe(false);
    expect(isScheduled(item, "2027-03-29")).toBe(true);
  });
  it("supports daily, weekdays, and longer intervals and rejects invalid input", () => {
    expect(isScheduled({}, "2026-10-05")).toBe(true);
    expect(
      isScheduled({ schedule: { kind: "weekdays", days: [2] } }, "2026-10-06"),
    ).toBe(true);
    expect(
      isScheduled({ schedule: { kind: "weekdays", days: [2] } }, "2026-10-05"),
    ).toBe(false);
    expect(
      isScheduled(
        { schedule: { kind: "interval", every: 3, start: "2026-10-05" } },
        "2026-10-08",
      ),
    ).toBe(true);
    expect(scheduleLabel(alternate)).toBe("Every other day");
    expect(
      validSchedule({ kind: "interval", every: 0, start: "2026-10-05" }),
    ).toBe(false);
    expect(
      validSchedule({ kind: "interval", every: 2.5, start: "2026-10-05" }),
    ).toBe(false);
    expect(
      validSchedule({ kind: "interval", every: 2, start: "2026-02-30" }),
    ).toBe(false);
    expect(validSchedule({ kind: "weekdays", days: [] })).toBe(false);
  });
  it("hides off-day tasks from cards and progress, and respects the parent routine", () => {
    const tool = initialData().tools[0];
    const epiduo = tool.routines[1].tasks[1];
    epiduo.schedule = alternate.schedule;
    expect(scheduledTasks(tool, "2026-10-05")).toHaveLength(6);
    expect(scheduledTasks(tool, "2026-10-06")).toHaveLength(5);
    const html = renderToStaticMarkup(
      <RoutineCard
        routine={tool.routines[1]}
        day="2026-10-06"
        activity={[]}
        onToggle={() => {}}
      />,
    );
    expect(html).not.toContain("Epiduo");
    expect(html).toContain("0 / 2");
    tool.days = [2];
    expect(scheduledTasks(tool, "2026-10-05")).toHaveLength(0);
    expect(scheduledTasks(tool, "2026-10-06")).toHaveLength(5);
    const empty = renderToStaticMarkup(
      <RoutineCard
        routine={{ ...tool.routines[1], tasks: [epiduo] }}
        day="2026-10-06"
        activity={[]}
        onToggle={() => {}}
      />,
    );
    expect(empty).toContain("No tasks scheduled for today.");
  });
  it("migrates existing Epiduo once from its last active completion without rewriting other data", () => {
    const old = initialData();
    delete old.schedulingVersion;
    const tool = old.tools[0],
      routine = tool.routines[1],
      epiduo = routine.tasks[1];
    delete epiduo.schedule;
    const logged = toggleTask(
      old,
      tool,
      routine,
      epiduo,
      new Date(2026, 9, 3, 19),
    );
    const migrated = migrateSchedules(logged, "2026-10-05");
    expect(migrated.tools[0].routines[1].tasks[1].schedule).toEqual({
      kind: "interval",
      every: 2,
      start: "2026-10-03",
    });
    expect(migrated.activity).toEqual(logged.activity);
    expect(migrated.tools[0].routines[0]).toEqual(old.tools[0].routines[0]);
    migrated.tools[0].routines[1].tasks[1].schedule = { kind: "daily" };
    expect(migrateSchedules(migrated, "2026-10-06")).toBe(migrated);
    const undone = toggleTask(
      logged,
      tool,
      routine,
      epiduo,
      new Date(2026, 9, 3, 20),
    );
    expect(
      migrateSchedules(undone, "2026-10-05").tools[0].routines[1].tasks[1]
        .schedule,
    ).toEqual(alternate.schedule);
  });
  it("persists the migration anchor and user edits through reloads", async () => {
    const data = initialData();
    delete data.schedulingVersion;
    delete data.tools[0].routines[1].tasks[1].schedule;
    await saveData(data);
    const loaded = await loadData();
    expect(await loadData()).toEqual(loaded);
    loaded.tools[0].routines[1].tasks[1].schedule = alternate.schedule;
    await saveData(loaded);
    expect(await loadData()).toEqual(loaded);
  });
});
