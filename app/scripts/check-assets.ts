/**
 * 校验 MDX 的素材引用、富媒体写法与三语对齐。
 *
 *   bun run check:assets
 *
 * 查的是：素材文件在不在、图片视频有没有可访问的描述、有没有引用不可靠的外链图床、
 * published 的条目三语齐不齐、标题是不是还停在脚本占位，
 * 以及每个发出去的小版本有没有对应的大版本总结——列表页只展示大版本，缺了就整条不见。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { LOCALES, SITE_SEGMENT, type Locale } from '../config/site.config'
import { getProduct, majorOf } from '../config/products.config'
import { CONTENT_DIR, MAJORS_DIR, ROOT } from './lib/paths'
import { c } from './lib/cli'

// 素材写成站点根路径 /release-assets/...，文件在 public/changelog/ 下，见 src/lib/assets.ts
const PUBLIC_DIR = path.join(ROOT, 'public', SITE_SEGMENT)

/** 自家 CDN，更新日志里的图片视频本来就放在这 */
const TRUSTED_HOSTS = ['assets.lbkrs.com', 'assets.lbctrl.com', 'pub.lbkrs.com']

interface Issue {
  file: string
  message: string
}

const issues: Issue[] = []
const warnings: Issue[] = []

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.name.endsWith('.mdx')) files.push(full)
  }
  return files
}

const files = [...(await walk(CONTENT_DIR)), ...(await walk(MAJORS_DIR))]
if (files.length === 0) {
  console.log(c.yellow('src/content 下没有 MDX，先执行 bun run transform'))
  process.exit(0)
}

/** `<kind>:<product>/<name>` → 已经 published 的语言 */
const published = new Map<string, Set<string>>()
/** `<locale>/<product>/<major>` → 该大版本的总结已经 published */
const publishedMajors = new Set<string>()
/** 已经 published 的小版本，用来核对大版本总结在不在 */
const publishedReleases: { file: string; locale: string; product: string; major: string }[] = []

for (const file of files) {
  const relative = path.relative(ROOT, file)
  const source = await fs.readFile(file, 'utf8')
  const [, kind, locale, product, name] =
    /content\/(releases|majors)\/([^/]+)\/([^/]+)\/(.+)\.mdx$/.exec(relative) ?? []

  if (kind && /^status:\s*published\s*$/m.test(source)) {
    published.set(
      `${kind}:${product}/${name}`,
      (published.get(`${kind}:${product}/${name}`) ?? new Set()).add(locale),
    )

    // transform 填的是「产品名 + 版本号」这个占位，对外标题得有人写成一句话。
    // 文档来源的版本转换完直接就是 published，不拦一下就这么发出去了。
    const title = /^title:\s*(.+?)\s*$/m.exec(source)?.[1] ?? ''
    const version = /^(?:version|major):\s*(.+?)\s*$/m.exec(source)?.[1] ?? ''
    const productName = getProduct(product)?.name[locale as Locale]
    if (productName && title === `${productName} ${version}`) {
      issues.push({ file: relative, message: '标题还是脚本占位，需要写成对外标题' })
    }

    if (kind === 'majors') publishedMajors.add(`${locale}/${product}/${name}`)
    else publishedReleases.push({ file: relative, locale, product, major: majorOf(version) })
  }

  // 站内素材引用：src="/release-assets/..." 之类
  for (const match of source.matchAll(/\b(?:src|poster|before|after)=["'](\/[^"']+)["']/g)) {
    const asset = match[1]
    const exists = await fs
      .access(path.join(PUBLIC_DIR, asset))
      .then(() => true)
      .catch(() => false)
    if (!exists) issues.push({ file: relative, message: `素材不存在：${asset}` })
  }

  // 外链素材：官方 CDN 是自持的，其余第三方图床不可靠
  for (const match of source.matchAll(/\b(?:src|poster|before|after)=["'](https?:\/\/[^"']+)["']/g)) {
    if (TRUSTED_HOSTS.some((host) => match[1].startsWith(`https://${host}/`))) continue
    warnings.push({ file: relative, message: `引用了外链素材：${match[1]}` })
  }

  // 大版本的封面走 frontmatter，不是组件属性，上面那几条正则扫不到
  const cover = /^cover:\s*(\S+)\s*$/m.exec(source)?.[1]
  if (cover) {
    if (!TRUSTED_HOSTS.some((host) => cover.startsWith(`https://${host}/`))) {
      warnings.push({ file: relative, message: `cover 引用了外链素材：${cover}` })
    }
    if (!/^coverAlt:\s*\S/m.test(source)) {
      issues.push({ file: relative, message: 'cover 缺少 coverAlt' })
    }
  }

  // 无障碍：图片必须有 alt，视频必须有 label
  for (const match of source.matchAll(/<(Figure|Compare)\b([^>]*)>/g)) {
    if (!/\balt=/.test(match[2])) issues.push({ file: relative, message: `<${match[1]}> 缺少 alt` })
  }
  for (const match of source.matchAll(/<Video\b([^>]*)>/g)) {
    if (!/\blabel=/.test(match[1])) issues.push({ file: relative, message: '<Video> 缺少 label' })
  }
}

// 三语必须一起发：缺哪个语言，站点的语言切换就会静默回落到产品页。
// 非 curated 来源不会自动生成占位，漏建除了这里没有别的地方会提醒。
for (const [key, locales] of published) {
  const missing = LOCALES.filter((locale) => !locales.has(locale))
  if (missing.length > 0) {
    issues.push({ file: key, message: `已 published 但缺少语言：${missing.join('、')}` })
  }
}

// 列表页展示的是大版本，小版本发了而大版本总结还没写，这条更新在站点上就是不存在
for (const release of publishedReleases) {
  if (!publishedMajors.has(`${release.locale}/${release.product}/${release.major}`)) {
    issues.push({
      file: release.file,
      message: `大版本 ${release.major} 的总结还没 published，这条更新不会出现在列表里`,
    })
  }
}

for (const issue of issues) console.log(`${c.red('✗')} ${issue.file} ${c.dim('·')} ${issue.message}`)
for (const warning of warnings)
  console.log(`${c.yellow('!')} ${warning.file} ${c.dim('·')} ${warning.message}`)

if (issues.length === 0 && warnings.length === 0) {
  console.log(`${c.green('✓')} ${files.length} 篇 MDX 的素材、描述、标题与三语对齐都没问题`)
}
if (issues.length > 0) process.exit(1)
