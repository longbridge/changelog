/**
 * 把 releases/ 里的抓取结果转成 src/content/releases 下的 MDX。
 *
 *   bun run transform                        # 生成缺失的 MDX
 *   bun run transform --product longbridge-pro --force
 *
 * 两种原文走不同路径：
 *   curated（仓库文档、App Store 文案、产品的版本说明接口）——已是对外口径，只做格式适配
 *   非 curated（仓库 Release）——内部口径，清洗后按新增/优化/修复分组，等人改写
 *
 * 某个语言没有原文时，用最接近的语言生成一份并标记 translation.status = pending，
 * 页面不会因此空着，翻译由 release-notes-mdx skill 补完。
 *
 * 已存在的 MDX 默认不覆盖：那是人工 / skill 编辑过的对外稿。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { getProduct, majorOf } from '../config/products.config'
import { LOCALES, type Locale } from '../config/site.config'
import { readRaw, stringifyFrontmatter } from './lib/store'
import { slugifyTag, type NormalizedRelease } from './lib/release'
import { groupChanges, KIND_HEADING } from './lib/markdown'
import { adaptCurated } from './lib/curated'
import { contentFile, majorFile } from './lib/paths'
import { parseArgs, c } from './lib/cli'

const { flags } = parseArgs()
const productFilter = typeof flags.product === 'string' ? flags.product : undefined
const force = Boolean(flags.force)

const releases = await readRaw(productFilter)
if (releases.length === 0) {
  console.error(c.yellow('releases/ 下没有抓取内容，先执行 bun run fetch'))
  process.exit(1)
}

/** 同一个版本的多语言原文归成一组 */
const groups = new Map<string, Map<Locale, NormalizedRelease>>()
for (const release of releases) {
  const key = `${release.productId} ${release.tag}`
  const group = groups.get(key) ?? new Map<Locale, NormalizedRelease>()
  // 抓取产物都带 locale，这里只是兜底；用原文语言而不是站点默认语言
  group.set(release.locale ?? 'zh-CN', release)
  groups.set(key, group)
}

/** 缺某个语言时从哪份原文翻译：同语系优先，其次默认语言 */
const FALLBACK: Record<Locale, Locale[]> = {
  'zh-CN': ['zh-HK', 'en'],
  'zh-HK': ['zh-CN', 'en'],
  en: ['zh-CN', 'zh-HK'],
}

function pickSource(
  group: Map<Locale, NormalizedRelease>,
  locale: Locale,
): { release: NormalizedRelease; from: Locale } | null {
  const own = group.get(locale)
  if (own) return { release: own, from: locale }
  for (const candidate of FALLBACK[locale]) {
    const release = group.get(candidate)
    if (release) return { release, from: candidate }
  }
  const first = [...group.entries()][0]
  return first ? { release: first[1], from: first[0] } : null
}

let created = 0
let skipped = 0
let pending = 0

for (const group of groups.values()) {
  for (const locale of LOCALES) {
    const picked = pickSource(group, locale)
    if (!picked) continue

    const { release, from } = picked
    const product = getProduct(release.productId)
    if (!product) continue

    // 只有已经是对外口径的原文才值得跨语言占位等翻译。
    // 内部口径的 Release 连原文都还没改写，翻译无从谈起——先只落源语言那一份。
    if (from !== locale && !release.curated) continue

    const file = contentFile(locale, release.productId, slugifyTag(release.tag))
    if (!force && (await exists(file))) {
      skipped++
      continue
    }

    const needsTranslation = from !== locale
    if (needsTranslation) pending++

    const curated = release.curated
      ? adaptCurated(release.body, { labelGroups: release.provider === 'release-api' })
      : null
    const changeGroups = curated ? [] : groupChanges(release.body)

    const emptyNotice = '{/* 原始 Release 说明为空，需要人工补充对外文案 */}'
    const fallbackBody = `${emptyNotice}\n\n## ${KIND_HEADING.other[locale]}\n\n- `

    const body = curated
      ? curated.body
      : changeGroups.length
        ? changeGroups
            .map(
              (item) =>
                `## ${KIND_HEADING[item.kind][locale]}\n\n` +
                item.items.map((text) => `- ${text}`).join('\n'),
            )
            .join('\n\n')
        : fallbackBody

    const frontmatter: Record<string, unknown> = {
      product: release.productId,
      version: release.version,
      tag: release.tag,
      locale,
      // 只放一个能认出是哪一版的占位；对外标题要写「这版给用户带来什么」，
      // 机械拼模块名拼不出那种话，交给 release-notes-mdx skill
      title: `${product.name[locale]} ${release.version}`,
      summary: curated?.summary ?? '',
      // 亮点留给人写，机械提取的模块标签放 topics
      highlights: [],
      topics: curated?.topics ?? [],
      releasedAt: release.publishedAt,
      platforms: release.platforms,
      // curated 的原文已经是对外口径，直接可发布；抓取的内部口径要人改写后才发
      status: release.curated && !needsTranslation ? 'published' : 'draft',
      source: {
        provider: release.provider,
        repo: release.repo,
        url: release.url,
      },
    }

    if (needsTranslation) {
      frontmatter.translation = { from, status: 'pending' }
    }

    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, stringifyFrontmatter(frontmatter, body), 'utf8')
    created++
  }
}

// 列表页展示的是大版本，所以每个大版本都要有一份总结。内容得有人写，
// 这里只把空壳补齐，免得新版本进来后列表里悄悄少一条。
let majorsCreated = 0
for (const group of groups.values()) {
  for (const release of group.values()) {
    const product = getProduct(release.productId)
    if (!product) continue
    const major = majorOf(release.version)
    for (const locale of LOCALES) {
      const file = majorFile(locale, release.productId, major)
      if (await exists(file)) continue
      const frontmatter = {
        product: release.productId,
        major,
        locale,
        title: `${product.name[locale]} ${major}`,
        summary: '',
        highlights: [],
        status: 'draft',
      }
      const body = `{/* 大版本总结：这一版整体带来了什么，小版本的细节不要复制过来 */}`
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, stringifyFrontmatter(frontmatter, body), 'utf8')
      majorsCreated++
    }
  }
}

console.log(
  `${c.bold('转换完成')} ${c.dim('→ src/content/releases')}  ` +
    `${c.green(`生成 ${created}`)} · ${c.dim(`跳过已有 ${skipped}`)}` +
    (pending ? ` · ${c.yellow(`待翻译 ${pending}`)}` : '') +
    (majorsCreated ? ` · ${c.yellow(`新建大版本空壳 ${majorsCreated}`)}` : ''),
)
if (pending > 0) {
  console.log(c.dim('待翻译的条目已用最接近的语言占位，执行 release-notes-mdx skill 补完翻译'))
}

async function exists(file: string) {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false)
}
