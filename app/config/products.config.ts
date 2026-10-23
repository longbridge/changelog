import type { I18nText, Locale } from './site.config'

/**
 * Release 数据来源：
 *   gitlab / github  读仓库的 Release（正文常是内部口径，需要改写）
 *   repo-docs        读仓库里维护的更新日志目录（本身就是对外文案，按语言分目录）
 *   appstore         读 App Store 的版本更新说明，按商店区域区分语言
 *   release-api      读产品自己提供的版本说明接口（对外口径，按 Accept-Language 区分语言）
 */
export type Provider = 'gitlab' | 'github' | 'repo-docs' | 'appstore' | 'release-api'

interface SourceBase {
  /**
   * 只保留匹配的 tag（JS 正则字符串，不带斜杠）。
   * 建议带命名捕获组 version，用于从 tag 里提取展示版本号，
   * 例如 '^v(?<version>\\d+\\.\\d+\\.\\d+)$' 会把 v2.3.11 显示为 2.3.11。
   */
  tagPattern?: string
  /** 命中则丢弃，优先级高于 tagPattern，例如内部灰度 tag */
  excludeTagPattern?: string
  /** 是否收录预发布版本，默认 false */
  includePrerelease?: boolean
  /** 单次抓取上限，默认 50 */
  limit?: number
  /** 只抓这个日期之后发布的版本（ISO 日期，如 '2025-01-01'） */
  since?: string
  /** 该来源对应的平台标签，会写进 MDX frontmatter，例如 ['macOS', 'Windows'] */
  platforms?: string[]
}

export interface GitSource extends SourceBase {
  provider: 'gitlab' | 'github'
  /** 平台域名。gitlab 内部实例必填；github 公开仓库可省略 */
  host?: string
  /** gitlab: group/subgroup/project；github: owner/repo */
  repo: string
  /** 仓库里 Release 正文的语言，默认 zh-CN。缺的语言会从它翻译补齐 */
  sourceLocale?: Locale
}

/**
 * 仓库里手写维护的更新日志目录，例如
 * longbridge/longbridge-desktop-website 的 docs/release-notes（en）、
 * docs/zh-CN/release-notes、docs/zh-HK/release-notes。
 * 这类内容已经是对外口径，抓下来只做格式适配，不重写文案。
 */
export interface RepoDocsSource extends SourceBase {
  provider: 'repo-docs'
  /** 目前支持 github.com 上的公开仓库 */
  host?: string
  /** owner/repo */
  repo: string
  /** 分支或 tag，默认 main */
  ref?: string
  /** 语言 → 该语言更新日志所在目录 */
  paths: Partial<Record<Locale, string>>
  /** 文件名里怎么取版本号，需要带命名捕获组 version */
  filePattern?: string
  /** 这些文件不是版本说明，跳过 */
  ignore?: string[]
  /** 缺失语言从哪个语言翻译，默认按 paths 的第一个 */
  preferredSource?: Locale
  /**
   * 这些目录里的都是预发布版本（如官网单独维护的 preview 目录）。
   * 抓下来的版本标成 prerelease，站点上带「预览版」角标；设了它就不用再设 includePrerelease
   */
  prerelease?: boolean
}

export interface AppStoreSource extends SourceBase {
  provider: 'appstore'
  /** App Store 的数字 id，例如 Longbridge 是 1470042146 */
  appId: string
  /**
   * 语言 → 商店区域。同一个版本在不同区域就是不同语言的官方文案，
   * 没覆盖到的语言会从 `preferredSource` 翻译补齐。
   */
  storefronts: Partial<Record<Locale, string>>
  /** 翻译时优先拿哪个语言当原文，默认取 storefronts 里的第一个 */
  preferredSource?: Locale
}

/**
 * 产品自己对外提供的版本说明接口，例如 LongbridgeAI 的
 * https://m.lbkrs.com/api/forward/v1/babbage/public/release-notes。
 * 返回 { data: { release_notes: [{ version, feature_intro, published_at }], has_more, next_cursor } }，
 * 正文已是对外口径，语言靠请求头 Accept-Language 切换。
 */
export interface ReleaseApiSource extends SourceBase {
  provider: 'release-api'
  /** 接口地址，不带分页参数 */
  url: string
  /** 语言 → 请求时带的 Accept-Language */
  acceptLanguage: Partial<Record<Locale, string>>
}

