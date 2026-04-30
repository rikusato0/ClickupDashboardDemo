/**
 * XAxis tick that renders names horizontally and word-wraps at ~14 chars so long
 * client names like "Maple Street Credit Union" don't overflow their column.
 * Caps at two lines; anything left over is folded onto the second line.
 */
export function WrappedAxisTick(props: {
  x?: number
  y?: number
  payload?: { value: string }
  fontSize?: number
  maxCharsPerLine?: number
}) {
  const { x = 0, y = 0, payload, fontSize = 11, maxCharsPerLine = 14 } = props
  const text = payload?.value ?? ''
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxCharsPerLine && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  if (lines.length > 2) {
    lines[1] = lines.slice(1).join(' ')
    lines.length = 2
  }
  const lineHeight = fontSize + 2
  return (
    <g transform={`translate(${x},${y + 4})`}>
      {lines.map((line, i) => (
        <text
          key={i}
          x={0}
          y={i * lineHeight + lineHeight}
          textAnchor="middle"
          fill="#64748b"
          fontSize={fontSize}
        >
          {line}
        </text>
      ))}
    </g>
  )
}
