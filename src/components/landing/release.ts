import "server-only";
import pkg from "../../../package.json";

const major = (range: string) => range.match(/\d+/)?.[0] ?? range;
const minimum = (range: string) => (range.match(/\d+(?:\.\d+)?/)?.[0] ?? range).replace(/\.0$/, "");

/** The values the self-host rating plate engraves, read from package.json on the server so the JSON never ships. */
export const RELEASE = { version: pkg.version, next: major(pkg.dependencies.next), node: minimum(pkg.engines.node) };

export type Release = typeof RELEASE;
