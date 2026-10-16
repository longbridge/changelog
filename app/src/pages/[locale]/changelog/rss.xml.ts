import rss from '@astrojs/rss'
import type { APIRoute, GetStaticPaths } from 'astro'
import { LOCALES, localePath, majorPath, type Locale } from '@lib/i18n'
import { siteConfig } from '@config/site.config'
import { getProduct, majorOf } from '@config/products.config'
import { listReleases, slugOf } from '@lib/releases'

export const getStaticPaths = (() =>
  LOCALES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths

export const GET: APIRoute = async ({ params, site }) => {
  const locale = params.locale as Locale
  const releases = await listReleases(locale)

  return rss({
    title: siteConfig.name[locale],
    description: siteConfig.description[locale],
    // 频道链接指向该语言的列表页，要带上部署前缀；条目链接本身已含前缀，按路径解析不受影响
    site: new URL(localePath(locale), site ?? siteConfig.url).toString(),
    // 与站点一致不带尾斜杠；默认 true 会把频道链接补成 /en/changelog/
    trailingSlash: false,
    items: releases.slice(0, 50).map((entry) => ({
      // 阅读器里只有这一行，产品与版本号要带上，后面接标题说这版做了什么
      title: `${getProduct(entry.data.product)?.name[locale] ?? entry.data.product} ${entry.data.version} · ${entry.data.title}`,
      description: entry.data.summary || entry.data.highlights.join(' · '),
      pubDate: entry.data.releasedAt,
      // 小版本没有独立页面，链接指向大版本页里它那一节
      link: `${majorPath(locale, entry.data.product, majorOf(entry.data.version))}#${slugOf(entry)}`,
    })),
  })
}
