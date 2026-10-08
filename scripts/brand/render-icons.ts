/**
 * Writes the favicon from the Row A mark, so the icon and the in-app mark never
 * drift apart. Run after changing src/lib/brand/mark.ts:
 *   tsx scripts/brand/render-icons.ts
 */
import { writeFileSync } from "node:fs";
import { markIconSvg } from "@/lib/brand/mark";

writeFileSync("src/app/icon.svg", `${markIconSvg()}\n`);
console.log("Wrote src/app/icon.svg");
