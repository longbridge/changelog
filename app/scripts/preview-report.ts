/**
 * 生成一份「这次改了哪些版本、长什么样」的预览索引，给产品/需求方验收用。
 *
 *   bun run preview:report                 # 与 main 比较
 *   bun run preview:report --base develop
 *   bun run preview:report --all           # 不比较，列出所有非 published 的内容
 *
 * 产出：
 *   dist/preview/index.html   本地预览的入口页，逐条链到对应版本页
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { getProduct, majorOf, products } from '../config/products.config'
import { DEFAULT_LOCALE, LOCALES, SITE_SEGMENT, type Locale } from '../config/site.config'
import { CONTENT_DIR, MAJORS_DIR, REPO_ROOT, ROOT, localAssetFile } from './lib/paths'
import { parseFrontmatter } from './lib/store'
import { parseArgs, c } from './lib/cli'

const run = promisify(execFile)
const { flags } = parseArgs()
const base = typeof flags.base === 'string' ? flags.base : 'main'
const listAll = Boolean(flags.all)
const outDir = path.join(ROOT, 'dist', 'preview')

interface Meta {
  product: string
  version: string
  tag: string
  locale: Locale
  title: string
  summary?: string
  highlights?: string[]
  status: 'draft' | 'published' | 'skipped'
  releasedAt: string
}

interface Entry {
  meta: Meta
  slug: string
  /** 正文里用到的富媒体组件 */
  media: string[]
  /** 引用了但 public 下不存在的素材 */
  missingAssets: string[]
}

/** git 与 MR diffs 给的路径都相对仓库根，小版本 MDX 在 app/ 下 */
const RELEASES_PATHSPEC = path.relative(REPO_ROOT, CONTENT_DIR)

/** 本次改动涉及的 MDX；拿不到 git 差异就退回全量 */
/** null = 没法比较（区别于空数组：比较成功且确实没改动） */
async function gitChanged(): Promise<string[] | null> {
  const lines = async (args: string[]) => {
    const { stdout } = await run('git', args, { cwd: REPO_ROOT })
    return stdout.split('\n').filter(Boolean)
  }

  try {
    const committed = await lines(['diff', '--name-only', `${base}...HEAD`, '--', RELEASES_PATHSPEC])
    // 工作区里还没提交的、以及完全没跟踪过的也算：跑预览最常见的时机就是
    // 刚写完还没 commit，只看 base...HEAD 的话这些新页面一个都进不来。
    // -uall：新建的整个目录默认只报目录名，逐个文件列出来才拿得到 .mdx 路径
    const working = (await lines(['status', '--porcelain', '-uall', '--', RELEASES_PATHSPEC])).map((line) => {
      const file = line.slice(3).trim()
      // 重命名是 `R  old -> new`，取新路径；含特殊字符时 git 会给路径加引号
      const renamed = file.split(' -> ').pop() ?? file
      return renamed.replace(/^"|"$/g, '')
    })
    return [...new Set([...committed, ...working])].filter((file) => file.endsWith('.mdx'))
  } catch {
    return null
  }
}

async function changedFiles(): Promise<string[] | null> {
  if (listAll) return null

  const changed = await gitChanged()
  if (changed && changed.length > 0) return changed.map((file) => path.join(REPO_ROOT, file))

  // null = 比较不出来，空数组 = 比较成功但这次没动内容。两种都退回全量未发布，
  // 区别只在提示语——以前空数组会一路带到底，报告直接空白。
  console.warn(
    changed
      ? c.yellow('! 这次没有改动任何版本内容，下面列的是全部未发布内容')
      : c.yellow('! 没法确定本次改动范围（git 不可用），下面列的是全部未发布内容'),
  )
  return null
}

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

const MEDIA_TAGS = ['Figure', 'Compare', 'Video', 'Steps', 'Demo', 'Callout', 'Kbd', 'LinkPreview']

