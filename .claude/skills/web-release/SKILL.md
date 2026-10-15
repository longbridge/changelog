---
name: web-release
description: 在这个仓库里从零写一个对外 Release Page，并在本地预览里看到它、最后经 canary 发上线的完整路径。当用户说「帮我写一个 release page」「加一个版本的更新日志」「这版更新怎么发到 release 站点」「我写完了怎么预览」「预览里看不到我刚写的版本」，或者是第一次接触这个仓库、不知道该从哪个文件动手时使用。
---

# 写一个 Release Page 并发上线

这是入口 skill：一个 agent 在这个仓库里从零做出一个版本页面、看到它、把它发出去，需要知道的全部路径。
具体怎么遣词、怎么配图、怎么排版另有三个 skill，这里只负责把你送到正确的那一个，并保证不漏步骤。

## 先分流

| 手上有什么 | 去哪 |
| --- | --- |
| 产品给了一份 md（或放进了 `releases/<product>/<version>.md`） | 先读 `release-page-compose`（版式配方），再回这里走第 4 步起 |
| `bun run fetch` 抓下来的内部原文 / `status: draft` 的初稿 | 先读 `release-notes-mdx`（对外口径与三语），再回这里走第 4 步起 |
| 文案已经定稿，要配图配视频 | 读 `release-notes-media` |
| 什么都没有，从零手写一个版本 | 就在这里，从第 1 步开始 |

不管走哪条路，`release-notes-mdx/references/` 下的三份规则都适用：

| 文件 | 管什么 |
| --- | --- |
| [`classification.md`](../release-notes-mdx/references/classification.md) | 哪些改动该写进去（有上游原文时必读） |
| [`brand-voice.md`](../release-notes-mdx/references/brand-voice.md) | 不说黑话、不说废话、不写长句，标题怎么写 |
| [`examples.md`](../release-notes-mdx/references/examples.md) | 本仓库真实的原文 → 发布稿对照 |

返工基本都出在这三份上，动笔前先过一遍。

三个 skill 都只管「写成什么样」。**从哪写、写完怎么看、怎么发出去，是这一篇的事。**

## 0 · 环境与红线

仓库根只有原数据 `releases/` 和代码 `app/`。**下文的 `bun run` / `make` 命令都在 `app/` 下执行**，文件路径都相对仓库根。

```bash
cd app && bun install
```

写之前先确认这几条，踩了要返工：

- **不要手改抓取原文** `releases/<product>/<tag>.<locale>.md`（frontmatter 带 `fetchedAt`），重新 `bun run fetch` 会原样覆盖。
- **这是公开仓库**：不写内部系统名、内部链接、人名、未发布的功能。
- **不要写不存在的素材路径。** 没有截图就保持纯文字并向用户索要，别编一个看起来合理的 URL。
- 正文的图片视频一律用自家 CDN 的完整 URL（`assets.lbkrs.com` / `assets.lbctrl.com` / `pub.lbkrs.com`），素材不进仓库。
- `product` `version` `tag` `releasedAt` `source` 这几个 frontmatter 字段描述的是同一次发布，三语必须完全一致。

## 1 · 定位：要动哪六个文件

站点分两层：**列表页只展示大版本，小版本是大版本页里的一节，没有独立 URL。**
大版本 = 版本号前两段（`0.20.1` → `0.20`，日期版本 `2026.09.14` → `2026.09`）。

所以一个版本要出现在站点上，**六个文件缺一不可**（三语 × 两层）：

```
app/src/content/releases/{zh-CN,zh-HK,en}/<product>/<tag>.mdx    这一版做了什么
app/src/content/majors/{zh-CN,zh-HK,en}/<product>/<major>.mdx     这一整个大版本带来了什么
```

- `<product>` 取 `app/config/products.config.ts` 里的 `id`，不要自己编。仓库里没有这个产品时先加配置，只改那个文件。
- `<tag>` 就是 URL 锚点，也就是文件名。历史上用过 `v0.20.1` 与 `release-2026.08.14` 两种风格，**跟同产品已有文件保持一致**，别混。
- 大版本总结如果已经存在（同月/同大版本之前发过版），不要新建，去补它。

