import fs from 'node:fs/promises'
import path from 'node:path'
import YAML from 'yaml'
import type { NormalizedRelease } from './release'
import { slugifyTag } from './release'
import { RAW_DIR, rawFile, rawProductDir } from './paths'

export interface FrontmatterFile<T> {
  data: T
  body: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export function parseFrontmatter<T>(source: string): FrontmatterFile<T> {
  const match = FRONTMATTER.exec(source)
  if (!match) return { data: {} as T, body: source }
  return {
    data: (YAML.parse(match[1]) ?? {}) as T,
    body: source.slice(match[0].length),
  }
}

export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  const yaml = YAML.stringify(data, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body.trim()}\n`
}

export type WriteResult = 'created' | 'updated' | 'unchanged'

/** 把一条 release 写进 releases/<product>/<tag>.<locale>.md */
export async function writeRaw(release: NormalizedRelease): Promise<WriteResult> {
  const file = rawFile(release.productId, `${slugifyTag(release.tag)}.${release.locale}`)
  const { body, ...meta } = release
  const next = stringifyFrontmatter({ ...meta, fetchedAt: new Date().toISOString() }, body)

  const previous = await fs.readFile(file, 'utf8').catch(() => null)
  if (previous !== null) {
    // fetchedAt 每次都会变，比较时剔除，避免无意义的 diff
    const strip = (text: string) => text.replace(/^fetchedAt: .*$/m, '')
    if (strip(previous) === strip(next)) return 'unchanged'
  }

  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, next, 'utf8')
  return previous === null ? 'created' : 'updated'
}

/** 读回某个产品（或全部产品）已抓取的 release，按发布时间倒序；产品手写的稿子没有 fetchedAt，跳过 */
export async function readRaw(productId?: string): Promise<NormalizedRelease[]> {
  const products = productId
    ? [productId]
    : await fs
        .readdir(RAW_DIR, { withFileTypes: true })
        .then((entries) => entries.filter((e) => e.isDirectory()).map((e) => e.name))
        .catch(() => [])

  const releases: NormalizedRelease[] = []
  for (const id of products) {
    const dir = rawProductDir(id)
    const files = await fs.readdir(dir).catch(() => [])
    for (const name of files.filter((f) => f.endsWith('.md'))) {
      const source = await fs.readFile(path.join(dir, name), 'utf8')
      const { data, body } = parseFrontmatter<Omit<NormalizedRelease, 'body'>>(source)
      if (!data?.tag || !('fetchedAt' in data)) continue
      releases.push({ ...data, body })
    }
  }
  return releases.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}