async function readEntry(file: string): Promise<Entry | null> {
  const source = await fs.readFile(file, 'utf8').catch(() => null)
  if (source === null) return null
  const { data, body } = parseFrontmatter<Meta>(source)
  if (!data?.product) return null

  const media = MEDIA_TAGS.filter((tag) => new RegExp(`<${tag}\\b`).test(body))

  const missingAssets: string[] = []
  for (const match of body.matchAll(/\b(?:src|poster|before|after)=["'](\/[^"']+)["']/g)) {
    const exists = await fs
      .access(localAssetFile(match[1]))
      .then(() => true)
      .catch(() => false)
    if (!exists) missingAssets.push(match[1])
  }

  return { meta: data, slug: path.basename(file, '.mdx'), media, missingAssets }
}

/**
 * `<locale>/<product>/<major>` → 大版本总结的 status。
 * 站点按大版本组织，小版本是挂在大版本页下的一节：没有总结文件，
 * 这一版在预览站点里整条都不会渲染出来——这是「预览里找不到刚写的版本」的头号原因。
 */
async function readMajorStatuses(): Promise<Map<string, string>> {
  const statuses = new Map<string, string>()
  for (const file of await walk(MAJORS_DIR)) {
    const [locale, product, name] = path.relative(MAJORS_DIR, file).split(path.sep)
    if (!locale || !product || !name) continue
    const { data } = parseFrontmatter<{ status?: string }>(await fs.readFile(file, 'utf8'))
    statuses.set(`${locale}/${product}/${name.replace(/\.mdx$/, '')}`, data?.status ?? 'draft')
  }
  return statuses
}

const changed = await changedFiles()
const files = changed ?? (await walk(CONTENT_DIR))
const all = (await Promise.all(files.map(readEntry))).filter((entry): entry is Entry => entry !== null)
const majorStatuses = await readMajorStatuses()

// 没有变更集（比较不出来或这次没动内容）时退回展示所有未发布内容，预览页不会是一片空白
const entries = changed ? all : all.filter((entry) => entry.meta.status !== 'published')

/** 同一个 tag 的三语版本归成一组，缺哪个语言一眼看得见 */
interface Group {
  product: string
  tag: string
  version: string
  releasedAt: string
  byLocale: Partial<Record<Locale, Entry>>
}

const groups = new Map<string, Group>()
for (const entry of entries) {
  const key = `${entry.meta.product}@${entry.meta.tag}`
  const group = groups.get(key) ?? {
    product: entry.meta.product,
    tag: entry.meta.tag,
    version: entry.meta.version,
    releasedAt: entry.meta.releasedAt,
    byLocale: {},
  }
  group.byLocale[entry.meta.locale] = entry
  groups.set(key, group)
}

const ordered = [...groups.values()].sort(
  (a, b) =>
    (products.findIndex((p) => p.id === a.product) - products.findIndex((p) => p.id === b.product)) ||
    b.releasedAt.localeCompare(a.releasedAt),
)

interface Problem {
  level: 'error' | 'warn'
  text: string
}

function inspect(group: Group): Problem[] {
  const problems: Problem[] = []
  const missingLocales = LOCALES.filter((locale) => !group.byLocale[locale])
  if (missingLocales.length > 0) {
    problems.push({ level: 'warn', text: `缺少语言：${missingLocales.join('、')}` })
  }
  const major = majorOf(group.version)
  for (const entry of Object.values(group.byLocale)) {
    if (entry.meta.status === 'draft') {
      problems.push({ level: 'warn', text: `${entry.meta.locale} 仍是草稿，不会对外发布` })
    }
    if (!entry.meta.summary) {
      problems.push({ level: 'warn', text: `${entry.meta.locale} 没有写 summary` })
    }
    for (const asset of entry.missingAssets) {
      problems.push({ level: 'error', text: `${entry.meta.locale} 引用的素材不存在：${asset}` })
    }

    // 小版本挂在大版本页下，总结缺失或被 skip 的话这一版在站点上根本渲染不出来
    const majorStatus = majorStatuses.get(`${entry.meta.locale}/${group.product}/${major}`)
    if (majorStatus === undefined) {
      problems.push({
        level: 'error',
        text: `${entry.meta.locale} 缺大版本总结 src/content/majors/${entry.meta.locale}/${group.product}/${major}.mdx，预览里这一版整条不会出现`,
      })
    } else if (majorStatus === 'skipped') {
      problems.push({
        level: 'error',
        text: `${entry.meta.locale} 的大版本总结 ${major} 是 skipped，这一版不会出现`,
      })
    } else if (majorStatus === 'draft' && entry.meta.status === 'published') {
      problems.push({
        level: 'warn',
        text: `${entry.meta.locale} 的大版本总结 ${major} 还是草稿，正式构建里这一版不会出现`,
      })
    }
  }
  return problems
}

