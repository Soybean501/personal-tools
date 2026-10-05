import type { Tool } from "../../routines/types";
export const skincare: Tool = {
  id: "skincare",
  name: "Skincare",
  description: "A little care for your skin.",
  accent: "sage",
  routines: [
    {
      id: "skin-am",
      name: "Morning",
      tasks: [
        { id: "skin-am-cleanse", name: "Cleanse" },
        { id: "skin-am-moisturise", name: "Moisturise" },
        { id: "skin-am-sunscreen", name: "Sunscreen" },
      ],
    },
    {
      id: "skin-pm",
      name: "Evening",
      tasks: [
        { id: "skin-pm-cleanse", name: "Cleanse" },
        { id: "skin-pm-epiduo", name: "Epiduo" },
        { id: "skin-pm-moisturise", name: "Moisturise" },
      ],
    },
  ],
};
