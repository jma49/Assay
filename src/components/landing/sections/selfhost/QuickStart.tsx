import { useRef, useState } from "react";
import { useCopy } from "../../lib/i18n";
import { selfhostCopy } from "./copy";

const CLONE = "git clone https://github.com/jma49/Assay.git";

/**
 * The quick start as a film slip laid over the plate's lower edge, with a real Copy button (hidden without JS; the text
 * stays selectable). A successful copy dispatches `sh:copied` on the slip: selfhost.motion.ts stamps it.
 */
export function QuickStart() {
  const t = useCopy(selfhostCopy);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState("");
  const slip = useRef<HTMLDivElement>(null);
  const reset = useRef(0);
  const lines: [string, boolean][] = [
    [CLONE, false],
    ["cd Assay && npm install", false],
    [t.c1, true],
    ["cp .env.example .env.local", false],
    [t.c2, true],
    ["npm run seed:demo", false],
    ["npm run dev", false],
  ];

  async function copy() {
    const text = `${lines.map(([line]) => line).join("\n")}\n`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopy(text);
    }
    setDone(ok);
    setStatus("");
    requestAnimationFrame(() => setStatus(ok ? t.copiedLong : t.copyFail));
    if (ok) slip.current?.dispatchEvent(new CustomEvent("sh:copied"));
    clearTimeout(reset.current);
    reset.current = window.setTimeout(() => setDone(false), 2400);
  }

  return (
    <div className="sh-slip" ref={slip}>
      <div className="sh-slip-head">
        <p className="sh-slip-name">
          <span className="lead-letters">{t.qs}</span>
          <span className="sh-slip-meta mono">bash</span>
        </p>
        <button className={done ? "sh-copy is-done" : "sh-copy"} type="button" aria-describedby="sh-copy-status" onClick={copy}>
          <svg className="sh-copy-i" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="5.25" y="5.25" width="8" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.75 3.25v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <svg className="sh-done-i" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="sh-copy-label">{done ? t.copied : t.copy}</span>
        </button>
        <span id="sh-copy-status" className="sr-only" role="status" aria-live="polite">
          {status}
        </span>
      </div>
      <span className="sh-stamp" aria-hidden="true">
        <span>{t.stamp}</span>
      </span>
      <pre className="sh-code proof" id="sh-quickstart">
        <code>
          {lines.map(([line, comment]) => (
            <span key={line} className={comment ? "l c" : "l"}>
              {line}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

function fallbackCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}
