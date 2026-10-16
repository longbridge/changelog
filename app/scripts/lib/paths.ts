import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SITE_SEGMENT } from '../../config/site.config'

/** 代码根目录 app/（scripts/lib 上两级），站点、脚本、配置都在这下面 */
export const ROOT = fileURLToPath(new URL('../..', import.meta.url))

/** git 仓库根目录：app/ 的上一级，git 与 GitLab API 里的路径都相对它 */
export const REPO_ROOT = path.dirname(ROOT.replace(/\/$/, ''))

/**
 * 原数据目录，在代码外面，下面只有产品线目录 releases/<product>/。
 * 每个产品目录里混放两种 md：产品手写的 <version>.md（没有 frontmatter），
 * 和抓取脚本写的 <tag>.<locale>.md（frontmatter 带 fetchedAt，重新抓取会覆盖）。
 */
export const RAW_DIR = path.join(REPO_ROOT, 'releases')

/** 对外发布的 MDX，脚本生成初稿后交给人和 skill 编辑：默认不覆盖 */
export const CONTENT_DIR = path.join(ROOT, 'src', 'content', 'releases')

/** 大版本总结，由人和 skill 写，脚本只补空文件 */
export const MAJORS_DIR = path.join(ROOT, 'src', 'content', 'majors')

export const rawProductDir = (productId: string) => path.join(RAW_DIR, productId)
export const rawFile = (productId: string, tagSlug: string) =>
  path.join(RAW_DIR, productId, `${tagSlug}.md`)
export const contentFile = (locale: string, productId: string, tagSlug: string) =>
  path.join(CONTENT_DIR, locale, productId, `${tagSlug}.mdx`)
export const majorFile = (locale: string, productId: string, major: string) =>
  path.join(MAJORS_DIR, locale, productId, `${major}.mdx`)

/**
 * 仓库根的 assets/，产品的截图录屏按 assets/<product>/<version>/<file> 放这里。
 * public/changelog/assets 是指向它的软链接，构建时随站点一起进 dist，部署时一起传 OSS。
 */
export const ASSETS_DIR = path.join(REPO_ROOT, 'assets')

/** MDX 里的站内素材路径（/assets/... 或 /release-assets/...）对应的本地文件，见 src/lib/assets.ts */
export const localAssetFile = (src: string) => path.join(ROOT, 'public', SITE_SEGMENT, src)
