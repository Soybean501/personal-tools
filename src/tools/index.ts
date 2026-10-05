import { skincare } from "./skincare";
import { oralHygiene } from "./oral-hygiene";
import type { AppData } from "../routines/types";
export const initialData = (): AppData => ({
  version: 1,
  tools: structuredClone([skincare, oralHygiene]),
  activity: [],
  theme: "system",
});
