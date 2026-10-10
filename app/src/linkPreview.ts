export type LinkPreview = {
  url: string
  title: string
  description: string
  image: string
  site: string
}

const URL_RE = /(?:https?:\/\/|www\.)[^\s<]+/i
const TRAILING_RE = /[.,!?;:)\]}'"]+$/

export function firstUrl(text: string): string | null {
  const match = text.match(URL_RE)?.[0]
  if (!match) return null
  const url = match.replace(TRAILING_RE, '')
  return url.startsWith('www.') ? `https://${url}` : url
}

const clip = (s: unknown, max: number) => (typeof s === 'string' ? s.slice(0, max) : '')

// Browsers cannot read other sites' HTML (CORS) and Cloud Functions need Blaze,
// so the public Microlink API does the scraping. Free tier: ~50 requests/day.
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
    if (!res.ok) return null
    const json = await res.json()
    if (json.status !== 'success') return null
    const d = json.data ?? {}
    const preview = {
      url: clip(d.url || url, 1000),
      title: clip(d.title, 200),
      description: clip(d.description, 400),
      image: clip(d.image?.url ?? d.logo?.url, 1000),
      site: clip(d.publisher || new URL(d.url || url).hostname, 100),
    }
    return preview.title || preview.image ? preview : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
