export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

// Stable color per user so people are recognizable at a glance
export function colorFor(uid: string) {
  let h = 0
  for (const c of uid) h = (h * 31 + c.charCodeAt(0)) % 360
  return `hsl(${h} 60% 45%)`
}
