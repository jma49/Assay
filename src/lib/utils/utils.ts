import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** The `text-<level>` sizes from globals.css; tailwind-merge would otherwise read them as colours. */
const TYPE_SCALE = [
  "display-xl",
  "display-lg",
  "display-md",
  "display-sm",
  "headline",
  "title",
  "title-sm",
  "body-lg",
  "body-md",
  "body-sm",
  "caption",
  "label-caps",
  "stat",
] as const;

const twMerge = extendTailwindMerge({ extend: { theme: { text: [...TYPE_SCALE] } } });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
