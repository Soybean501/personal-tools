import { openDB } from "idb";
import { migrateSchedules, type AppData } from "../routines/types";
import { initialData } from "../tools";
const database = () =>
  openDB("personal-tools", 1, {
    upgrade(db) {
      db.createObjectStore("app");
    },
  });
export async function loadData(): Promise<AppData> {
  const db = await database();
  const saved = await db.get("app", "data");
  const data = migrateSchedules(saved ?? initialData());
  if (!saved || data !== saved) await db.put("app", data, "data");
  return data;
}
export async function saveData(data: AppData) {
  const db = await database();
  await db.put("app", data, "data");
}
