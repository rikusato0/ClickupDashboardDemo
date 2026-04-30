/** Vector mark ships with the bundle so the header never depends on a missing static file. */

export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        stroke="#06b6d4"
        strokeWidth={2}
        strokeLinejoin="round"
        d="M24 3 42.5 13.75v20.5L24 45 5.5 34.25v-20.5L24 3z"
      />
      <path
        fill="#FF8500"
        d="M24 29c4.5-5 7.5-10.5 7-14.5-.4-3.2-2.6-5-7-5s-6.6 1.8-7 5c-.5 4 2.5 9.5 7 14.5Z"
      />
      <path
        fill="#FF8500"
        fillOpacity={0.85}
        d="m24 14-4 8 4 6 4-8-4-6Z"
      />
    </svg>
  )
}
