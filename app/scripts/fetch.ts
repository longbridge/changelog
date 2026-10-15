/**
 * 从配置的仓库拉取 Release，原样落盘到 releases/<product>/<tag>.<locale>.md。
 *
 *   bun run fetch                      # 抓全部产品
 *   bun run fetch --product longbridge-desktop
 *   bun run fetch --limit 10 --dry-run
 */
import { products, sourceId, type ProductConfig, type RepoSource } from '../config/products.config'
import { fetchReleases, ProviderError } from './lib/provider'
import { normalize } from './lib/release'
import { writeRaw, type WriteResult } from './lib/store'
import { parseArgs, c } from './lib/cli'

const { flags } = parseArgs()
const only = typeof flags.product === 'string' ? flags.product.split(',') : undefined
const limit = flags.limit ? Number(flags.limit) : undefined
const dryRun = Boolean(flags['dry-run'])

const targets: ProductConfig[] = only ? products.filter((p) => only.includes(p.id)) : products

if (targets.length === 0) {
  console.error(c.red(`没有匹配的产品：${only?.join(', ')}`))
  console.error(c.dim(`可用产品：${products.map((p) => p.id).join(', ')}`))
  process.exit(1)
}

/** 日志里怎么称呼一个来源 */
const describe = (source: RepoSource): string =>
  source.provider === 'appstore' ? sourceId(source) : `${source.provider}:${sourceId(source)}`

const totals: Record<WriteResult | 'failed', number> = {
  created: 0,
  updated: 0,
  unchanged: 0,
  failed: 0,
}

for (const product of targets) {
  console.log(`\n${c.bold(product.id)} ${c.dim(`(${product.sources.length} 个来源)`)}`)

  for (const source of product.sources) {
    const label = describe(source)
    try {
      const raw = await fetchReleases({ ...source, limit: limit ?? source.limit })
      const releases = normalize(product, source, raw)
      const dropped = raw.length - releases.length

      if (releases.length === 0) {
        console.log(`  ${c.yellow('·')} ${label} ${c.dim(`无匹配版本（拉到 ${raw.length} 条，全部被规则过滤）`)}`)
        continue
      }

      const stats: Record<WriteResult, number> = { created: 0, updated: 0, unchanged: 0 }
      for (const release of releases) {
        if (dryRun) {
          stats.unchanged++
          console.log(`    ${c.dim('dry-run')} ${release.version} ${c.dim(release.tag)}`)
          continue
        }
        const result = await writeRaw(release)
        stats[result]++
        totals[result]++
      }

      const summary = [
        stats.created ? c.green(`新增 ${stats.created}`) : '',
        stats.updated ? c.cyan(`更新 ${stats.updated}`) : '',
        stats.unchanged ? c.dim(`未变 ${stats.unchanged}`) : '',
        dropped ? c.dim(`过滤 ${dropped}`) : '',
      ]
        .filter(Boolean)
        .join(c.dim(' · '))
      console.log(`  ${c.green('✓')} ${label} ${summary}`)
    } catch (error) {
      totals.failed++
      const message = error instanceof Error ? error.message : String(error)
      console.log(`  ${c.red('✗')} ${label} ${message}`)
      if (error instanceof ProviderError && error.hint) console.log(`    ${c.dim(error.hint)}`)
    }
  }
}

console.log(
  `\n${c.bold('抓取完成')} ${c.dim('→ releases/')}  ` +
    `新增 ${totals.created} · 更新 ${totals.updated} · 未变 ${totals.unchanged}` +
    (totals.failed ? ` · ${c.red(`失败 ${totals.failed}`)}` : ''),
)
console.log(c.dim('下一步：bun run transform 生成 MDX 初稿'))

if (totals.failed > 0) process.exit(1)
