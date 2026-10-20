/**
 * 站点级配置：语言、品牌、对外地址。
 * 只放「与具体产品无关」的东西，产品/仓库配置见 products.config.ts。
 */

/** 顺序即语言切换菜单的展示顺序 */
export const LOCALES = ['en', 'zh-CN', 'zh-HK'] as const
export type Locale = (typeof LOCALES)[number]

/** 站点默认展示语言：根路径识别不出浏览器语言时落到这里 */
export const DEFAULT_LOCALE: Locale = 'en'

/** 多语言文案的通用形状：所有 locale 必填，避免漏翻译时静默降级 */
export type I18nText = Record<Locale, string>

export const LOCALE_META: Record<Locale, { label: string; htmlLang: string; dateLocale: string }> = {
  en: { label: 'English', htmlLang: 'en', dateLocale: 'en-US' },
  'zh-CN': { label: '简体中文', htmlLang: 'zh-Hans', dateLocale: 'zh-CN' },
  'zh-HK': { label: '繁體中文', htmlLang: 'zh-Hant-HK', dateLocale: 'zh-HK' },
}

/**
 * 站点在语言之后的路径段，与主站一致语言在前：longbridge.com/zh-CN/changelog/<product>/<major>。
 * 构建产物也按这个结构落盘（dist/zh-CN/changelog/…），静态资源、sitemap 收在 dist/changelog/ 下，
 * 不占主站根路径。改这里要同步改主站反代的回源规则。
 */
export const SITE_SEGMENT = 'changelog'

export const siteConfig = {
  /** 生产环境站点的域名，用于 sitemap / canonical / RSS，正式地址是 longbridge.com/<locale>/changelog */
  url: 'https://longbridge.com',
  /** 构建的 base。线上、测试环境与本地都是 '/' */
  base: '/',
  /** 品牌主站，header/footer 的 Longbridge 入口指向这里 */
  brandUrl: 'https://longbridge.com',
  /**
   * 同一份构建也挂在别的域名下（nginx 反代）。在这些域名上打开时，页面里指向主站的链接
   * 换成对应域名，用户不会被带出当前站（BaseLayout 里的脚本按 location.hostname 替换）。
   * canonical、hreflang、sitemap、订阅源这些给搜索引擎和阅读器的地址仍用 url。
   */
  domainAliases: {
    'longbridge.cn': {
      'longbridge.com': 'longbridge.cn',
      'open.longbridge.com': 'open.longbridge.cn',
    },
  } as Record<string, Record<string, string>>,
  /** 顶栏的开发者平台外链。英文在根路径，中文按语言分目录 */
  developers: (locale: Locale) =>
    locale === 'en' ? 'https://open.longbridge.com' : `https://open.longbridge.com/${locale}`,
  logo: 'https://assets.wbrks.com/assets/logo/logo1.png',
  /** 预连接的域名：logo 与 favicon 都在这个 CDN 上 */
  preconnect: ['https://assets.wbrks.com'],
  /**
   * hreflang 展开的目标区域。longbridge.com 是单域名多 region，
   * 每个语言要按 BCP 47 的 language-REGION 展开成一组，覆盖各地定向。
   */
  hreflangRegions: ['SG', 'HK', 'US'] as const,
  /**
   * 页脚的主站入口，路径与 longbridge.com 顶栏导航一致（packages/navigation 的 use-nav），
   * 按语言分目录，三语都可直达。
   */
  footerLinks: (locale: Locale) => [
    { key: 'news', href: `https://longbridge.com/${locale}/news` },
    { key: 'community', href: `https://longbridge.com/${locale}/topics` },
    { key: 'longbridgeAI', href: `https://longbridge.com/${locale}/ai` },
    { key: 'markets', href: `https://longbridge.com/${locale}/markets` },
  ] as const,
  name: {
    'zh-CN': 'Longbridge 更新日志',
    'zh-HK': 'Longbridge 更新日誌',
    en: 'Longbridge Release Notes',
  } satisfies I18nText,
  /** header 品牌位只放品牌名，点进去是主站；站点全名留给 title 与 RSS */
  brand: 'Longbridge',
  description: {
    'zh-CN': 'Longbridge 各产品的版本更新说明与功能变更记录。',
    'zh-HK': 'Longbridge 各產品的版本更新說明與功能變更記錄。',
    en: 'Version updates and feature changes across Longbridge products.',
  } satisfies I18nText,
} as const
