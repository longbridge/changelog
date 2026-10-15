/**
 * 原始 Release 正文的确定性清洗与分组。
 * 这里只做「无需判断」的处理：删内部痕迹、规整列表、按关键词粗分类。
 * 需要判断的改写（对外口径、提炼亮点、翻译）交给 release-notes-mdx skill。
 */

export type ChangeKind = 'feature' | 'improvement' | 'fix' | 'other'

export interface ChangeGroup {
  kind: ChangeKind
  items: string[]
}

/** 会被整行删除的内部信息 */
const DROP_LINE = [
  /^\s*<\/?(?:details|summary|table|tr|td|th|div|style|script)\b/i,
  /^\s*co-authored-by:/i,
  /^\s*signed-off-by:/i,
  /^\s*\*\*full changelog\*\*/i,
  /^\s*see (the )?(merge request|commit)/i,
  // 指向自建 GitLab 的整行（Release 正文里的「查看 MR」之类）
  /\bgitlab\.[\w-]+\.[\w.-]+/i,
  /^\s*(cherry picked from|revert )/i,
]

/** 会被就地抹掉的内部引用片段 */
const STRIP_INLINE: Array<[RegExp, string]> = [
  // MR / issue / commit 引用：(!123) (#456) (abc1234)
  [/\s*\((?:!|#)\d+\)/g, ''],
  [/\s*(?:^|\s)(?:!|#)\d+(?=\s|$)/g, ''],
  [/\s*\(?\b[0-9a-f]{7,40}\b\)?(?=\s|$)/g, ''],
  // @提及的人名
  [/\s*@[\w.-]+/g, ''],
  // 内部平台链接整体去掉，只留文字
  [/\[([^\]]+)\]\(https?:\/\/(?:gitlab|jira|wiki)\.[\w.-]+[^)]*\)/g, '$1'],
  // 常见 commit 前缀
  [/^(?:feat|fix|chore|refactor|perf|style|docs|test|build|ci)(?:\([^)]*\))?[:：]\s*/i, ''],
  // 原文里的 HTML 片段（details/summary/img 等）对改写没有意义，
  // 留着还会让 MDX 编译失败——MDX 要求标签闭合
  [/<[^>]+>/g, ''],
]

const KIND_RULES: Array<[ChangeKind, RegExp]> = [
  ['fix', /修复|修正|解決|解决|fix(?:ed|es)?\b|bugfix|hotfix|修復/i],
  ['feature', /新增|新功能|上线|上線|支持|支援|新版|add(?:ed|s)?\b|新推出|feature/i],
  ['improvement', /优化|優化|调整|調整|提升|改进|改進|完善|重构|重構|improve|perf|update/i],
]

function stripInline(line: string): string {
  let output = line
  for (const [pattern, replacement] of STRIP_INLINE) output = output.replace(pattern, replacement)
  return output.replace(/\s{2,}/g, ' ').trim()
}

export function classify(text: string): ChangeKind {
  for (const [kind, pattern] of KIND_RULES) if (pattern.test(text)) return kind
  return 'other'
}

/** 把一行原始文本规整成条目文本；返回 null 表示该行应当丢弃 */
function toItem(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  if (DROP_LINE.some((pattern) => pattern.test(trimmed))) return null

  // 去掉列表符号、序号、标题井号
  const unmarked = trimmed
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/^\[[ x]\]\s*/i, '')

  const cleaned = stripInline(unmarked)
  if (!cleaned || cleaned.length < 2) return null
  // 纯分隔线 / 纯标点
  if (/^[-=_*\s.。，,]+$/.test(cleaned)) return null
  return cleaned
}

/** 清洗原始正文并按变更类型分组，保持组内原始顺序 */
export function groupChanges(body: string): ChangeGroup[] {
  const order: ChangeKind[] = ['feature', 'improvement', 'fix', 'other']
  const buckets = new Map<ChangeKind, string[]>(order.map((kind) => [kind, []]))

  // 原文里的小标题（如「新增功能」）会带上下文，这里作为「当前分类」的提示
  let contextKind: ChangeKind | null = null

  for (const line of body.split(/\r?\n/)) {
    const isHeading = /^#{1,6}\s+/.test(line.trim())
    const item = toItem(line)
    if (!item) continue

    if (isHeading) {
      // 标题本身不作为条目，只切换上下文
      contextKind = item.length <= 20 ? classify(item) : null
      if (contextKind === 'other') contextKind = null
      continue
    }

    const kind = classify(item) === 'other' ? (contextKind ?? 'other') : classify(item)
    buckets.get(kind)!.push(item)
  }

  return order
    .map((kind) => ({ kind, items: dedupe(buckets.get(kind)!) }))
    .filter((group) => group.items.length > 0)
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/\s+/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const KIND_HEADING: Record<ChangeKind, Record<'zh-CN' | 'zh-HK' | 'en', string>> = {
  feature: { 'zh-CN': '新增功能', 'zh-HK': '新增功能', en: 'New' },
  improvement: { 'zh-CN': '体验优化', 'zh-HK': '體驗優化', en: 'Improved' },
  fix: { 'zh-CN': '问题修复', 'zh-HK': '問題修復', en: 'Fixed' },
  other: { 'zh-CN': '其他变更', 'zh-HK': '其他變更', en: 'Other' },
}
