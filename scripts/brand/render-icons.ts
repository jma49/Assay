/**
 * Writes the favicon from the voxel beetle, so the icon and the 3D figure
 * never drift apart. Run after changing src/lib/brand/beetle.ts:
 *   tsx scripts/brand/render-icons.ts
 */
import { writeFileSync } from "node:fs";
import { beetleIconSvg } from "@/lib/brand/beetle";

writeFileSync("src/app/icon.svg", `${beetleIconSvg()}\n`);
console.log("Wrote src/app/icon.svg");
