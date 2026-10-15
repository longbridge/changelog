import { DEFAULT_LOCALE, LOCALES, LOCALE_META, SITE_SEGMENT, siteConfig, type Locale } from '../../config/site.config'

export { DEFAULT_LOCALE, LOCALES, LOCALE_META }
export type { Locale }

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

/**
 * 站点内链接统一从这里生成，避免 base、语言前缀与 changelog 段拼错。
 * 与主站一致语言在前，地址一律不带尾斜杠（/en/changelog、/en/changelog/longbridge-pro/0.20），
 * 与 astro.config 的 trailingSlash: 'never' 一致；产物仍是目录式 index.html，由 nginx 映射。
 */
export function localePath(locale: Locale, ...segments: Array<string | undefined>): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const parts = [locale, SITE_SEGMENT, ...segments.filter((s): s is string => Boolean(s))]
  return `${base}/${parts.join('/')}`.replace(/\/{2,}/g, '/')
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

/** 月份分组标题：一条流读下来，月份是唯一的锚点 */
export function formatMonth(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].dateLocale, {
    year: 'numeric',
    month: 'long',
  }).format(date)
}

/** 时间轴上的日期：月份已经在分组标题里，这里只留到日 */
export function formatDayInMonth(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_META[locale].dateLocale, {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/** OG 协议要下划线格式，不是原始的连字符 locale */
const OG_LOCALE: Record<Locale, string> = {
  'zh-CN': 'zh_CN',
  'zh-HK': 'zh_HK',
  en: 'en_US',
}

export const ogLocale = (locale: Locale): string => OG_LOCALE[locale] ?? locale.replace('-', '_')

/** hreflang 的语言部分：中文要用 Hans / Hant 书写系统标签 */
const HREFLANG_BASE: Record<Locale, string> = {
  'zh-CN': 'zh-Hans',
  'zh-HK': 'zh-Hant',
  en: 'en',
}

/**
 * 一个语言展开成「该语言 × 各目标区域」的一组 hreflang。
 * 刻意不输出 x-default：本站没有语言中性的页面，self-referencing 的 x-default 反而有害。
 */
export function hreflangsOf(locale: Locale): string[] {
  return siteConfig.hreflangRegions.map((region) => `${HREFLANG_BASE[locale]}-${region}`)
}

type Dict = Record<Locale, string>

/** 界面文案。正文内容来自 MDX，这里只放 UI 壳的字。 */
export const t = {
  allProducts: { 'zh-CN': '全部产品', 'zh-HK': '全部產品', en: 'All products' },
  allReleaseNotes: { 'zh-CN': '全部更新日志', 'zh-HK': '全部更新日誌', en: 'All release notes' },
  developers: { 'zh-CN': '开发者平台', 'zh-HK': '開發者平台', en: 'Developers' },
  latestRelease: { 'zh-CN': '最新版本', 'zh-HK': '最新版本', en: 'Latest release' },
  releaseHistory: { 'zh-CN': '历史版本', 'zh-HK': '歷史版本', en: 'Release history' },
  versions: { 'zh-CN': '个版本', 'zh-HK': '個版本', en: 'releases' },
  viewAll: { 'zh-CN': '查看全部版本', 'zh-HK': '查看全部版本', en: 'View all releases' },
  backToProduct: { 'zh-CN': '返回版本列表', 'zh-HK': '返回版本列表', en: 'Back to all releases' },
  highlights: { 'zh-CN': '本次亮点', 'zh-HK': '今次亮點', en: 'Highlights' },
  releasedOn: { 'zh-CN': '发布于', 'zh-HK': '發佈於', en: 'Released on' },
  empty: {
    'zh-CN': '暂未发布对外更新日志。',
    'zh-HK': '暫未發佈對外更新日誌。',
    en: 'No release notes published yet.',
  },
  draftBadge: { 'zh-CN': '草稿', 'zh-HK': '草稿', en: 'Draft' },
  draftNotice: {
    'zh-CN': '本地预览模式：以下包含尚未定稿的草稿内容，不会出现在正式站点。',
    'zh-HK': '本地預覽模式：以下包含尚未定稿的草稿內容，不會出現在正式網站。',
    en: 'Preview mode: drafts below are excluded from the production build.',
  },
  newer: { 'zh-CN': '更新的版本', 'zh-HK': '更新的版本', en: 'Newer' },
  older: { 'zh-CN': '更早的版本', 'zh-HK': '更早的版本', en: 'Older' },
  subscribe: { 'zh-CN': '订阅更新', 'zh-HK': '訂閱更新', en: 'Subscribe' },
  download: { 'zh-CN': '前往下载', 'zh-HK': '前往下載', en: 'Download' },
  visit: { 'zh-CN': '前往访问', 'zh-HK': '前往訪問', en: 'Visit' },
  language: { 'zh-CN': '语言', 'zh-HK': '語言', en: 'Language' },
  officialSite: { 'zh-CN': 'Longbridge 官网', 'zh-HK': 'Longbridge 官網', en: 'Longbridge' },
  // 页脚主站入口，文案与 longbridge.com 顶栏导航的三语翻译一致
  news: { 'zh-CN': '资讯', 'zh-HK': '資訊', en: 'News' },
  community: { 'zh-CN': '社区', 'zh-HK': '社群', en: 'Community' },
  longbridgeAI: { 'zh-CN': 'LongbridgeAI', 'zh-HK': 'LongbridgeAI', en: 'LongbridgeAI' },
  markets: { 'zh-CN': '市场', 'zh-HK': '市場', en: 'Market' },
  allUpdates: { 'zh-CN': '全部更新', 'zh-HK': '全部更新', en: 'All updates' },
  otherVersions: { 'zh-CN': '其他版本', 'zh-HK': '其他版本', en: 'Other versions' },
  currentVersion: { 'zh-CN': '当前查看', 'zh-HK': '目前查看', en: 'Currently viewing' },
  closeVersions: { 'zh-CN': '关闭版本列表', 'zh-HK': '關閉版本列表', en: 'Close version list' },
  expandImage: { 'zh-CN': '放大查看', 'zh-HK': '放大查看', en: 'Expand image' },
  playDemo: { 'zh-CN': '启动演示', 'zh-HK': '啟動演示', en: 'Launch demo' },
  play: { 'zh-CN': '播放', 'zh-HK': '播放', en: 'Play' },
  pause: { 'zh-CN': '暂停', 'zh-HK': '暫停', en: 'Pause' },
  seek: { 'zh-CN': '拖动进度', 'zh-HK': '拖動進度', en: 'Seek' },
  goToPage: { 'zh-CN': '前往页面', 'zh-HK': '前往頁面', en: 'Go to page' },
  previewBlocked: {
    'zh-CN': '该页面不支持内嵌预览',
    'zh-HK': '該頁面不支援內嵌預覽',
    en: 'This page can’t be previewed inline',
  },
  before: { 'zh-CN': '此前', 'zh-HK': '此前', en: 'Before' },
  after: { 'zh-CN': '现在', 'zh-HK': '現在', en: 'After' },
} satisfies Record<string, Dict>
