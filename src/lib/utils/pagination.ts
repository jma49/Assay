/** The page typed into a jump-to-page box, or null when it is not a page that exists. */
export function parseJumpPage(input: string, totalPages: number): number | null {
  const page = parseInt(input, 10);
  return !isNaN(page) && page >= 1 && page <= totalPages ? page : null;
}

const JUMP_EDITING_KEYS = ["ArrowLeft", "ArrowRight", "Delete", "Backspace", "Tab"];

/** Whether a key may reach the jump box, which only takes digits and editing keys. */
export function isJumpInputKey(key: string): boolean {
  return /[\d\b]/.test(key) || JUMP_EDITING_KEYS.includes(key);
}

/** 1-based indexes of the first and last item on a page, kept within the item count. */
export function pageRange(page: number, pageSize: number, totalItems: number): { start: number; end: number } {
  return {
    start: Math.min((page - 1) * pageSize + 1, totalItems),
    end: Math.min(page * pageSize, totalItems),
  };
}

export interface PageInfo {
  start: number;
  end: number;
  totalItems: number;
  page: number;
  totalPages: number;
}

/** Fills the "Showing %s-%s of %s results (Page %s of %s)" template. */
export function formatPageInfo(template: string, { start, end, totalItems, page, totalPages }: PageInfo): string {
  return [start, end, totalItems, page, totalPages].reduce<string>(
    (text, value) => text.replace("%s", String(value)),
    template,
  );
}

/** The page-info line for a page of `pageSize` items. */
export function describePage(
  template: string,
  { page, totalPages, totalItems, pageSize }: { page: number; totalPages: number; totalItems: number; pageSize: number },
): string {
  return formatPageInfo(template, { ...pageRange(page, pageSize, totalItems), totalItems, page, totalPages });
}
