import type { ScriptInfo } from "../types";

const HASHTAG = /#(\w+)/g;

/**
 * Checks matching a search: plain words match the id, names and
 * descriptions; each `#tag` must match (by substring) one of the check's tags.
 */
export function filterScripts(scripts: ScriptInfo[], term: string): ScriptInfo[] {
  const query = term.trim().toLowerCase();
  if (!query) return scripts;
  const tags = [...query.matchAll(HASHTAG)].map((match) => match[1]);
  const text = query.replace(HASHTAG, "").trim();
  return scripts.filter((script) => {
    const textMatches =
      !text ||
      [script.scriptId, script.name, script.cnName, script.description, script.cnDescription].some((field) =>
        (field ?? "").toLowerCase().includes(text),
      );
    const tagsMatch = tags.every((tag) => script.hashtags?.some((own) => own.toLowerCase().includes(tag)));
    return textMatches && tagsMatch;
  });
}

export function collectHashtags(scripts: ScriptInfo[]): string[] {
  return [...new Set(scripts.flatMap((script) => script.hashtags ?? []))].sort();
}

export type BulkMode = "all" | "scheduled";

export function batchTargets(scripts: ScriptInfo[], mode: BulkMode): ScriptInfo[] {
  return mode === "scheduled" ? scripts.filter((script) => script.isScheduled) : scripts;
}

/** Replaces the tag being typed at the end of the search with the chosen one. */
export function withHashtag(term: string, tag: string): string {
  return `${term.replace(/#\w*$/, "")}#${tag}`.trim();
}
