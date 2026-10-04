import type { KeyboardEvent } from "react";

/**
 * Finder-style list keys: ↑/↓ (and Home/End) move the selection and focus
 * with it; Enter opens the selected item. Items carry data-list-id.
 */
export function listKeyHandler(
  ids: string[],
  selectedId: string | null,
  select: (id: string) => void,
  open?: (id: string) => void,
) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (ids.length === 0) return;
    const index = selectedId ? ids.indexOf(selectedId) : -1;
    const target = {
      ArrowDown: Math.min(index + 1, ids.length - 1),
      ArrowUp: Math.max(index - 1, 0),
      Home: 0,
      End: ids.length - 1,
    }[event.key];

    if (target !== undefined) {
      event.preventDefault();
      const id = ids[target];
      select(id);
      const list = event.currentTarget;
      requestAnimationFrame(() => {
        list.querySelector<HTMLElement>(`[data-list-id="${CSS.escape(id)}"]`)?.focus();
      });
    } else if (event.key === "Enter" && open && selectedId) {
      event.preventDefault();
      open(selectedId);
    }
  };
}