export type RepoSource = GitSource | RepoDocsSource | AppStoreSource | ReleaseApiSource

/** 内容是否已经是对外口径：是的话 transform 不会重组文案 */
export const isCurated = (source: RepoSource): boolean =>
  source.provider === 'repo-docs' ||
  source.provider === 'appstore' ||
  source.provider === 'release-api'

/** 来源标识，写进 frontmatter 的 source.repo 与抓取日志：没有仓库路径的来源各有各的写法 */
export const sourceId = (source: RepoSource): string =>
  source.provider === 'appstore'
    ? `appstore:${source.appId}`
    : source.provider === 'release-api'
      ? new URL(source.url).host + new URL(source.url).pathname
      : source.repo

/** 该来源覆盖了哪些语言 */
export function sourceLocales(source: RepoSource): Locale[] {
  if (source.provider === 'repo-docs') return Object.keys(source.paths) as Locale[]
  if (source.provider === 'appstore') return Object.keys(source.storefronts) as Locale[]
  if (source.provider === 'release-api') return Object.keys(source.acceptLanguage) as Locale[]
  return [source.sourceLocale ?? 'zh-CN']
}

export interface ProductConfig {
  /** 唯一 id，同时作为 URL 片段与数据目录名，用 kebab-case */
  id: string
  name: I18nText
  summary: I18nText
  /** 卡片与详情页的主题色，注入成 --accent 供强调元素取用。
   *  统一用设计系统的品牌主色，除非某个产品另有官方品牌色 */
  accent: string
  /** 产品切换条上的图标，自家 CDN 完整 URL。用铺满的方形应用图标，圆角由站点统一裁；不要用透明底的品牌标记 */
  logo: string
  /** 列表排序，小的在前 */
  order: number
  /** 产品官网/下载页，展示在产品页。`{locale}` 会换成当前页面语言，跳到对应语言版本 */
  homepage?: string
  /** homepage 按钮的文案：客户端是下载，网页版是访问。默认 download */
  homepageAction?: 'download' | 'visit'
  /** 一个产品可以由多个仓库共同产出版本（如 iOS / Android 分仓） */
  sources: RepoSource[]
  /** 设为 true 时抓取照常、站点不展示，用于尚未对外的产品；显示草稿的构建（dev、MR 预览）里照常展示，方便验收 */
  hidden?: boolean
}

/**
 * 产品清单：新增一个对外产品 = 在这里加一项，然后 `bun run fetch`。
 * 来源只用公开渠道（repo-docs / appstore / release-api）；没有公开来源的产品 sources 留空，内容走 PR 提交。
 */
