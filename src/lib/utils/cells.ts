const ISO_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z$/;

/** A result cell as text: NULL for missing values, ISO timestamps without milliseconds or the T. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "string") {
    const iso = ISO_TIMESTAMP.exec(value);
    if (iso) return `${iso[1]} ${iso[2]}`;
    return value;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
