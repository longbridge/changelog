/**
 * 素材路径统一过这里。
 *
 * MDX 里写的是 /release-assets/<product>/<version>/x.png 这种站点根路径，
 * 文件实际放在 public/changelog/release-assets/ 下：线上只有 /changelog/* 回源到本站，
 * 根路径属于主站。这里补上 base（MR 预览的 /mr-<iid>/）与 changelog 段，
 * 写稿的人不用关心部署结构。站内链接由 localePath() 处理。
 *
 * 外链（http/https/data/blob）原样返回，不加前缀。
 */
import { SITE_SEGMENT } from '@config/site.config'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export function assetPath(src: string): string {
  if (/^(https?:|data:|blob:|\/\/)/.test(src)) return src
  if (!src.startsWith('/')) return src
  return `${BASE}/${SITE_SEGMENT}${src}`
}
