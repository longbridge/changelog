/**
 * 校验 MDX 的素材引用、富媒体写法与三语对齐。
 *
 *   bun run check:assets
 *
 * 查的是：素材文件在不在、图片视频有没有可访问的描述、有没有引用不可靠的外链图床、
 * published 的条目三语齐不齐、标题是不是还停在脚本占位，
 * 以及每个发出去的小版本有没有对应的大版本总结——列表页只展示大版本，缺了就整条不见。
 * 仓库根 assets/ 里的素材另外查文件名、体积，以及有没有替换已经上线的文件。
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { LOCALES, type Locale } from '../config/site.config'
import { getProduct, majorOf } from '../config/products.config'
import { ASSETS_DIR, CONTENT_DIR, MAJORS_DIR, REPO_ROOT, ROOT, localAssetFile } from './lib/paths'
import { c } from './lib/cli'

const run = promisify(execFile)

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

/** 英文正文里在句中以大写出现过的词：产品名、功能名、模型名等专有名词，标题大小写检查时不计 */
const properNouns = new Set<string>()
for (const file of files) {
  if (!file.includes('/en/')) continue
  const prose = (await fs.readFile(file, 'utf8'))
    .replace(/^---[\s\S]*?\n---/, '')
    .split('\n')
    .filter((line) => !/^#{1,6}\s/.test(line))
    .join('\n')
  for (const match of prose.matchAll(/[a-z,]\s+([A-Z][\w-]*)/g)) properNouns.add(match[1])
}

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
      .access(localAssetFile(asset))
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

  // 英文标题用句首大写（sentence case），不是每个词首字母大写。专有名词无法穷举，
  // 用上面收集的 properNouns 排除；只提醒不拦
  if (locale === 'en') {
    const frontmatter = /^---[\s\S]*?\n---/.exec(source)?.[0] ?? ''
    const body = source.slice(frontmatter.length)
    const candidates = [
      ...frontmatter.matchAll(/^(?:title|summary):\s*["']?(.+?)["']?\s*$/gm),
      ...frontmatter.matchAll(/^\s+-\s+["']?(.+?)["']?\s*$/gm),
      ...body.matchAll(/^#{2,4}\s+(.+?)\s*$/gm),
    ].map((match) => match[1])
    for (const text of new Set(candidates)) {
      const words = text
        .split(/[\s,]+/)
        .slice(1)
        .filter((word) => /^[A-Za-z][a-z]{3,}/.test(word) && !properNouns.has(word))
      if (words.length >= 2 && words.every((word) => /^[A-Z]/.test(word))) {
        warnings.push({ file: relative, message: `英文标题像是每词大写，应改成句首大写：${text}` })
      }
    }
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

// 仓库里的素材：文件名会出现在公开 URL 里，体积决定页面加载；
// Cloudflare Pages 单文件上限 25 MiB，超了预览直接部署失败
const MB = 1024 * 1024
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)$/i
const VIDEO = /\.(mp4|webm|mov)$/i

async function walkAll(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walkAll(full)))
    else if (entry.name !== '.gitkeep') out.push(full)
  }
  return out
}

// 已经在 main 上的素材改不了（见下面的替换检查），超过建议体积只能提醒；
// 这次新加的还来得及压缩，直接拦下。拿不到 main 时一律按已上线处理
const onMain = await run('git', ['ls-tree', '-r', '--name-only', 'origin/main', '--', path.relative(REPO_ROOT, ASSETS_DIR)], {
  cwd: REPO_ROOT,
  maxBuffer: 16 * 1024 * 1024,
})
  .then(({ stdout }) => new Set(stdout.split('\n').filter(Boolean)))
  .catch(() => null)

for (const file of await walkAll(ASSETS_DIR)) {
  const relative = path.relative(REPO_ROOT, file)
  const name = path.basename(file)
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) {
    issues.push({ file: relative, message: '文件名只能用小写英文、数字、- _ .，它会出现在公开 URL 里' })
  }
  if (!IMAGE.test(name) && !VIDEO.test(name)) {
    warnings.push({ file: relative, message: '不是常见的图片或视频格式' })
  }
  const { size } = await fs.stat(file)
  const sizeText = `${(size / MB).toFixed(1)} MB`
  const isNew = onMain !== null && !onMain.has(relative)
  const oversize = (message: string) =>
    (isNew ? issues : warnings).push({
      file: relative,
      message: isNew ? `${message}，提交前先压缩（命令见 release-notes-media skill）` : message,
    })
  if (size > 20 * MB) issues.push({ file: relative, message: `${sizeText}，超过 20 MB 上限，先压缩` })
  else if (IMAGE.test(name) && size > 0.5 * MB) oversize(`图片 ${sizeText}，超过 500 KB`)
  else if (VIDEO.test(name) && size > 4 * MB) oversize(`视频 ${sizeText}，超过 4 MB`)
}

// 素材不带内容哈希，线上按一年缓存：已经在 main 上的文件改了内容，用户看到的还是旧的。
// 要换图就换个文件名。拿不到 main（浅克隆、离线）就跳过这项。
try {
  const { stdout } = await run(
    'git',
    ['diff', '--name-only', '--diff-filter=M', 'origin/main...HEAD', '--', path.relative(REPO_ROOT, ASSETS_DIR)],
    { cwd: REPO_ROOT },
  )
  for (const file of stdout.split('\n').filter(Boolean)) {
    issues.push({ file, message: '替换了已上线的素材，线上有缓存不会生效；请换一个新文件名' })
  }
} catch {}

for (const issue of issues) console.log(`${c.red('✗')} ${issue.file} ${c.dim('·')} ${issue.message}`)
for (const warning of warnings)
  console.log(`${c.yellow('!')} ${warning.file} ${c.dim('·')} ${warning.message}`)

if (issues.length === 0 && warnings.length === 0) {
  console.log(`${c.green('✓')} ${files.length} 篇 MDX 的素材、描述、标题与三语对齐都没问题`)
}
if (issues.length > 0) process.exit(1)
