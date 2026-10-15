/**
 * 已经是对外口径的更新日志（仓库文档、App Store 文案）只做格式适配：
 * 剥掉原站点的 frontmatter 与标题、把内嵌 video 换成站点组件、抽出 summary 与亮点。
 * 不重写文案——那是人家已经写好的东西。
 */
import { parseFrontmatter } from './store'

export interface CuratedResult {
  body: string
  summary: string
  /** 原文里的模块标签，例如「交易」「期权」。亮点短语要人写，这里不猜 */
  topics: string[]
  /** 原文里的下载链接，页面不展示，但保留下来方便核对 */
  downloads: string[]
}

/** 各语言里"发布日期"那一行的写法不同，统一按日期格式识别 */
const DATE_LINE = /^_.*\d{4}-\d{2}-\d{2}.*_\s*$/

/** 原文的 ## Downloads / ## 下载 段落对我们没用，产品页已有下载入口 */
const DOWNLOAD_HEADING = /^##\s*(downloads?|下载|下載)\s*$/i

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`${name}=["']([^"']*)["']`, 'i').exec(tag)?.[1]

/** 只有纯数字的尺寸才有意义，width="100%" 这种交给样式 */
const numeric = (value?: string): number | undefined => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * 原文是给 vitepress 写的，直接塞进 MDX 会炸：
 * <img> 没自闭合，<style> 里的 CSS 花括号会被当成表达式。
 * 这里把它们换成站点组件，顺便丢掉原站点的排版壳。
 */
