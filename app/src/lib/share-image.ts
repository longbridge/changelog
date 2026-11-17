/**
 * Share image for a page: the first screenshot in its MDX, as an absolute URL.
 *
 * Release pages have no dedicated cover, but most carry screenshots; the first one says more about
 * the release in a link preview than the square brand mark does. Only still images count: a
 * `<Figure src>`, a `<Video poster>`, a `<Compare>` before/after image or a Markdown image.
 * Video files themselves are skipped, since share cards can't show them.
 */
import { assetPath } from './assets'

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i

const PATTERNS = [
  // <Figure src="…"> and <Compare before="…" after="…">
  /<(?:Figure|Compare)\b[^>]*?\b(?:src|before|after)="([^"]+)"/g,
  // <Video poster="…">
  /<Video\b[^>]*?\bposter="([^"]+)"/g,
  // ![alt](url)
  /!\[[^\]]*\]\(([^)\s]+)/g,
]

/** First still image across the given MDX bodies, in order; undefined when there is none */
export function firstImage(bodies: (string | undefined)[], site: URL | undefined): string | undefined {
  for (const body of bodies) {
    if (!body) continue
    let best: { index: number; src: string } | undefined
    for (const pattern of PATTERNS) {
      for (const match of body.matchAll(pattern)) {
        const src = match[1]
        if (!IMAGE_EXT.test(src)) continue
        if (!best || match.index < best.index) best = { index: match.index, src }
        break
      }
    }
    if (best) return absolute(best.src, site)
  }
  return undefined
}

function absolute(src: string, site: URL | undefined): string | undefined {
  const path = assetPath(src)
  if (/^https?:/.test(path)) return path
  if (path.startsWith('//')) return `https:${path}`
  return site ? new URL(path, site).href : undefined
}
