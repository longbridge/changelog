/**
 * `lastmod` for the sitemap: when each listed page last changed, taken from the release dates.
 *
 * The sitemap is generated from astro.config, where content collections aren't available, so this
 * reads the release frontmatter straight from disk. The rules mirror what the pages show:
 *   /<locale>/changelog                      newest release in that locale
 *   /<locale>/changelog/<product>            newest release of that product
 *   /<locale>/changelog/<product>/v<major>   newest release in that major
 * Previews are left out (they are not on these pages); drafts only count in builds that show them.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { majorOf } from './products.config'
import { LOCALES, SITE_SEGMENT } from './site.config'

const RELEASES_DIR = fileURLToPath(new URL('../src/content/releases', import.meta.url))
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/

interface Frontmatter {
  product?: string
  version?: string
  releasedAt?: string | Date
  status?: string
  prerelease?: boolean
}

/** Page path (without base, no trailing slash) → newest release date on that page */
export function releaseLastmod(showDrafts: boolean): Map<string, Date> {
  const lastmod = new Map<string, Date>()
  const bump = (path: string, date: Date) => {
    const current = lastmod.get(path)
    if (!current || date > current) lastmod.set(path, date)
  }

  for (const locale of LOCALES) {
    const localeDir = join(RELEASES_DIR, locale)
    let products: string[]
    try {
      products = readdirSync(localeDir)
    } catch {
      continue
    }
    for (const product of products) {
      let files: string[]
      try {
        files = readdirSync(join(localeDir, product)).filter((file) => file.endsWith('.mdx'))
      } catch {
        continue
      }
      for (const file of files) {
        const match = readFileSync(join(localeDir, product, file), 'utf8').match(FRONTMATTER)
        if (!match) continue
        const data = parse(match[1]) as Frontmatter
        const visible = data.status === 'published' || (showDrafts && data.status === 'draft')
        if (!visible || data.prerelease || !data.version || !data.releasedAt) continue
        const date = new Date(data.releasedAt)
        if (Number.isNaN(date.getTime())) continue

        const list = `/${locale}/${SITE_SEGMENT}`
        bump(list, date)
        bump(`${list}/${product}`, date)
        bump(`${list}/${product}/v${majorOf(data.version)}`, date)
      }
    }
  }
  return lastmod
}
