/**
 * JSON Feed 1.1（https://www.jsonfeed.org/version/1.1/），内容与 rss.xml 相同，给程序直接取用。
 * 标准字段之外，结构化的版本信息放在 _longbridge 扩展字段里（规范约定扩展以下划线开头）。
 */
import type { APIRoute, GetStaticPaths } from 'astro'
import { LOCALES, LOCALE_META, localePath, type Locale } from '@lib/i18n'
import { siteConfig } from '@config/site.config'
import { feedItemTitle, feedItems } from '@lib/feed'

export const getStaticPaths = (() =>
  LOCALES.map((locale) => ({ params: { locale } }))) satisfies GetStaticPaths

export const GET: APIRoute = async ({ params, site }) => {
  const locale = params.locale as Locale
  const origin = site ?? new URL(siteConfig.url)
  const abs = (path: string) => new URL(path, origin).toString()
  const items = await feedItems(locale)

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: siteConfig.name[locale],
    description: siteConfig.description[locale],
    home_page_url: abs(localePath(locale)),
    feed_url: abs(localePath(locale, 'rss.json')),
    language: LOCALE_META[locale].htmlLang,
    items: items.map((item) => ({
      id: abs(item.path),
      url: abs(item.path),
      title: feedItemTitle(item),
      summary: item.summary,
      content_text: [item.summary, ...item.highlights.map((highlight) => `- ${highlight}`)]
        .filter(Boolean)
        .join('\n'),
      date_published: item.releasedAt.toISOString(),
      tags: [item.productName],
      _longbridge: {
        product: item.product,
        product_name: item.productName,
        version: item.version,
        tag: item.tag,
        major: item.major,
        title: item.title,
        highlights: item.highlights,
        platforms: item.platforms,
      },
    })),
  }

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