const report = ordered.map((group) => ({ group, problems: inspect(group) }))
const errorCount = report.reduce((n, item) => n + item.problems.filter((p) => p.level === 'error').length, 0)
const warnCount = report.reduce((n, item) => n + item.problems.filter((p) => p.level === 'warn').length, 0)

// ---------- 预览入口页 ----------

const escape = (value: string) =>
  value.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)

const rows = report
  .map(({ group, problems }) => {
    const product = getProduct(group.product)
    // 小版本没有独立页面，链到大版本页里对应的锚点（锚点 id 就是 MDX 文件名）。
    // 路径写到 index.html 而不是目录：本地 open dist/preview/index.html 走的是
    // file://，目录形式不会自动补 index.html。
    const major = majorOf(group.version)
    const links = LOCALES.map((locale) => {
      const entry = group.byLocale[locale]
      if (!entry) return `<span class="lang lang--missing">${locale}</span>`
      return `<a class="lang" href="../${locale}/${SITE_SEGMENT}/${group.product}/v${major}/index.html#${entry.slug}">${locale}</a>`
    }).join('')

    const primary = group.byLocale[DEFAULT_LOCALE] ?? Object.values(group.byLocale)[0]
    const media = primary?.media.length
      ? `<span class="chip">${primary.media.join(' · ')}</span>`
      : '<span class="chip chip--plain">纯文字</span>'

    const issues = problems
      .map((problem) => `<li class="${problem.level}">${escape(problem.text)}</li>`)
      .join('')

    return `<article class="row">
      <div class="row__head">
        <h3>${escape(product?.name[DEFAULT_LOCALE] ?? group.product)} <b>${escape(group.version)}</b></h3>
        <div class="row__meta">${links}${media}</div>
      </div>
      <p class="row__summary">${escape(primary?.meta.summary || '（还没有写 summary）')}</p>
      ${issues ? `<ul class="issues">${issues}</ul>` : ''}
    </article>`
  })
  .join('\n')

