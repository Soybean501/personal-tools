import { Sparkles, Smile, Leaf } from "lucide-react";
export function ToolIcon({ id, size = 24 }: { id: string; size?: number }) {
  const Icon =
    id === "skincare" ? Sparkles : id === "oral-hygiene" ? Smile : Leaf;
  return <Icon size={size} strokeWidth={1.7} />;
}
