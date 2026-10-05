import type { Tool } from "../../routines/types";
export const oralHygiene: Tool = {
  id: "oral-hygiene",
  name: "Oral Hygiene",
  description: "Fresh starts. Healthy habits.",
  accent: "blue",
  routines: [
    {
      id: "oral-am",
      name: "Morning",
      tasks: [{ id: "oral-am-brush", name: "Brush Teeth" }],
    },
    {
      id: "oral-pm",
      name: "Evening",
      tasks: [
        { id: "oral-pm-brush", name: "Brush Teeth" },
        { id: "oral-pm-floss", name: "Water Floss" },
      ],
    },
  ],
};
