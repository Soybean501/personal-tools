import { skincare } from "./skincare";
import { oralHygiene } from "./oral-hygiene";
import { migrateSchedules, type AppData } from "../routines/types";
export const initialData = (): AppData =>
  migrateSchedules({
    version: 1,
    tools: structuredClone([skincare, oralHygiene]),
    activity: [],
    theme: "system",
  });
