import rss from '@astrojs/rss'
import type { APIRoute, GetStaticPaths } from 'astro'
import { LOCALES, localePath, type Locale } from '@lib/i18n'
import { siteConfig } from '@config/site.config'
import { feedItemTitle, feedItems } from '@lib/feed'

export const getStaticPaths = (() =>
  LOCALES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths

export const GET: APIRoute = async ({ params, site }) => {
  const locale = params.locale as Locale
  const items = await feedItems(locale)

  return rss({
    title: siteConfig.name[locale],
    description: siteConfig.description[locale],
    // 频道链接指向该语言的列表页，要带上部署前缀；条目链接本身已含前缀，按路径解析不受影响
    site: new URL(localePath(locale), site ?? siteConfig.url).toString(),
    // 与站点一致不带尾斜杠；默认 true 会把频道链接补成 /en/changelog/
    trailingSlash: false,
    items: items.map((item) => ({
      title: feedItemTitle(item),
      description: item.summary || item.highlights.join(' · '),
      pubDate: item.releasedAt,
      link: item.path,
    })),
  })
}
