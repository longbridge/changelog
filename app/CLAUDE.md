# 项目约定

Longbridge 对外 Release Notes 站点。三段式内容流水线：抓取（脚本）→ 改写（skill + 人）→ 构建（Astro SSG）。

这是**代码目录** `app/` 的开发约定，下文路径相对 `app/`，命令在 `app/` 下执行。仓库根只放 `README.md`、`AGENTS.md`（产品与 agent 的端到端流程）、原数据 `releases/` 和本目录；原数据路径写作 `releases/...`，指的是仓库根的那个。代码里用 `scripts/lib/paths.ts` 的 `REPO_ROOT` / `RAW_DIR` 定位，不要写死 `../`。

仓库托管在 GitHub 且公开：代码、注释、内容里不写内部域名、内部系统名、人名，部署目标（桶、路径、凭证）只放在 GitHub 的 Secrets / Variables 里。

## 目录职责

| 目录 | 谁写 | 规则 |
| --- | --- | --- |
| `config/` | 人 | 新增产品、仓库、语言只改这里 |
| `releases/<product>/<version>.md`（仓库根） | 产品 | 手写的更新说明，无 frontmatter，`release-page-compose` 的输入。`releases/` 下只放产品线目录 |
| `scripts/` | 人 | 抓取与转换的 CLI，Bun 运行 TS |
| `releases/<product>/<tag>.<locale>.md`（仓库根） | `bun run fetch` | **不要手改**，重新抓取会覆盖。frontmatter 带 `fetchedAt`，`readRaw` 靠它和手写稿区分 |
| `src/content/releases/` | `bun run transform` 生成初稿，之后由 skill / 人编辑 | transform 默认不覆盖已有文件 |
| `src/content/majors/` | 人 / skill | 大版本总结，列表页展示的就是这一层；transform 只补空壳 |
| `src/` 其余 | 人 | 站点代码 |

## 常用命令

```bash
bun run fetch --product <id>      # 抓取
bun run transform --locale en     # 生成指定语言初稿
bun run dev                       # 预览（显示草稿），Astro 7 以守护进程运行
bunx astro dev stop               # 停止 dev server
bun run build                     # 生产构建，只输出 published
SHOW_DRAFTS=1 bun run build       # 把草稿也打进去验收
bun run check                     # 类型检查
bun run check:assets              # 校验素材引用、无障碍描述与三语对齐
bun run i18n:todo                 # 列出待翻译条目
bun run preview:build             # 带草稿构建 + 预览报告，给产品验收
# 发布靠合并：PR 合进 canary → 测试环境，合进 main → 生产（.github/workflows/deploy.yml）
```

## 内容规则

- 四个 skill 分工：`web-release`（入口：从零写一个版本页 → 本地预览 → PR 到 canary 测试 → PR 到 main 上线，不熟这个仓库先读它）、`release-page-compose`（产品给的 md → 完整页面，含版式配方与自定义组件扩展）、`release-notes-mdx`（抓取原文 → 对外口径与三语）、`release-notes-media`（给定稿配富媒体）。
- **不要写不存在的素材路径。** 没有截图就保持纯文字并向用户索要，`bun run check:assets` 会把裂图挑出来。
- 正文里的图片视频走自家 CDN 的完整 URL（`assets.lbkrs.com` / `assets.lbctrl.com` / `pub.lbkrs.com`），素材不进仓库；`public/changelog/release-assets/` 只留组件预览页的示例图。
- `status` 语义：`draft` 仅本地可见 / `published` 对外发布 / `skipped` 永不展示。
- frontmatter 里 `product` `version` `tag` `releasedAt` `source` 由脚本维护，改写时不要动。
- 站点分两层：列表页只展示**大版本**（版本号前两段，`0.20.1` → `0.20`，`2026.09.11` → `2026.09`），大版本页里按小版本分节，小版本没有独立 URL，锚点是 `#<文件名>`。
- 一个版本要在站点上出现，小版本要 `published`，它所属的大版本总结也要三语 `published`——`bun run check:assets` 会拦住只做一半的。
- 三语文件必须版本对齐：`src/content/releases/{zh-CN,zh-HK,en}/<product>/<tag>.mdx`。缺某个语言时，站点的语言切换会回落到该语言的产品页而不是 404；`bun run check:assets` 会把 `published` 却缺语言的条目挑出来。
- **脚本不做机器翻译**。curated 来源缺语言时 transform 用最接近的语言占位、标 `translation.status: pending` 并保持 `draft`，`bun run i18n:todo` 能列出来；**非 curated 来源不生成占位**，另外两个语言的文件由 `release-notes-mdx` skill 在转 `published` 时自己建。
- `curated` 的原文（`repo-docs` / `appstore`）已经是对外口径，转换后直接 `published`，不要再改写文案；只有内部口径的 Release 才需要重写。
- 快捷键写成行内代码即可（`` `Cmd + K` ``），`src/lib/kbd-plugin.ts` 会渲染成键帽；识别规则是「+ 连接且含修饰键」或「单个按键名」，普通代码不受影响。
- `highlights` 是人/AI 写的亮点短语，`topics` 是机械提取的模块标签——不要把模块名塞进 highlights。

## 代码约定

- 包管理与脚本运行用 `bun`。
- TypeScript 固定 6.x：7.x 的原生编译器还没暴露 `astro check` 依赖的 API。
- Zod 从 `zod` 直接导入，不要用 `astro:content` 里已废弃的 `z`。
- 路径别名：`@components/*` `@layouts/*` `@lib/*` `@config/*`，MDX 里也可用。
- URL 片段等于 MDX 文件名（`content.config.ts` 里自定义了 `generateId`），不要改回默认 slug 化，否则 `v1.19.0` 会变成 `v1190` 并可能撞车。
- 跨页动画依赖 `transition:name`，列表页与详情页的同一条目必须用 `releaseTitleId()` 生成同一个名字。
- 样式用 Tailwind v4，颜色走 `src/styles/global.css` 里的 `@theme` token；产品主题色通过 `--accent` CSS 变量注入，不要写死。
- MDX 可用组件在详情页的 `mdxComponents` 里注入，新增组件要同时加进那个映射，MDX 作者才不用 import。
- 由脚本动态创建的元素（如 Steps 的切换按钮）拿不到 Astro 的 scoped 样式，它们的样式必须写在 `global.css`。
- 客户端路由（`ClientRouter`）下组件脚本只执行一次：事件用委托绑定，初始化挂在 `astro:page-load`，并用 `dataset` 标记防重复。
- 动效一律要在 `prefers-reduced-motion: reduce` 下退化为无动画。
- 新增 MDX 组件要同步四处：详情页的 `mdxComponents`、`/[locale]/changelog/preview` 预览页、`release-notes-media` 的清单、README 的组件表。规范见 `release-page-compose` skill。
- frontmatter schema 只在 `config/content.schema.ts` 定义一份，`src/content.config.ts` 与脚本都从这里导入；改字段先改它。
- CI 在 `.github/workflows/`，job 统一 `working-directory: app`。PR 跑 `check.yml`；合进 `canary` / `main` 由 `deploy.yml` 分别部署测试 / 生产；`sync.yml` 定时抓取并开 PR 到 `main`。
- 数据源只接公开渠道。新增要凭证的内网来源前先确认：抓到的原文会原样进公开仓库。
