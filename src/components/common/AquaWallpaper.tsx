/**
 * Desktop picture in the spirit of early Mac OS X: deep Aqua blue with soft,
 * glowing swooshes (original artwork, public/aqua-wallpaper.svg).
 *
 * Drawn as a CSS background image rather than inline SVG: the browser
 * rasterises it once, so the blurs are not re-run whenever the translucent
 * menu bar and Dock repaint over it.
 */
export function AquaWallpaper({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#0f4fb0] bg-[url(/aqua-wallpaper.svg)] bg-cover bg-center ${className}`}
    >
      {/* Night: dim the picture so dark windows don't glare against it. */}
      <div className="absolute inset-0 hidden bg-[#020a1e]/55 dark:block" />
    </div>
  );
}