function adaptHtml(markdown: string, fallbackAlt: (index: number) => string): string {
  let output = markdown.replace(/<style\b[\s\S]*?<\/style>/gi, '')

  let index = 0
  output = output.replace(/<img\b[^>]*?\/?>/gi, (tag) => {
    const src = attr(tag, 'src')
    if (!src) return ''
    const alt = (attr(tag, 'alt') || fallbackAlt(index++)).replace(/"/g, "'")
    const width = numeric(attr(tag, 'width'))
    const height = numeric(attr(tag, 'height'))
    const size = width && height ? ` width={${width}} height={${height}}` : ''
    return `<Figure src="${src}" alt="${alt}"${size} />`
  })

  // 原站点用 div 做并排布局，站点这边图片本来就是块级，壳去掉即可
  return output.replace(/<\/?div\b[^>]*>/gi, '')
}

/** <video src="..." autoplay muted loop>…</video> → 站点的 Video 组件 */
function replaceVideos(markdown: string, labelOf: (index: number) => string): string {
  let index = 0
  return markdown.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, (tag) => {
    const src = /src=["']([^"']+)["']/.exec(tag)?.[1]
    if (!src) return ''
    const label = labelOf(index++).replace(/"/g, "'")
    return `<Video src="${src}" label="${label}" />`
  })
}

/** 取一条列表项里的模块名或首句，用作视频的可访问描述与亮点短语 */
function itemLabel(line: string): string {
  const bold = /\*\*(.+?)\*\*/.exec(line)?.[1]
  const text = line
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
  if (bold) {
    const rest = text.slice(text.indexOf(bold) + bold.length).replace(/^[：:，,.\s]+/, '')
    return rest ? `${bold}：${rest}`.slice(0, 60) : bold
  }
  return text.slice(0, 60)
}

/** 分组标签的各种写法 → 站点统一的叫法。没列到的原样保留 */
const GROUP_ALIASES: Record<string, string> = {
  新功能: '新增功能',
  New: 'New Features',
  Fixes: 'Bug Fixes',
}

/** 单独成行的加粗标签，例如 `**新增功能：**`、`**Bug Fixes:**` */
const LABEL_LINE = /^\*\*\s*([^*]+?)\s*[：:]?\s*\*\*\s*$/

/**
 * 接口类来源（LongbridgeAI）不用标题分组，而是「加粗标签 + 编号列表」，
 * 有的版本外面还套一层 `## 模块`。换成站点的结构：有模块时标签降为 ###，
 * 没有模块时标签就是 ## 分组；编号列表换成无序列表，与其他产品一致。
 */
function adaptLabelGroups(markdown: string): string {
  const hasModules = /^##\s/m.test(markdown)
  const level = hasModules ? '###' : '##'
  return markdown
    .split('\n')
    .map((line) => {
      const label = LABEL_LINE.exec(line.trim())?.[1]
      if (label) {
        const name = label.replace(/\s+$/, '')
        return `${level} ${GROUP_ALIASES[name] ?? name}`
      }
      if (/^##\s/.test(line)) return line.trimEnd()
      return (
        line
          .replace(/^(\d+)\.\s+/, '- ')
          // `**梦境记忆：**从今天起`：闭合的 ** 前是标点、后紧跟文字，Markdown 不认这个加粗，
          // 星号会原样露出来。把冒号挪到加粗外面
          .replace(/\*\*([^*\n]+?)([：:])\*\*(?=\S)/g, '**$1**$2')
      )
    })
    .join('\n')
    .replace(/^(#{2,3} .+)\n(?!\n)/gm, '$1\n\n')
}

export interface CuratedOptions {
  /** 正文用「加粗标签 + 编号列表」分组（release-api 来源） */
  labelGroups?: boolean
}

export function adaptCurated(source: string, options: CuratedOptions = {}): CuratedResult {
  // 原站点自己的 frontmatter（vitepress 的 title/editLink 等）不要
  const { body } = parseFrontmatter<Record<string, unknown>>(source.trimStart())

  const lines = body.split(/\r?\n/)
  const kept: string[] = []
  const downloads: string[] = []
  /** 每个 video 前最近的一条列表项，用来做 label */
  const videoLabels: string[] = []
  /** 每张图前最近的一条列表项，缺 alt 时兜底 */
  const imageLabels: string[] = []
  let lastItem = ''
  let inDownloads = false

  for (const line of lines) {
    if (/^##\s/.test(line)) inDownloads = DOWNLOAD_HEADING.test(line)
    if (inDownloads) {
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(line)
      if (link) downloads.push(`${link[1]} ${link[2]}`)
      continue
    }

    // 版本号标题与发布日期行由 frontmatter 承担
    if (/^#\s/.test(line)) continue
    if (DATE_LINE.test(line.trim())) continue

    if (/^\s*[-*+]\s+/.test(line) && !/^\s{2,}/.test(line)) lastItem = itemLabel(line)
    if (/<video\b/i.test(line)) videoLabels.push(lastItem || 'Longbridge Pro')
    for (const _ of line.matchAll(/<img\b/gi)) imageLabels.push(lastItem || 'Longbridge Pro')

    kept.push(line)
  }

  let text = kept.join('\n')
  text = replaceVideos(text, (index) => videoLabels[index] ?? 'Longbridge Pro')
  text = adaptHtml(text, (index) => imageLabels[index] ?? 'Longbridge Pro')
  // 原文用 ### 分组，站点的正文样式以 ## 作为分组标题
  text = text.replace(/^###\s+/gm, '## ')
  if (options.labelGroups) text = adaptLabelGroups(text)
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  // 第一个分组（通常是新增功能）下的顶层条目，就是这版最值得说的东西
  const leadItems: string[] = []
  const modules: string[] = []
  let inFirstGroup = false
  for (const line of text.split('\n')) {
    if (/^##\s/.test(line)) {
      if (inFirstGroup) break
      inFirstGroup = true
      continue
    }
    if (!inFirstGroup || !/^[-*+]\s+/.test(line)) continue
    leadItems.push(itemLabel(line))
    const module = /\*\*(.+?)\*\*/.exec(line)?.[1]
    if (module) modules.push(module.slice(0, 20))
  }

  // summary 取第一条的完整表述，topics 取模块名——都是机械提取的默认值，
  // 更好的说法由 release-notes-mdx skill 覆盖
  const summary = (leadItems[0] ?? '').replace(/\s+/g, ' ').slice(0, 70)
  // 分模块的正文（## 模块 / ### 分组）里，模块标题本身就是 topics
  const sections =
    options.labelGroups && /^###\s/m.test(text)
      ? [...text.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
      : []
  const topics = [...new Set(sections.length ? sections : modules)].slice(0, 5)

  return { body: text, summary, topics, downloads }
}
