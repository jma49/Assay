/** The hanger hardware, drawn once: a wire hook over the rack's rail, and a stainless spring clip. */
export function HangerDefs() {
  return (
    <svg className="hg-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <symbol id="hg-hook-shape" viewBox="0 0 32 40">
        <path
          d="M16 40V25C16 19.5 22.6 18 22.6 10.6C22.6 6.6 19.6 3.6 16 3.6C12.4 3.6 9.6 6.4 9.6 9.8"
          style={{ fill: "none", stroke: "var(--lt-metal-900)", strokeWidth: 2.8, strokeLinecap: "round" }}
        />
        <path
          d="M15.3 38.6V25C15.3 19.7 21.7 18 21.7 10.6C21.7 7.1 19.2 4.5 16 4.5"
          style={{ fill: "none", stroke: "var(--lt-metal-300)", strokeWidth: 0.8, strokeLinecap: "round" }}
        />
        <rect x="10.5" y="34.2" width="11" height="5.8" rx="1.4" style={{ fill: "var(--lt-metal-700)" }} />
        <rect x="11.4" y="35" width="9.2" height="1" rx="0.5" style={{ fill: "var(--lt-metal-300)", opacity: 0.7 }} />
      </symbol>
      <symbol id="hg-clip-shape" viewBox="0 0 24 34">
        <rect x="9" y="0" width="6" height="7" rx="1" style={{ fill: "var(--lt-metal-700)" }} />
        <rect x="2" y="5.2" width="20" height="5.4" rx="2.7" style={{ fill: "var(--lt-metal-800)" }} />
        <rect x="3.6" y="6.1" width="16.8" height="1.1" rx="0.55" style={{ fill: "var(--lt-metal-300)", opacity: 0.8 }} />
        <path
          d="M4.6 10.4H19.4L20.8 28.4C20.9 29.9 20.1 30.8 18.7 30.8H5.3C3.9 30.8 3.1 29.9 3.2 28.4Z"
          style={{ fill: "var(--lt-metal-300)", stroke: "var(--lt-metal-800)", strokeWidth: 1, strokeLinejoin: "round" }}
        />
        <path d="M7 12.6L6.2 24.6M17 12.6L17.8 24.6" style={{ stroke: "var(--lt-metal-sheen)", strokeWidth: 1, strokeLinecap: "round" }} />
        <circle cx="12" cy="16.4" r="1.9" style={{ fill: "var(--lt-metal-700)" }} />
        <circle cx="11.6" cy="16" r=".6" style={{ fill: "var(--lt-metal-300)" }} />
        <path d="M4.4 27.6H19.6" style={{ stroke: "var(--lt-metal-800)", strokeWidth: 1.3 }} />
        <path d="M6 29.4h1.6M9.4 29.4h1.6M13 29.4h1.6M16.4 29.4h1.6" style={{ stroke: "var(--lt-metal-900)", strokeWidth: 1.2 }} />
      </symbol>
    </svg>
  );
}

export function HangerHook() {
  return (
    <svg className="hg-hook" viewBox="0 0 32 40" aria-hidden="true" focusable="false">
      <use href="#hg-hook-shape" />
    </svg>
  );
}

export function SpringClips() {
  return (
    <span className="hg-clips" aria-hidden="true">
      <svg viewBox="0 0 24 34" focusable="false">
        <use href="#hg-clip-shape" />
      </svg>
      <svg viewBox="0 0 24 34" focusable="false">
        <use href="#hg-clip-shape" />
      </svg>
    </span>
  );
}
