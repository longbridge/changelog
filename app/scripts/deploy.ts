/**
 * 把 dist 传到 OSS。
 *
 *   bun run deploy [--dist dist] [--dry-run]
 *
 * 只做上传，构建走 bun run build。部署目标全部来自环境变量，仓库里不写任何桶名与路径：
 *
 *   OSS_BUCKET              桶名
 *   OSS_ENDPOINT            如 oss-cn-hongkong.aliyuncs.com
 *   OSS_PREFIX              桶内路径前缀，带尾斜线
 *   OSS_ACCESS_KEY_ID       凭证
 *   OSS_ACCESS_KEY_SECRET
 *
 * CI 里按 GitHub Environment（staging / production）各配一套，变量名相同、值不同，见 .github/workflows/deploy.yml。
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { DEFAULT_LOCALE, SITE_SEGMENT } from '../config/site.config'
import { parseArgs, c } from './lib/cli'

const run = promisify(execFile)
const { flags } = parseArgs()
const dryRun = Boolean(flags['dry-run'])
const dist = typeof flags.dist === 'string' ? flags.dist : 'dist'

function fail(message: string, hint?: string): never {
  console.error(`${c.red('✗')} ${message}`)
  if (hint) console.error(`  ${c.dim(hint)}`)
  process.exit(1)
}

const REQUIRED = ['OSS_BUCKET', 'OSS_ENDPOINT', 'OSS_PREFIX'] as const
const CREDENTIALS = ['OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'] as const

const missing = [...REQUIRED, ...(dryRun ? [] : CREDENTIALS)].filter((key) => !process.env[key])
if (missing.length > 0) {
  fail(`缺少环境变量：${missing.join(' / ')}`, '在 GitHub 仓库 Settings → Environments 里给对应环境配置')
}

const bucket = process.env.OSS_BUCKET!
const endpoint = process.env.OSS_ENDPOINT!
const prefix = process.env.OSS_PREFIX!.replace(/^\/+/, '').replace(/\/*$/, '/')
const keyId = process.env.OSS_ACCESS_KEY_ID
const keySecret = process.env.OSS_ACCESS_KEY_SECRET

if (!(await stat(dist).catch(() => null))?.isDirectory()) {
  fail(`找不到产物目录 ${dist}`, '先跑 bun run build')
}

// 路径前缀是构建期写死的，传错了页面能开但满屏 404，还得等缓存过期才好修。
// 上传前看一眼产物里的资源路径，base 不对整站会没样式。
const probe = path.join(dist, DEFAULT_LOCALE, SITE_SEGMENT, 'index.html')
const html = await readFile(probe, 'utf-8').catch(() => null)
if (html === null) fail(`${probe} 不存在，产物不完整`)

const expected = `/${SITE_SEGMENT}/_astro/`
const actual = /(?:href|src)="([^"]*\/_astro\/)/.exec(html)?.[1] ?? ''
if (actual !== expected) {
  fail(`产物的资源路径是 ${actual || '（没找到）'}，应该是 ${expected}`, '用 bun run build 构建')
}

// 根目录的 index.html 只给 dev 打开根地址用，线上根路径属于主站，不上传。
// OSS 上同名文件还是旧版 nginx（/changelog → 根 index.html）的落点，覆盖掉会让 /changelog 原地循环跳转
await rm(path.join(dist, 'index.html'), { force: true })

const dest = `oss://${bucket}/${prefix}`
const common = ['-r', '-f', '-u', '-j', '10', '-e', endpoint, '-i', keyId ?? '', '-k', keySecret ?? '']

async function upload(label: string, extra: string[]) {
  console.log(`${c.dim('·')} ${label}`)
  if (dryRun) {
    console.log(c.dim(`  ossutil cp ${dist} oss://<bucket>/${prefix} ${extra.join(' ')}`))
    return
  }
  await run('ossutil', ['cp', dist, dest, ...common, ...extra], { maxBuffer: 64 * 1024 * 1024 })
}

// 日志是公开的：只打印前缀，不打印桶名
console.log(`上传到 ${c.bold(prefix)}`)

// 文件名带内容哈希，可以长缓存
await upload('静态资源（缓存 1 年）', [
  '--exclude', '*.html',
  '--exclude', '*.xml',
  '--exclude', '*.map',
  '--meta', 'Cache-Control:max-age=31536000',
])

// 页面必须实时生效，否则发了新版用户还停在旧页面
await upload('HTML（不缓存）', [
  '--include', '*.html',
  '--meta', 'Cache-Control:no-cache#Content-type:text/html;charset=utf-8',
])

// sitemap 与 rss 跟着内容变，同样不能缓
await upload('sitemap / rss（不缓存）', [
  '--include', '*.xml',
  '--meta', 'Cache-Control:no-cache#Content-type:application/xml;charset=utf-8',
])

console.log(`\n${c.green('✓')} 上传完成`)
