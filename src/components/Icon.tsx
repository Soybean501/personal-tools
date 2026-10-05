import {
  Sparkles,
  Smile,
  Leaf,
  Heart,
  Dumbbell,
  BookOpen,
  Droplets,
  Coffee,
  BedDouble,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
export const routineIcons: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "sparkles", label: "Sparkles", icon: Sparkles },
  { id: "smile", label: "Smile", icon: Smile },
  { id: "leaf", label: "Leaf", icon: Leaf },
  { id: "heart", label: "Heart", icon: Heart },
  { id: "fitness", label: "Fitness", icon: Dumbbell },
  { id: "book", label: "Reading", icon: BookOpen },
  { id: "water", label: "Water", icon: Droplets },
  { id: "coffee", label: "Coffee", icon: Coffee },
  { id: "sleep", label: "Sleep", icon: BedDouble },
  { id: "list", label: "Checklist", icon: ListChecks },
];
export function ToolIcon({
  id,
  icon,
  size = 24,
}: {
  id: string;
  icon?: string;
  size?: number;
}) {
  const fallback =
    id === "skincare" ? "sparkles" : id === "oral-hygiene" ? "smile" : "leaf";
  const Icon =
    routineIcons.find((x) => x.id === (icon || fallback))?.icon ?? Leaf;
  return <Icon size={size} strokeWidth={1.7} />;
}
