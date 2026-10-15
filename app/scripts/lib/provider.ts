import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type {
  AppStoreSource,
  GitSource,
  ReleaseApiSource,
  RepoDocsSource,
  RepoSource,
} from '../../config/products.config'
import type { Locale } from '../../config/site.config'

const run = promisify(execFile)

/**
 * 仓库 Release 正文默认按中文读，与站点的默认展示语言无关——
 * 内部 Release 是中文写的，站点默认语言换成别的不该改变这个判断。
 */
const SOURCE_LOCALE: Locale = 'zh-CN'

/** 各平台差异抹平后的统一 Release 结构 */
export interface RawRelease {
  tag: string
  title: string
  /** 原始 Markdown 正文，未做任何清洗 */
  body: string
  /** ISO 时间戳 */
  publishedAt: string
  /** 平台上的 release 页面地址 */
  url: string
  prerelease: boolean
  draft: boolean
  author?: string
  /** 这一条内容的语言。同一个版本可能有多条，分别对应不同语言 */
  locale: Locale
  /** 原文是否已经是对外口径：是的话 transform 不重写文案，只做格式适配 */
  curated: boolean
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

async function exec(cmd: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<string> {
  try {
    const { stdout } = await run(cmd, args, {
      env: { ...process.env, ...env },
      maxBuffer: 64 * 1024 * 1024,
    })
    return stdout
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string }
    if (err.code === 'ENOENT') {
      throw new ProviderError(
        `找不到命令 ${cmd}`,
        cmd === 'glab' ? '安装：brew install glab' : '安装：brew install gh',
      )
    }
    const stderr = (err.stderr ?? '').trim()
    throw new ProviderError(`${cmd} ${args.join(' ')} 执行失败：${stderr || err.message}`)
  }
}

/** GitLab 的项目路径需要整体 URL 编码后塞进 API path */
const encodeProjectPath = (repo: string) => encodeURIComponent(repo)

/**
 * 取 GitLab API。两条路径刻意分开：
 *   CI     镜像里没有 glab，直接拿 CI_READ_API_TOKEN 调 REST（只读 scope 就够）
 *   本地    走 glab，复用开发者已有的登录态，不用谁都去配一份 token
 * 只认 CI_READ_API_TOKEN 这一个变量名，不顺带认 GITLAB_TOKEN——后者在很多人机器上
 * 是给别的实例用的，认了会让本地抓取莫名其妙地 401。
 */
async function gitlabApi(host: string, path: string, repo: string): Promise<unknown> {
  const token = process.env.CI_READ_API_TOKEN

  if (token) {
    const response = await fetch(`https://${host}/api/v4/${path}`, {
      headers: { 'PRIVATE-TOKEN': token },
    })
    if (!response.ok) {
      throw new ProviderError(
        `读取 ${repo} 的 Release 失败：${response.status} ${response.statusText}`,
        response.status === 401 || response.status === 403
          ? 'CI_READ_API_TOKEN 需要 read_api scope 且角色至少 Reporter'
          : undefined,
      )
    }
    return await response.json()
  }

  const stdout = await exec('glab', ['api', path], { GITLAB_HOST: host })
  try {
    return JSON.parse(stdout)
  } catch {
    throw new ProviderError(`解析 ${repo} 的 GitLab 响应失败：${stdout.slice(0, 200)}`)
  }
}

async function fetchGitLab(source: GitSource, perPage: number): Promise<RawRelease[]> {
  const host = source.host
  if (!host) throw new ProviderError(`gitlab 来源 ${source.repo} 缺少 host 配置`)

  const path = `projects/${encodeProjectPath(source.repo)}/releases?per_page=${perPage}`
  const payload = await gitlabApi(host, path, source.repo)
  if (!Array.isArray(payload)) {
    const message = (payload as { message?: string })?.message ?? JSON.stringify(payload).slice(0, 200)
    throw new ProviderError(
      `读取 ${source.repo} 的 Release 失败：${message}`,
      message.includes('401') && !process.env.CI_READ_API_TOKEN
        ? `先执行：glab auth login --hostname ${host}`
        : undefined,
    )
  }

  const locale = source.sourceLocale ?? SOURCE_LOCALE
  return (payload as GitLabRelease[]).map((item) => ({
    locale,
    curated: false,
    tag: item.tag_name,
    title: item.name || item.tag_name,
    body: item.description ?? '',
    publishedAt: item.released_at ?? item.created_at,
    url: item._links?.self ?? `https://${host}/${source.repo}/-/releases/${item.tag_name}`,
    // GitLab 没有 draft，未来时间的 release 视作未发布
    prerelease: Boolean(item.upcoming_release),
    draft: false,
    author: item.author?.name,
  }))
}

async function fetchGitHub(source: GitSource, perPage: number): Promise<RawRelease[]> {
  const args = ['api', `repos/${source.repo}/releases?per_page=${perPage}`, '--paginate']
  if (source.host && source.host !== 'github.com') args.push('--hostname', source.host)

  const stdout = await exec('gh', args)
  // --paginate 会把多页数组拼接输出，这里按顶层数组切分后合并
  const chunks = stdout.trim().replace(/\]\s*\[/g, '],[')
  const parsed = JSON.parse(`[${chunks}]`) as GitHubRelease[][]
  const items = parsed.flat()

  const locale = source.sourceLocale ?? SOURCE_LOCALE
  return items.map((item) => ({
    locale,
    curated: false,
    tag: item.tag_name,
    title: item.name || item.tag_name,
    body: item.body ?? '',
    publishedAt: item.published_at ?? item.created_at,
    url: item.html_url,
    prerelease: item.prerelease,
    draft: item.draft,
    author: item.author?.login,
  }))
}

export async function fetchReleases(source: RepoSource): Promise<RawRelease[]> {
  const perPage = Math.min(source.limit ?? 50, 100)

  switch (source.provider) {
    case 'gitlab':
      return (await fetchGitLab(source, perPage)).filter((release) => !release.draft)
    case 'github':
      return (await fetchGitHub(source, perPage)).filter((release) => !release.draft)
    case 'repo-docs':
      return fetchRepoDocs(source)
    case 'appstore':
      return fetchAppStore(source)
    case 'release-api':
      return fetchReleaseApi(source)
  }
}

// ---------- 仓库里手写维护的更新日志目录 ----------

const RAW_HOST = 'https://raw.githubusercontent.com'
const API_HOST = 'https://api.github.com'

interface GitHubContent {
  name: string
  type: string
}

/**
 * 有 RELEASE_NOTES_GH_TOKEN 就带上：未认证 60 次/小时，认证后 5000 次/小时。
 * 用专属变量名而不是通用的 GH_TOKEN：后者在不少人机器上被设成了 GitLab 的 glpat-，
 * 认了它会让本来匿名就能跑通的公开仓库抓取变成 401。
 */
function githubHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = process.env.RELEASE_NOTES_GH_TOKEN
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function json<T>(url: string, hint?: string): Promise<T> {
  const response = await fetch(url, {
    headers: githubHeaders({ Accept: 'application/vnd.github+json' }),
  })
  if (!response.ok) {
    throw new ProviderError(
      `请求 ${url} 失败：${response.status} ${response.statusText}`,
      response.status === 403
        ? 'GitHub 未认证接口每小时 60 次，稍后再试或设置 RELEASE_NOTES_GH_TOKEN'
        : hint,
    )
  }
  return (await response.json()) as T
}

/** 正文里第一个 yyyy-mm-dd 就是发布日期，各语言写法不同但日期格式一致 */
function extractDate(body: string, fallback: string): string {
  const match = /(\d{4})-(\d{2})-(\d{2})/.exec(body)
  return match ? new Date(`${match[0]}T00:00:00.000Z`).toISOString() : fallback
}

async function fetchRepoDocs(source: RepoDocsSource): Promise<RawRelease[]> {
  const ref = source.ref ?? 'main'
  const filePattern = new RegExp(source.filePattern ?? '^(?<version>.+)\\.md$')
  const ignore = new Set(source.ignore ?? ['index.md'])
  const limit = source.limit ?? 100
  const releases: RawRelease[] = []

  for (const [locale, dir] of Object.entries(source.paths) as [Locale, string][]) {
    const entries = await json<GitHubContent[]>(
      `${API_HOST}/repos/${source.repo}/contents/${dir}?ref=${ref}`,
      `确认仓库 ${source.repo} 的 ${dir} 目录存在且公开`,
    )

    const files = entries
      .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
      .filter((entry) => !ignore.has(entry.name))
      .filter((entry) => filePattern.test(entry.name))
      .slice(0, limit)

    // 正文走 raw 域名，不占 API 调用额度
    const bodies = await Promise.all(
      files.map(async (file) => {
        const response = await fetch(`${RAW_HOST}/${source.repo}/${ref}/${dir}/${file.name}`, {
          headers: githubHeaders(),
        })
        return response.ok ? await response.text() : null
      }),
    )

    files.forEach((file, index) => {
      const body = bodies[index]
      if (body === null) return
      const version = filePattern.exec(file.name)?.groups?.version ?? file.name.replace(/\.md$/, '')
      releases.push({
        tag: file.name.replace(/\.md$/, ''),
        title: version,
        body,
        publishedAt: extractDate(body, new Date(0).toISOString()),
        url: `https://github.com/${source.repo}/blob/${ref}/${dir}/${file.name}`,
        prerelease: false,
        draft: false,
        locale,
        curated: true,
      })
    })
  }

  return releases
}

// ---------- App Store 的版本更新说明 ----------

interface ITunesResult {
  version: string
  releaseNotes?: string
  currentVersionReleaseDate?: string
  trackName: string
  trackViewUrl: string
}

async function fetchAppStore(source: AppStoreSource): Promise<RawRelease[]> {
  const releases: RawRelease[] = []

  for (const [locale, storefront] of Object.entries(source.storefronts) as [Locale, string][]) {
    const payload = await json<{ results: ITunesResult[] }>(
      `https://itunes.apple.com/lookup?id=${source.appId}&country=${storefront}`,
    )
    const app = payload.results?.[0]
    // 该区没上架就跳过，缺的语言留给翻译补齐
    if (!app?.releaseNotes) continue

    releases.push({
      tag: `v${app.version}`,
      title: app.version,
      body: app.releaseNotes,
      publishedAt: app.currentVersionReleaseDate ?? new Date().toISOString(),
      url: app.trackViewUrl,
      prerelease: false,
      draft: false,
      locale,
      curated: true,
    })
  }

  return releases
}

// ---------- 产品自己提供的版本说明接口 ----------

interface ReleaseApiPage {
  code: number
  message?: string
  data?: {
    has_more: boolean
    next_cursor: string
    release_notes: {
      version: string
      feature_intro: string
      published_at: string
    }[]
  }
}

/** 接口里的版本号写法不统一（`V 1.4.0`、`v1.2.1`），tag 统一成 v1.4.0，与文件名、锚点一致 */
const releaseApiTag = (version: string): string => `v${version.replace(/^\s*v\s*/i, '').trim()}`

async function fetchReleaseApi(source: ReleaseApiSource): Promise<RawRelease[]> {
  const limit = source.limit ?? 50
  const releases: RawRelease[] = []

  for (const [locale, language] of Object.entries(source.acceptLanguage) as [Locale, string][]) {
    let cursor = ''
    let count = 0
    do {
      const url = new URL(source.url)
      url.searchParams.set('limit', String(Math.min(limit - count, 50)))
      if (cursor) url.searchParams.set('cursor', cursor)

      // 网关会把 UA 开头的 `Bun/x` `Node/x` 当成来源去找分片，找不到就回 500 shard not exists
      const response = await fetch(url, {
        headers: {
          'Accept-Language': language,
          'User-Agent': 'Mozilla/5.0 (compatible; lb-release-notes)',
        },
      })
      if (!response.ok) {
        throw new ProviderError(`请求 ${url} 失败：${response.status} ${response.statusText}`)
      }
      const payload = (await response.json()) as ReleaseApiPage
      if (payload.code !== 0 || !payload.data) {
        throw new ProviderError(
          `读取 ${source.url} 失败：${payload.message ?? JSON.stringify(payload).slice(0, 200)}`,
        )
      }

      for (const item of payload.data.release_notes) {
        const tag = releaseApiTag(item.version)
        releases.push({
          tag,
          title: tag.slice(1),
          body: item.feature_intro ?? '',
          publishedAt: item.published_at,
          // 接口没有单条版本的页面，记下接口本身，方便核对原文
          url: source.url,
          prerelease: false,
          draft: false,
          locale,
          curated: true,
        })
      }
      count += payload.data.release_notes.length
      cursor = payload.data.has_more ? payload.data.next_cursor : ''
    } while (cursor && count < limit)
  }

  return releases
}

interface GitLabRelease {
  tag_name: string
  name?: string
  description?: string
  created_at: string
  released_at?: string
  upcoming_release?: boolean
  author?: { name?: string }
  _links?: { self?: string }
}

interface GitHubRelease {
  tag_name: string
  name?: string
  body?: string
  created_at: string
  published_at?: string
  html_url: string
  prerelease: boolean
  draft: boolean
  author?: { login?: string }
}
