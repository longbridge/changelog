import { getCollection, type CollectionEntry } from 'astro:content'
import { majorOf, products, type ProductConfig } from '../../config/products.config'
import { compareReleases, listReleases, type Release } from './releases'
import type { Locale } from './i18n'

export type Major = CollectionEntry<'majors'>

const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1'

export const isVisible = (entry: Major): boolean =>
  entry.data.status === 'published' || (showDrafts && entry.data.status === 'draft')

/** 一个大版本：总结 + 它下面的小版本 */
export interface MajorGroup {
  entry: Major
  product: ProductConfig
  /** 小版本，按发布时间倒序 */
  releases: Release[]
  /** 最新一个小版本的时间，列表按它排序 */
  releasedAt: Date
  /** 最早一个小版本的时间，同月的话页面只显示一个日期 */
  startedAt: Date
}

/**
 * 某语言下的全部大版本，按最新小版本的时间倒序。
 * 没有可见小版本的大版本不出现——空壳还没人写内容时就是这种情况。
 */
export async function listMajors(locale: Locale): Promise<MajorGroup[]> {
  const entries = await getCollection('majors', (entry) => entry.data.locale === locale)
  const releases = await listReleases(locale)

  const groups: MajorGroup[] = []
  for (const entry of entries.filter(isVisible)) {
    const product = products.find((item) => item.id === entry.data.product)
    if (!product) continue

    const own = releases
      .filter(
        (release) =>
          release.data.product === entry.data.product &&
          majorOf(release.data.version) === entry.data.major,
      )
      .sort(compareReleases)
    if (own.length === 0) continue

    groups.push({
      entry,
      product,
      releases: own,
      releasedAt: own[0].data.releasedAt,
      startedAt: own[own.length - 1].data.releasedAt,
    })
  }

  return groups.sort((a, b) => b.releasedAt.getTime() - a.releasedAt.getTime())
}

export async function listProductMajors(locale: Locale, productId: string): Promise<MajorGroup[]> {
  const groups = await listMajors(locale)
  return groups.filter((group) => group.product.id === productId)
}

/** MDX 文件名就是 URL 里的大版本片段 */
export const majorSlugOf = (entry: Major): string => entry.id.split('/').pop() ?? entry.id
