/** White Lotus brand mark. The artwork lives in /public so we can swap files without
 * touching the component. We use a PNG because the lotus + hexagon mark has subtle
 * gradient strokes that don't round-trip well as inline SVG. */

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/icon128.png"
      alt="White Lotus Bookkeeping"
      className={className}
      draggable={false}
    />
  )
}
