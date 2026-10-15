# release-notes / app

Longbridge 各产品对外更新日志站点的代码：**抓取公开来源 → 落盘成 md → 改写成三语 MDX → Astro 打包成静态站点**。

产品与 agent 的使用流程见仓库根的 [`README.md`](../README.md) 与 [`AGENTS.md`](../AGENTS.md)，这里只讲代码。命令都在 `app/` 下执行。

## 快速开始

```bash
bun install
bun run fetch        # 1. 按配置抓取公开来源，落到 ../releases/<product>/
bun run transform    # 2. 清洗并生成 MDX 初稿到 src/content/releases/
bun run dev          # 3. 本地预览（会显示草稿）
bun run build        # 4. 产出静态站点到 dist/（只含已定稿内容）
```

## 数据流

```
产品手写（PR 提交）              公开来源（定时抓取）
releases/<product>/<version>.md   releases/<product>/<tag>.<locale>.md
        │  release-page-compose          │  bun run transform
        └──────────────┬─────────────────┘
                       ▼
   src/content/releases/<locale>/<product>/<tag>.mdx    小版本
   src/content/majors/<locale>/<product>/<major>.mdx     大版本总结（列表页展示的就是这层）
                       │  bun run build
                       ▼
                     dist/
```

**md 是输入，mdx 是成品。** `releases/` 下只有产品线目录，两种 md 混放：手写稿没有 frontmatter，抓取原文的 frontmatter 带 `fetchedAt`，`readRaw` 只读后者。

转换时：

- 原文已经是对外口径（`repo-docs`、`appstore`、`release-api`）→ 只做格式适配，直接 `published`
- 原文是内部口径（`github` 的 Release）→ 清洗分组后留 `draft`，等 skill 改写
- 某个语言没有原文 → 用最接近的语言占位、标 `translation.status: pending` 并保持 `draft`，
  **不做机器翻译**；`bun run i18n:todo` 列出待办，翻译由 `release-notes-mdx` skill 完成

`transform` 默认不覆盖已存在的 MDX，重新抓取不会冲掉人工改过的稿子。

## 站点的两层版本

列表页一条 = 一个**大版本**（版本号前两段：`0.20.1` → `0.20`，日期版本 `2026.09.11` → `2026.09`），
展示的是大版本总结；点进去是大版本页，正文按**小版本**倒序分节，侧边栏可以在小版本之间跳。
小版本没有独立页面，链接是大版本页里的锚点 `#<文件名>`。

所以发布一个版本要两件事都齐：小版本 `published`，它所属的大版本总结三语也 `published`。

## 发布

**分支即环境，合并就部署**，没有打 tag、没有 PR 预览：

| 合并到 | 部署到 |
| --- | --- |
| `canary` | 测试环境 `longbridge.xyz/<locale>/changelog` |
| `main` | 生产 `longbridge.com/<locale>/changelog` |

一个版本一个分支：从 `main` 切出，先 PR 到 `canary` 验收，再用同一个分支 PR 到 `main`。`canary` 不合回 `main`，定期按 `main` 重置。
合并前的预览在本地看：`bun run preview:build`。

workflow 在 `../.github/workflows/`：

| 文件 | 触发 | 做什么 |
| --- | --- | --- |
| `check.yml` | PR 到 `main` / `canary` | `check` + `check:assets`，不过不能合 |
| `deploy.yml` | push 到 `main` / `canary` | 检查 → 构建 → `bun run deploy` 传 OSS |
| `sync.yml` | 每天定时，或手动 | 抓取 + 转换，有变化就开（或更新）`sync/releases` 分支的 PR，不自动合并 |

### 部署目标

仓库是公开的，**桶名、路径、凭证都不进代码**，全部在 GitHub 仓库的 Settings 里配。`staging` 环境给 canary 用，`production` 给 main 用：

| 类型 | 名字 |
| --- | --- |
| 仓库 Variables | `OSS_BUCKET` `OSS_ENDPOINT`（两个环境共用） |
| Environment Variables | `OSS_PREFIX`（staging / production 各一个） |
| 凭证 | 默认用组织共享的 `FE_LB_ASSET_ACCESS_KEY_*`；某个环境要用别的 key，在该环境配 `OSS_ACCESS_KEY_ID` `OSS_ACCESS_KEY_SECRET` 覆盖 |

`production` 环境可以再配 Required reviewers，合进 `main` 后要人点一下才上传。

`bun run deploy` 上传前会核对产物的资源路径，并分三趟上传：带哈希的静态资源缓存一年，HTML 与 sitemap / RSS 不缓存。
本地应急直传：export 上面五个变量后 `make deploy:website-local`。

