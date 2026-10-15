import { sourceId, type ProductConfig, type RepoSource } from '../../config/products.config'
import type { Locale } from '../../config/site.config'
import type { RawRelease } from './provider'

/** 抓取后落盘、并作为 transform 输入的标准结构 */
export interface NormalizedRelease {
  productId: string
  provider: RepoSource['provider']
  /** 来源标识：仓库路径、App Store id 或接口地址 */
  repo: string
  /** 这条原文的语言 */
  locale: Locale
  /** 原文是否已是对外口径 */
  curated: boolean
  tag: string
  /** 从 tag 提取的展示版本号，如 2.3.11 */
  version: string
  title: string
  body: string
  publishedAt: string
  url: string
  platforms: string[]
  prerelease: boolean
}

/** tag 里可能有 / 或空格，落盘前统一成安全文件名 */
export function slugifyTag(tag: string): string {
  return tag
    .trim()
    .replace(/[^\w.\-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function extractVersion(tag: string, pattern?: RegExp): string {
  const named = pattern ? pattern.exec(tag)?.groups?.version : undefined
  if (named) return named
  // 没有配置捕获组时，尽力从 tag 里挖一个 semver 出来
  const semver = /(\d+\.\d+(?:\.\d+)?(?:[-+][\w.]+)?)/.exec(tag)?.[1]
  return semver ?? tag.replace(/^v/i, '')
}

function compile(pattern?: string): RegExp | undefined {
  return pattern ? new RegExp(pattern) : undefined
}

/** 按来源配置过滤 release，并归一化为 NormalizedRelease */
export function normalize(
  product: ProductConfig,
  source: RepoSource,
  releases: RawRelease[],
): NormalizedRelease[] {
  const include = compile(source.tagPattern)
  const exclude = compile(source.excludeTagPattern)
  const since = source.since ? new Date(source.since).getTime() : undefined

  return releases
    .filter((release) => {
      if (exclude?.test(release.tag)) return false
      if (include && !include.test(release.tag)) return false
      if (release.prerelease && !source.includePrerelease) return false
      if (since !== undefined && new Date(release.publishedAt).getTime() < since) return false
      return true
    })
    .map((release) => ({
      productId: product.id,
      provider: source.provider,
      repo: sourceId(source),
      locale: release.locale,
      curated: release.curated,
      tag: release.tag,
      version: extractVersion(release.tag, include),
      title: release.title,
      body: release.body,
      publishedAt: release.publishedAt,
      url: release.url,
      platforms: source.platforms ?? [],
      prerelease: release.prerelease,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}
