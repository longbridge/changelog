/**
 * 列出还没翻译的条目，供 release-notes-mdx skill 逐条补完。
 *
 *   bun run i18n:todo
 *   bun run i18n:todo --locale en
 *
 * 抓取与转换阶段不做机器翻译：缺某个语言时只用最接近的语言占位、标记
 * translation.status = pending，并保持 status: draft 不对外发布。
 * 真正的翻译由 skill 来做——金融术语和港式用语机器换不对。
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { LOCALES, type Locale } from '../config/site.config'
import { CONTENT_DIR, ROOT } from './lib/paths'
import { parseFrontmatter } from './lib/store'
import { parseArgs, c } from './lib/cli'

interface Meta {
  product: string
  version: string
  tag: string
  locale: Locale
  status: string
  translation?: { from: Locale; status: 'pending' | 'done' }
}

const { flags } = parseArgs()
const localeFilter = typeof flags.locale === 'string' ? flags.locale : undefined

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

interface Todo {
  file: string
  source: string
  meta: Meta
}

const todos: Todo[] = []
for (const file of await walk(CONTENT_DIR)) {
  const { data } = parseFrontmatter<Meta>(await fs.readFile(file, 'utf8'))
  if (data?.translation?.status !== 'pending') continue
  if (localeFilter && data.locale !== localeFilter) continue

  todos.push({
    file: path.relative(ROOT, file),
    // 同一个版本的原文，翻译时对照着看
    source: path.relative(ROOT, file.replace(`/${data.locale}/`, `/${data.translation.from}/`)),
    meta: data,
  })
}

if (todos.length === 0) {
  console.log(c.green('✓ 没有待翻译的条目'))
  process.exit(0)
}

const byLocale = new Map<Locale, Todo[]>()
for (const todo of todos) {
  byLocale.set(todo.meta.locale, [...(byLocale.get(todo.meta.locale) ?? []), todo])
}

console.log(`${c.bold('待翻译')} ${c.dim(`${todos.length} 篇`)}\n`)
for (const locale of LOCALES) {
  const list = byLocale.get(locale)
  if (!list?.length) continue
  console.log(`${c.bold(locale)} ${c.dim(`← ${list[0].meta.translation!.from}`)}`)
  for (const todo of list) {
    console.log(`  ${todo.meta.product} ${todo.meta.version}`)
    console.log(`    ${c.dim('译文')} ${todo.file}`)
    console.log(`    ${c.dim('原文')} ${todo.source}`)
  }
  console.log()
}

console.log(c.dim('翻完后把 frontmatter 的 translation.status 改成 done、status 改成 published'))