线上地址语言在前：`longbridge.com/zh-CN/changelog/<product>/<major>`。构建的 base 是 `/`，`changelog` 是路由里的一段（`src/pages/[locale]/changelog/`，由 `config/site.config.ts` 的 `SITE_SEGMENT` 定义），主站反代按这几类路径回源：

| 路径 | 内容 |
| --- | --- |
| `/<locale>/changelog/**` | 页面与 RSS |
| `/changelog/_astro/**` | 构建出的 JS / CSS（`build.assets`） |
| `/changelog/sitemap-*.xml` | 站点地图 |
| `/changelog` | 按主站 `locale` cookie 跳到对应语言 |

改 `SITE_SEGMENT` 要同步主站的反代配置。

## 配置

### 加一个产品

编辑 `config/products.config.ts`：

```ts
{
  id: 'longbridge-app',              // URL 片段与 releases/ 下的目录名
  order: 10,                          // 首页排序
  accent: '#2f7d6b',                  // 该产品页面的主题色
  homepage: 'https://longbridge.com/download',
  name: { 'zh-CN': '…', 'zh-HK': '…', en: '…' },
  summary: { 'zh-CN': '…', 'zh-HK': '…', en: '…' },
  sources: [],                        // 没有公开来源就留空，内容走 PR 提交
}
```

一个产品可以配多个 `sources`，抓取结果会合并到同一条时间线。`hidden: true` 让产品不对外展示，带草稿的构建里照常出现。

### 数据源

**只接公开来源**：抓到的原文会原样提交进这个公开仓库。

