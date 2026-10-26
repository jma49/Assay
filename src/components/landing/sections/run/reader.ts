/**
 * Desktop, fine pointer: a thin neutral reading line runs under the row at the pointer and prints that row on a lead
 * tag (`SKU-0007 · Chair 7 · on_hand -3 · returned`). Lumen stays reserved for returned rows.
 */
import { RUN_A, RUN_B } from "./data";

export interface ReaderCopy {
  returned: string;
  notReturned: string;
}

export function readRows(root: HTMLElement, step: () => number, copy: () => ReaderCopy, signal: AbortSignal) {
  const films = root.querySelector<HTMLElement>(".run-films")!;
  const rows = [...root.querySelectorAll<HTMLElement>(".rf-a .f-rows .r")];
  const narrow = matchMedia("(max-width: 1100px)");
  const reader = document.createElement("div");
  reader.className = "rreader";
  reader.setAttribute("aria-hidden", "true");
  const tag = document.createElement("span");
  tag.className = "rreader-tag";
  reader.appendChild(tag);
  films.appendChild(reader);

  const bold = (text: string) => {
    const b = document.createElement("b");
    b.textContent = text;
    return b;
  };
  let raf = 0;
  let px = 0;
  let py = 0;
  let last: HTMLElement | null = null;
  const off = () => {
    films.classList.remove("is-reading");
    last = null;
  };
  function read() {
    raf = 0;
    if (narrow.matches || step() < 1) return off();
    const hit = rows.find((r) => {
      const b = r.getBoundingClientRect();
      return py >= b.top && py < b.bottom && px >= b.left - 6 && px <= b.right + 6;
    });
    if (!hit) return off();
    if (hit !== last) {
      last = hit;
      const n = rows.indexOf(hit) + 1;
      const [id, name] = [...hit.children].map((c) => c.textContent ?? "");
      // from step 3 on the film in register is the next run's
      const values = step() >= 2 ? RUN_B[n] : RUN_A[n];
      const { returned, notReturned } = copy();
      if (values) tag.replaceChildren(`${id} · ${name} · on_hand `, bold(values[0]), " · ", bold(returned));
      else tag.replaceChildren(`${id} · ${name} · ${notReturned}`);
      const f = films.getBoundingClientRect();
      const b = hit.getBoundingClientRect();
      reader.style.cssText = `left:${b.left - f.left - 4}px;width:${b.width + 8}px;top:${b.top - f.top}px`;
    }
    films.classList.add("is-reading");
  }
  films.addEventListener(
    "pointermove",
    (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(read);
    },
    { signal },
  );
  films.addEventListener("pointerleave", off, { signal });

  return () => {
    cancelAnimationFrame(raf);
    films.classList.remove("is-reading");
    reader.remove();
  };
}