const html = `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Release Notes 预览</title>
<style>
  :root { color-scheme: light dark; --bg:#fbfaf8; --card:#fff; --ink:#1b1a18; --soft:#57544e; --faint:#8a857d; --rule:#e6e2da; --accent:#2f7d6b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#121211; --card:#1b1a19; --ink:#edeae4; --soft:#a8a39a; --faint:#78736b; --rule:#2c2a27; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:2.5rem 1.25rem 4rem; background:var(--bg); color:var(--ink);
         font:15px/1.6 ui-sans-serif,system-ui,-apple-system,"PingFang SC",sans-serif; }
  .wrap { max-width: 46rem; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin: 0 0 .5rem; letter-spacing: -0.01em; }
  .lede { color: var(--soft); margin: 0 0 1.5rem; }
  .summary { display:flex; gap:.5rem; flex-wrap:wrap; margin-bottom:2rem; }
  .pill { border:1px solid var(--rule); border-radius:999px; padding:.2rem .7rem; font-size:.8125rem; color:var(--soft); }
  .pill--error { border-color:#d4563f; color:#d4563f; }
  .pill--warn { border-color:#c08a2e; color:#c08a2e; }
  .pill--ok { border-color:var(--accent); color:var(--accent); }
  .row { background:var(--card); border:1px solid var(--rule); border-radius:14px; padding:1rem 1.1rem; margin-bottom:.75rem; }
  .row__head { display:flex; flex-wrap:wrap; gap:.5rem; align-items:baseline; justify-content:space-between; }
  .row h3 { font-size:1rem; margin:0; font-weight:600; }
  .row h3 b { font-variant-numeric: tabular-nums; color:var(--accent); }
  .row__meta { display:flex; gap:.375rem; align-items:center; flex-wrap:wrap; }
  .lang { font-size:.75rem; padding:.1rem .45rem; border-radius:6px; border:1px solid var(--rule); color:var(--soft); text-decoration:none; }
  .lang:hover { color:var(--ink); border-color:var(--faint); }
  .lang--missing { opacity:.4; text-decoration:line-through; }
  .chip { font-size:.6875rem; color:var(--faint); }
  .row__summary { margin:.5rem 0 0; color:var(--soft); font-size:.9375rem; }
  .issues { margin:.625rem 0 0; padding-left:1.1rem; font-size:.8125rem; }
  .issues .error { color:#d4563f; }
  .issues .warn { color:#c08a2e; }
  .empty { color:var(--faint); border:1px dashed var(--rule); border-radius:14px; padding:2rem; text-align:center; }
  footer { margin-top:2rem; color:var(--faint); font-size:.8125rem; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Release Notes 预览</h1>
  <p class="lede">${changed && changed.length > 0 ? `本次改动涉及 ${report.length} 个版本。` : '当前所有未发布的版本。'}点语言标签打开对应页面。</p>
  <div class="summary">
    <span class="pill ${errorCount ? 'pill--error' : 'pill--ok'}">阻断问题 ${errorCount}</span>
    <span class="pill ${warnCount ? 'pill--warn' : 'pill--ok'}">待办提醒 ${warnCount}</span>
    <span class="pill">版本 ${report.length}</span>
  </div>
  ${rows || '<p class="empty">这次没有改动任何版本内容。</p>'}
  <footer>草稿（status: draft）只在预览里可见，正式构建不会输出。</footer>
</div>
</body>
</html>
`

await fs.mkdir(outDir, { recursive: true })
await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8')

// ---------- 控制台 ----------

console.log(`\n${c.bold('Release Notes 预览报告')} ${c.dim(`(对比 ${changed ? base : '全量'})`)}`)
for (const { group, problems } of report) {
  const product = getProduct(group.product)?.name[DEFAULT_LOCALE] ?? group.product
  const langs = LOCALES.map((locale) => (group.byLocale[locale] ? c.green(locale) : c.dim(locale))).join(' ')
  console.log(`\n  ${c.bold(`${product} ${group.version}`)}  ${langs}`)
  for (const problem of problems) {
    const mark = problem.level === 'error' ? c.red('✗') : c.yellow('!')
    console.log(`    ${mark} ${problem.text}`)
  }
}
console.log(
  `\n${report.length} 个版本 · ${errorCount ? c.red(`阻断 ${errorCount}`) : c.green('阻断 0')} · ${
    warnCount ? c.yellow(`提醒 ${warnCount}`) : '提醒 0'
  }`,
)
console.log(c.dim(`预览入口：${pathToFileURL(path.join(outDir, 'index.html')).href}`))

// 入口页链的是构建产物。单跑 preview:report 时 dist 里可能只有这份索引，
// 点进去全是 404，先把这句说在前面。
const built = await fs
  // 页面是语言在前的 /<locale>/changelog/…，产物落在 dist/<locale>/changelog/index.html
  .access(path.join(ROOT, 'dist', DEFAULT_LOCALE, SITE_SEGMENT, 'index.html'))
  .then(() => true)
  .catch(() => false)
if (!built) {
  console.log(c.yellow('! dist 里还没有站点产物，入口页上的链接会 404——先跑 bun run preview:build'))
}

if (errorCount > 0) process.exit(1)