| provider | 读什么 | 依赖 |
| --- | --- | --- |
| `repo-docs` | 仓库里按语言分目录维护的更新日志（已是对外文案） | 无，走公开 HTTP |
| `appstore` | App Store 的版本更新说明，按商店区域区分语言 | 无，走公开 HTTP |
| `release-api` | 产品自己维护的公开版本说明接口 | 无，走公开 HTTP |
| `github` | 公开仓库的 Release 正文 | [`gh`](https://cli.github.com) |

`repo-docs` 的配置长这样：

```ts
{
  provider: 'repo-docs',
  repo: 'longbridge/longbridge-desktop-website',
  paths: {
    en: 'docs/release-notes',
    'zh-CN': 'docs/zh-CN/release-notes',
    'zh-HK': 'docs/zh-HK/release-notes',
  },
  filePattern: '^v(?<version>\\d+\\.\\d+\\.\\d+)\\.md$',
  ignore: ['index.md'],
}
```

原文里的 `<video>` 和 `<img>` 会自动换成站点的 `<Video>` / `<Figure>` 组件，原站点的 `<style>` 与排版壳会被丢掉。
设置 `RELEASE_NOTES_GH_TOKEN` 可以提高 GitHub 接口的限额，CI 里用的是 workflow 自带的 token。

### 语言

在 `config/site.config.ts` 的 `LOCALES` 里增删。默认三语：`zh-CN` `zh-HK` `en`，路由形如 `/zh-HK/changelog/longbridge-pro/2.1`，`/changelog` 会按主站的 `locale` cookie 跳转，没有就进默认语言。

## 命令

| 命令 | 说明 |
| --- | --- |
| `bun run fetch` | 抓全部产品。`--product <id>` 限定产品（逗号分隔多个），`--limit n` 限制条数，`--dry-run` 只看不写 |
| `bun run transform` | 生成缺失的 MDX 初稿。`--locale en` 换语言，`--force` 覆盖已有稿（会丢失人工编辑），`--product <id>` 限定产品 |
| `bun run dev` | 本地预览，自动显示 `draft`。Astro 7 以守护进程运行：`bunx astro dev status` / `stop` / `logs` |
| `bun run build` | 生产构建，只输出 `published`。`SHOW_DRAFTS=1 bun run build` 把草稿一起打进去 |
| `bun run check` | 类型检查（需要 TypeScript 6.x，7.x 尚未提供 `astro check` 依赖的 API） |
| `bun run check:assets` | 校验素材是否存在、图片视频有没有描述、有没有不可靠的外链图、published 的条目三语齐不齐、标题是不是还停在脚本占位、大版本总结有没有跟上 |
| `bun run i18n:todo` | 列出还没翻译的条目，给出译文与原文路径 |
| `bun run preview:report` | 列出本次改动涉及的版本（与 `main` 比较，含未提交的文件）、缺的语言与素材，产出 `dist/preview/index.html` |
| `bun run preview:build` | 带草稿构建 + 生成预览报告，合并前本地验收用 |
| `bun run deploy` | 把 `dist/` 传到 OSS，目标来自 `OSS_*` 环境变量；`--dry-run` 只打印命令 |

## MDX frontmatter

小版本 `src/content/releases/<locale>/<product>/<tag>.mdx`：

```yaml
product: longbridge-pro         # 脚本维护，勿改
version: '2.3.11'               # 脚本维护，勿改
tag: v2.3.11                    # 脚本维护，勿改
locale: zh-CN
title: 图表里直接下单改单       # 写这版做了什么，不要只写版本号
summary: 一句话概括，SEO 也会用
highlights:                     # 2-5 条
  - 支持美股盘前盘后行情
releasedAt: 2025-08-20T02:30:10.685Z
platforms: [macOS, Windows, Linux]
status: draft                   # draft 本地可见 / published 对外 / skipped 不展示
source: { provider, repo, url } # 脚本维护，勿改；手写稿填 provider: manual
```

大版本总结 `src/content/majors/<locale>/<product>/<major>.mdx`，列表页展示的就是它：

```yaml
product: longbridge-pro
major: '2.3'                    # 脚本维护，勿改
locale: zh-CN
title: 选股器、量化与网格交易
summary: 一句话概括这一整个大版本
highlights:                     # 2-4 条，整个大版本的亮点
  - 多维选股器
status: published
```

正文可以留空——细节在大版本页下面的小版本分节里。

## 正文里的富媒体

正文是 MDX，这些组件**直接写、不用 import**（详情页已注入）：

| 组件 | 用途 |
| --- | --- |
| `<Figure src alt caption>` | 截图，点击放大 |
| `<Compare before after alt>` | 改版前后对比，可拖动分隔线 |
| `<Video src label poster>` | 操作演示，进入视口自动静音播放，划走暂停 |
| `<Steps>` + `<Step title>` | 分步指引，带切换器 |
| `<Demo src title poster>` | 可交互演示，点击后才加载 iframe |
| `<LinkPreview href>` | 外链，悬停在标签下方浮出目标页面的实时预览 |
| `<Kbd keys="⌘+K">` | 快捷键。行内代码写成 `` `Cmd + K` ``、`` `Shift + Esc` ``、`` `ESC` `` 也会自动渲染成同样的键帽（`src/lib/kbd-plugin.ts`），curated 原文不用改 |
| `<Callout type>` | 提示块，`info` / `warning` / `success` |

正文里的普通 Markdown 链接会自动套上 `<LinkPreview>`，只有要指定 `poster`、`label` 或关掉预览时才手写这个标签。

素材上传到自家 CDN（`assets.lbkrs.com` / `assets.lbctrl.com` / `pub.lbkrs.com`），在 MDX 里写完整 URL——图片不进这个仓库。正文段落与列表的滚动进场动画是全站自动的；所有动效都遵循系统的"减少动态效果"设置。

写法与克制原则见 `release-notes-media` skill，写完用 `bun run check:assets` 验收。

## 本地预览

```bash
bun run preview:build          # 带草稿构建 + 报告
open dist/preview/index.html
```

入口页列出本次改了哪些版本、三语齐不齐、素材有没有缺、哪几条还是草稿，每个语言标签链到大版本页里这一版的锚点（`…/<major>/index.html#<tag>`）。
统计范围是**工作区里所有改动过的版本**，没 commit、没 track 的新文件也算，刚写完就能跑。
只跑 `preview:report` 不构建的话 `dist/` 里没有页面，链接会 404，它会在末尾提醒。

## 目录

```
../releases/<product>/   原数据：产品手写稿与抓取原文
../.github/workflows/    check / deploy / sync
../.claude/skills/       web-release（入口）、release-page-compose（装配）、release-notes-mdx（改写口径）、release-notes-media（富媒体）
config/                  产品与站点配置，新增产品只改这里
scripts/                 抓取、转换、校验、预览、上传的命令行脚本
src/content/releases/    小版本 MDX（人和 AI 写）
src/content/majors/      大版本总结，列表页展示的就是这层（人和 AI 写）
src/pages/               路由：/[locale]/changelog/[product]/[major]
src/components/          页面组件
src/components/release/  MDX 里可用的富媒体组件
src/components/release/custom/  还没稳定的试验组件（需显式 import）
public/changelog/release-assets/   仅存放组件预览页用的示例图，正文素材走 CDN
```

## 四个 skill 的分工

| skill | 什么时候用 |
| --- | --- |
| `web-release` | **入口**。从零写一个版本页 → 本地预览 → PR 到 canary → PR 到 main 的完整路径，含「预览里看不到」的排查表 |
| `release-page-compose` | 产品交来一份 md，要装配成完整页面。带版式配方与自定义组件扩展路径 |
| `release-notes-mdx` | 抓取来的原文要改写成对外口径、翻译成三语 |
| `release-notes-media` | 文案定稿了，给亮点配截图、对比、演示 |

前三个管「写成什么样」，`web-release` 管「从哪写、写完怎么看、怎么发出去」。
