// Remembers the display name on this device so joining the next team is one tap
const KEY = 'ta:name'

export function loadMyName(): string {
  try {
    return localStorage.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveMyName(name: string) {
  try {
    localStorage.setItem(KEY, name)
  } catch {
    // private mode: ignore
  }
}
