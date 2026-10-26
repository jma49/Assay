/** The brand mark: a film with one lit row (the row lights with the hero's returned rows). */
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="3.5" width="15" height="13" rx="2" className="bm-film" />
      <rect x="5" y="9.25" width="10" height="1.5" rx=".75" className="bm-row" />
    </svg>
  );
}