先确认落点再动笔：

```bash
ls app/src/content/releases/zh-CN/<product>/     # 已有版本的命名风格
ls app/src/content/majors/zh-CN/<product>/       # 这个大版本的总结在不在
```

## 2 · frontmatter 怎么填

小版本 `app/src/content/releases/<locale>/<product>/<tag>.mdx`：

| 字段 | 从哪来 |
| --- | --- |
| `product` `version` `tag` | 上游 tag / 产品给的版本号。`version` 是展示用的版本号，`tag` 是文件名 |
| `locale` | 必须与所在目录一致 |
| `releasedAt` | ISO 时间。有同版本的抓取原文 `releases/<product>/<tag>.<locale>.md` 就照抄，没有就用产品给的发布日期 |
| `platforms` | 取 `products.config.ts` 里该来源的 `platforms`，如 `[Web]` |
| `title` | 这版给用户带来了什么，一句话、不超过 16 字、不带句号。**不要只写版本号** |
| `summary` | 一句话概括，不超过 60 字，列表页与 SEO 都会用 |
| `highlights` | 2-5 条短语，每条不超过 20 字、不带句号。这是人写的亮点，**不要塞模块名** |
| `status` | 先 `draft`，三语齐了再一起转 `published` |
| `source` | 溯源信息，页面上不展示，但 schema 必填 |

`source` 有上游就照抄抓取原文里的那份；**纯手写、没有上游 tag 时**这样填：

```yaml
source:
  provider: manual
  repo: releases/<product>/<version>.md   # 原始说明在哪，没有就写产品 id
  url: https://longbridge.com               # 必须是合法 URL
```

大版本总结 `app/src/content/majors/<locale>/<product>/<major>.mdx` 只有 frontmatter，正文可以留空
（细节就在下面的小版本分节里，重复一遍只会让页面变长）：

```yaml
product: longbridge-web
major: '2026.09'
locale: zh-CN
title: 一句话，规则同小版本
summary: 一句话，40 字以内，概括这个大版本最值得说的一到两件事
highlights:              # 2-4 条，是整个大版本的亮点，不是某个小版本的
  - 亮点短语
status: draft
```

新的小版本并进一个**已经发布**的大版本时，回头看一眼总结还准不准：新增了值得说的功能就补进 `highlights`，只是修复就不用动。

## 3 · 正文能写什么

正文是 MDX，这些组件**直接写标签、不用 import**：`<Figure>` `<Compare>` `<Video>` `<Steps>`+`<Step>` `<Demo>` `<LinkPreview>` `<Kbd>` `<Callout>`。
普通 Markdown 链接会自动套上 `<LinkPreview>`，不用为了预览改写法。

**每个组件长什么样、属性怎么写，站点自带一页预览**——写之前去看一眼，比猜属性名快：

```bash
bun run dev
open http://localhost:4321/zh-CN/changelog/preview
```

分组用 `## 新增功能` / `## 体验优化` / `## 问题修复`，没内容的分组直接删掉。
每条一句话、20-40 字，只写用户能感知的变化，措辞按 brand-voice 那三条。选版式看 `release-page-compose`，配图克制原则看 `release-notes-media`。

## 4 · 校验

```bash
bun run check          # 类型与 frontmatter schema
bun run check:assets   # 素材在不在、alt 全不全、三语齐不齐、大版本总结跟没跟上
```

`check:assets` 会把「只做了一半」的挑出来：小版本 `published` 但某个语言缺文件、或大版本总结还没 `published`——这两种情况页面在线上都是不出现的。

## 5 · 预览

两种，按场景选。**没有线上预览链接**：合并前都在本地看，合并后才部署到对应环境。

