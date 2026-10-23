import { getCollection, type CollectionEntry } from 'astro:content'
import type { Locale } from './i18n'
import { getProduct } from '../../config/products.config'

export type Release = CollectionEntry<'releases'>

/**
 * 生产构建只发布 status: published 的内容。
 * 本地 dev 与显式 SHOW_DRAFTS=1 时把草稿一起显示，方便编辑时预览。
 */
const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === '1'

export const isVisible = (entry: Release): boolean =>
  entry.data.status === 'published' || (showDrafts && entry.data.status === 'draft')

export const hasDrafts = showDrafts

/**
 * 0.9.0 要排在 0.10.0 前面，字符串比较做不到，按段比。
 * 预发布的后缀（1.0.0-preview.4 的 preview）算作 -1：同一天里正式版 1.0.0 排在它的预览版前面
 */
function compareVersion(a: string, b: string): number {
  const parse = (value: string) =>
    value.split(/[.\-+]/).map((part) => (/^\d+$/.test(part) ? Number(part) : -1))
  const left = parse(a)
  const right = parse(b)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (right[i] ?? 0) - (left[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** 同一天发布多个版本时，版本号大的在前 */
export const compareReleases = (a: Release, b: Release) =>
  b.data.releasedAt.getTime() - a.data.releasedAt.getTime() ||
  compareVersion(a.data.version, b.data.version)

/** 某语言下的全部可见 release，按发布时间倒序 */
export async function listReleases(locale: Locale): Promise<Release[]> {
  const entries = await getCollection('releases', (entry) => entry.data.locale === locale)
  // hidden 的产品照常抓取、编辑，但生产站点任何地方都不露出：列表、大版本页、RSS 都从这里取。
  // 显示草稿的构建（dev、MR 预览）是给内部验收的，hidden 的产品也放出来
  return entries
    .filter(
      (entry) => isVisible(entry) && (showDrafts || getProduct(entry.data.product)?.hidden !== true),
    )
    .sort(compareReleases)
}

/** MDX 文件名（不含扩展名）作为 URL 中的版本片段，保证与磁盘一致 */
export const slugOf = (entry: Release): string => entry.id.split('/').pop() ?? entry.id

/**
 * 跨页共享元素的过渡名。列表页与详情页的同一条目用同一个名字，
 * 浏览器会把标题从列表位置平移/缩放到详情位置。
 * view-transition-name 必须是合法 CSS ident，所以非 \w 字符统一换成 -
 */
const ident = (value: string) => value.replace(/[^\w-]/g, '-')

export const productTitleId = (productId: string) => ident(`product-title-${productId}`)

export const majorTitleId = (productId: string, major: string) =>
  ident(`major-title-${productId}-${major}`)