export const products: ProductConfig[] = [
  {
    id: 'longbridge-pro',
    order: 10,
    accent: '#00b8b8',
    logo: 'https://assets.lbkrs.com/uploads/2e476c46-8bb9-4689-a800-54877351520e/app-icon.svg',
    homepage: 'https://longbridge.com/{locale}/desktop',
    name: {
      'zh-CN': 'Longbridge Pro',
      'zh-HK': 'Longbridge Pro',
      en: 'Longbridge Pro',
    },
    summary: {
      'zh-CN': 'macOS、Windows 与 Linux 桌面客户端，面向专业投资者的多屏行情与交易终端。',
      'zh-HK': 'macOS、Windows 與 Linux 桌面客戶端，面向專業投資者的多螢幕行情與交易終端。',
      en: 'Desktop client for macOS, Windows and Linux, built for multi-screen market data and trading.',
    },
    sources: [
      {
        // 官网仓库里手写维护的更新日志，三语齐全且已是对外口径
        provider: 'repo-docs',
        repo: 'longbridge/longbridge-desktop-website',
        ref: 'main',
        paths: {
          en: 'docs/release-notes',
          'zh-CN': 'docs/zh-CN/release-notes',
          'zh-HK': 'docs/zh-HK/release-notes',
        },
        filePattern: '^v(?<version>\\d+\\.\\d+\\.\\d+)\\.md$',
        ignore: ['index.md'],
        preferredSource: 'zh-CN',
        platforms: ['macOS', 'Windows', 'Linux'],
        limit: 100,
      },
      {
        // 同一个仓库的 preview 目录：预览版，正式版发布前先在这里公开。
        // 历史上的预览版已被各自的正式版覆盖，只从 1.0.0 的预览版开始收
        provider: 'repo-docs',
        repo: 'longbridge/longbridge-desktop-website',
        ref: 'main',
        paths: {
          en: 'docs/release-notes/preview',
          'zh-CN': 'docs/zh-CN/release-notes/preview',
          'zh-HK': 'docs/zh-HK/release-notes/preview',
        },
        filePattern: '^v(?<version>\\d+\\.\\d+\\.\\d+-preview\\.\\d+)\\.md$',
        ignore: ['index.md'],
        preferredSource: 'zh-CN',
        prerelease: true,
        since: '2026-09-01',
        platforms: ['macOS', 'Windows', 'Linux'],
        limit: 100,
      },
    ],
  },
  {
    id: 'longbridge-web',
    order: 30,
    // 暂不对外：站点上不展示，带草稿的构建里照常出现
    hidden: true,
    accent: '#00b8b8',
    // 网页版就是 longbridge.com 本身，用标准品牌标记
    logo: 'https://pub.lbkrs.com/files/202107/35tULHe3n4Pp4EtA/logo.png',
    homepage: 'https://longbridge.com',
    homepageAction: 'visit',
    name: {
      'zh-CN': 'Longbridge Web',
      'zh-HK': 'Longbridge Web',
      en: 'Longbridge Web',
    },
    summary: {
      'zh-CN': '无需安装，浏览器内完成行情查看、下单与资产管理。',
      'zh-HK': '無需安裝，瀏覽器內完成行情查看、落單與資產管理。',
      en: 'Quotes, orders and portfolio management right in the browser.',
    },
    // 没有公开的上游来源：产品把更新说明以 PR 提交到 releases/longbridge-web/
    sources: [],
  },
  {
    id: 'longbridge-ai',
    order: 40,
    accent: '#00b8b8',
    logo: 'https://assets.lbkrs.com/uploads/2e476c46-8bb9-4689-a800-54877351520e/app-icon.svg',
    homepage: 'https://longbridge.com/{locale}/ai',
    homepageAction: 'visit',
    name: {
      'zh-CN': 'LongbridgeAI',
      'zh-HK': 'LongbridgeAI',
      en: 'LongbridgeAI',
    },
    summary: {
      'zh-CN': 'AI 投研助手，用对话完成研究、分析与成果整理。',
      'zh-HK': 'AI 投研助手，用對話完成研究、分析與成果整理。',
      en: 'An AI research assistant for investing: research, analyze and organize your work through conversation.',
    },
    sources: [
      {
        // LongbridgeAI 自己维护的对外版本说明，三语齐全，公开接口不需要凭证
        provider: 'release-api',
        url: 'https://m.lbkrs.com/api/forward/v1/babbage/public/release-notes',
        acceptLanguage: {
          'zh-CN': 'zh-CN',
          'zh-HK': 'zh-HK',
          en: 'en',
        },
        tagPattern: '^v(?<version>\\d+\\.\\d+\\.\\d+)$',
        platforms: ['Web'],
      },
    ],
  },
]

/**
 * 版本号的前两段就是大版本：0.20.1 → 0.20，日期版本 2026.09.11 → 2026.09。
 * 站点按大版本组织列表，小版本收在大版本页里。
 */
export const majorOf = (version: string): string => version.split('.').slice(0, 2).join('.')

/** 产品页按钮的地址：把 homepage 里的 `{locale}` 换成当前语言 */
export const homepageUrl = (product: ProductConfig, locale: Locale): string | undefined =>
  product.homepage?.replace('{locale}', locale)

export function getProduct(id: string): ProductConfig | undefined {
  return products.find((p) => p.id === id)
}

/**
 * 站点上露出的产品。includeHidden 给显示草稿的构建用（本地 dev、MR 预览），
 * 让还没对外的产品也能在预览里验收；生产构建不传，hidden 的产品照旧不出现。
 */
export const visibleProducts = (includeHidden = false): ProductConfig[] =>
  products.filter((p) => includeHidden || !p.hidden).sort((a, b) => a.order - b.order)

/**
 * 对外可见的产品不止一个时，站点才露出「按产品区分」的元素：列表页的产品切换条、卡片上的产品名。
 * 只剩一个产品时这些都是噪音；隐藏的产品放出来后会自动恢复。
 */
export const isMultiProduct = (includeHidden = false): boolean =>
  visibleProducts(includeHidden).length > 1