| 场景 | 怎么做 |
| --- | --- |
| 边写边看 | `bun run dev`，自动显示草稿。Astro 7 的 dev 是守护进程：`bunx astro dev status` / `stop` / `logs` |
| 写完自查 / 给产品验收 | `bun run preview:build`，然后打开它最后打印的 `app/dist/preview/index.html` |

`app/dist/preview/index.html` 是一张索引：本次改了哪些版本、三语齐不齐、素材缺不缺、哪几条还是草稿，
每个语言标签直接链到大版本页里这一版的锚点。它统计的是「工作区里所有改动过的版本」，**没 commit、没 track 的新文件也算**，刚写完就能跑。

直接看某一版的地址长这样（小版本是锚点，不是独立页面）：

```
http://localhost:4321/<locale>/changelog/<product>/<major>/#<tag>
例：http://localhost:4321/zh-CN/changelog/longbridge-web/2026.09/#release-2026.09.14
```

### 预览里找不到刚写的版本？

按这个顺序查，命中率从高到低：

| 现象 | 原因 | 怎么办 |
| --- | --- | --- |
| 整版不见，列表页也没有 | **缺大版本总结**。小版本挂在大版本页下，没有 `app/src/content/majors/<locale>/<product>/<major>.mdx` 就整条不渲染 | 建那个文件。`bun run preview:report` 会把它报成阻断项 |
| 本地看得到，`bun run build` 之后没了 | `status` 还是 `draft`，或大版本总结还是 `draft` | 两层都转 `published` |
| 怎么都不出现 | `status: skipped` | 这个状态是「永不展示」，改掉 |
| 切换语言跳回了产品页 | 那个语言的文件没建 | 三语补齐，`bun run i18n:todo` 能列出待办 |
| 点预览索引上的链接 404 | dist 里还没有站点产物 | 跑 `bun run preview:build`，不要只跑 `preview:report` |
| 图是裂的 | 素材路径不存在 | `bun run check:assets`，然后向用户要真实素材，**不要改成另一个猜的路径** |

## 6 · 提交与上线

**分支即环境，合并就部署**：合进 `canary` 上测试环境（longbridge.xyz），合进 `main` 上生产（longbridge.com）。没有 tag，也没有 PR 预览。

测试环境与生产是同一份构建，只展示 `published`——提 PR 前，小版本和大版本总结三语一起转 `published`。

```bash
git switch -c release/<product>-<version> origin/main
git add app/src/content releases       # 在仓库根执行，只提内容，dist/ 不进仓库
git commit -m "feat(<product>): <version> 更新日志"
git push -u origin HEAD
gh pr create --base canary --title "feat(<product>): <version> 更新日志"
```

PR 的 check（`check` + `check:assets`）通过后合并，deploy 跑完在 `longbridge.xyz/<locale>/changelog/...` 验收。
有问题就继续往这个分支推，再合一次 canary。验收通过后，**用同一个分支**再开一条到 `main` 的 PR：

```bash
gh pr create --base main --title "feat(<product>): <version> 更新日志"
```

不要把 `canary` 合进 `main`：上面可能有别人还没验收的版本。

## 交付前清单

- [ ] 这一版说的事不超过 3 件（大版本总结不超过 4 件）
- [ ] 这一版值得单独成节（只有一两条纯修复的，三语一起标 `skipped` 并入相邻版本）
- [ ] 六个文件齐了：三语小版本 + 三语大版本总结
- [ ] 通读一遍没有黑话、没有废话、没有超过 30 字的句子，标题回答了「用户现在能做什么」
- [ ] `bun run check` 与 `bun run check:assets` 通过
- [ ] `bun run preview:build` 里这一版**没有红色阻断项**
- [ ] 打开预览索引，逐个语言点进去确认页面真的在、图没裂、`title` 不是版本号
- [ ] 三语结构一致：媒体块数量与位置、列表条数、`highlights` 条数一一对应
- [ ] 定稿后小版本与大版本总结的 `status` **一起**转 `published`
- [ ] 没有编造任何素材路径
- [ ] 没有内部系统名、内部链接、人名（公开仓库）
