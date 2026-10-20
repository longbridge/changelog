/**
 * rss.xml 与 rss.json 共用的条目：同一语言最新 50 个已发布的小版本。
 */
import { getProduct, majorOf } from '@config/products.config'
import { majorPath, type Locale } from '@lib/i18n'
import { listReleases, slugOf } from '@lib/releases'

export const FEED_LIMIT = 50

export interface FeedItem {
  product: string
  productName: string
  version: string
  tag: string
  major: string
  /** 这版做了什么，不带产品名与版本号 */
  title: string
  summary: string
  highlights: string[]
  platforms: string[]
  releasedAt: Date
  /** 站内路径：小版本没有独立页面，指向大版本页里它那一节 */
  path: string
}

export async function feedItems(locale: Locale): Promise<FeedItem[]> {
  const releases = await listReleases(locale)
  return releases.slice(0, FEED_LIMIT).map((entry) => {
    const major = majorOf(entry.data.version)
    return {
      product: entry.data.product,
      productName: getProduct(entry.data.product)?.name[locale] ?? entry.data.product,
      version: entry.data.version,
      tag: entry.data.tag,
      major,
      title: entry.data.title,
      summary: entry.data.summary,
      highlights: entry.data.highlights,
      platforms: entry.data.platforms ?? [],
      releasedAt: entry.data.releasedAt,
      path: `${majorPath(locale, entry.data.product, major)}#${slugOf(entry)}`,
    }
  })
}

/** 阅读器里只有标题这一行，产品与版本号要带上，后面接这版做了什么 */
export const feedItemTitle = (item: FeedItem) => `${item.productName} ${item.version} · ${item.title}`
