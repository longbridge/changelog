/**
 * 素材路径统一过这里。
 *
 * MDX 里写的是 /assets/<product>/<version>/x.png 这种站点根路径，文件在仓库根的 assets/ 下
 * （public/changelog/assets 是指向它的软链接；组件预览页的示例图在 public/changelog/release-assets/）。
 * 线上只有 /changelog/* 回源到本站，根路径属于主站，所以这里补上 base 与 changelog 段，
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
