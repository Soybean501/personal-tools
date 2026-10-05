import { openDB } from "idb";
import type { AppData } from "../routines/types";
import { initialData } from "../tools";
const database = () =>
  openDB("personal-tools", 1, {
    upgrade(db) {
      db.createObjectStore("app");
    },
  });
export async function loadData(): Promise<AppData> {
  const db = await database();
  return (await db.get("app", "data")) ?? initialData();
}
export async function saveData(data: AppData) {
  const db = await database();
  await db.put("app", data, "data");
}
