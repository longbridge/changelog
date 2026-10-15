---
name: release-page-compose
description: 把产品交来的一份 release md 装配成完整的对外更新日志页面——选版式、套骨架、配图、出三语、生成预览。当用户说「产品给了一份更新说明」「把这版做成 release page」「按模板排一下这个版本」「releases/ 里的内容装配一下」，或需要为新交互扩展自定义组件时使用。
---

# Release Page 装配

> 路径相对仓库根：原数据在 `releases/`，代码在 `app/`。`bun run` 命令在 `app/` 下执行。

产品交一份 md，这里把它变成能对外发布的页面。核心是**照配方填空**，不是每次重新设计版式。

## 输入

产品把文件放在 `releases/<product>/<version>.md`，格式见仓库根 `README.md` 的「模板」一节。

拿到的东西往往不完整，按这个顺序处理，**不要卡在第一步等齐所有信息**：

| 缺什么 | 怎么办 |
| --- | --- |
| 版本号、日期、平台 | 去同目录 `releases/<product>/` 找同版本的抓取原文（`<tag>.<locale>.md`），或问 |
| 每条变更的用户价值 | 先按原文装配，把看不懂的条目列出来一次性问清 |
| 素材 | 先出纯文字版，在预览报告里标出「这几条配图会更清楚」 |
| 繁体/英文 | 先出 `zh-CN` 并保持 `status: draft`，翻译完再一起转 published |

产品写的通常已经是用户口径，但仍要过一遍
[`release-notes-mdx/references/brand-voice.md`](../release-notes-mdx/references/brand-voice.md)：
删内部系统名、去掉「优化/提升/全新」这类没有信息量的词、长句断开、每条一句话。
产品自己写的稿子最常见的问题是营销 hype 和公司黑话，工程稿则是实现细节泄漏——两边都要收。
拿不准怎么改，翻 [`examples.md`](../release-notes-mdx/references/examples.md) 的真实对照。

## 五步

1. **归位**：读产品的 `releases/<product>/<version>.md`；同目录如果有同版本的抓取原文，两边对照，以产品的说法为准，用抓取原文补漏。
2. **定版式**：按下面的决策表选一个配方。
3. **填空**：复制配方骨架，逐项填。frontmatter 里 `product` `version` `tag` `releasedAt` `source` 按抓取原文或产品提供的信息填准；纯手写稿的 `source` 填 `provider: manual`、`repo: releases/<product>/<version>.md`、`url: https://longbridge.com`。
4. **配媒体**：走 `release-notes-media` skill。没素材就停在纯文字，别编路径。
5. **验收**：
   ```bash
   bun run check:assets     # 素材与 alt
   bun run preview:report   # 这次改了哪些版本、缺什么
   bun run preview:build    # 带草稿构建，本地看 app/dist/preview/index.html
   ```

## 决策表

| 这一版的形态 | 用配方 |
| --- | --- |
| 一个主打功能，其他都是陪衬 | A 重磅版 |
| 三条以上并列的新功能/优化 | B 综合版 |
| 界面改版、交互重排 | C 改版版 |
| 只有修复、性能、兼容性 | D 维护版 |
| 用户必须做点什么才能继续用 | E 变更版（可与 A/B/C 叠加，Callout 置顶） |

## 配方

下面的骨架可以直接复制。`highlights` 是列表页展示用的短语，不超过 20 字、不带句号。

### A 重磅版

```mdx
---
product: longbridge-desktop
version: '2.4.0'
tag: v2.4.0
locale: zh-CN
title: Longbridge 桌面端 2.4.0
summary: 一句话说清这版的主角，不超过 60 字
highlights:
  - 自选列表直接看走势
  - 多屏布局可拖拽
releasedAt: 2025-08-20T02:30:00.000Z
platforms: [macOS, Windows]
status: draft
source:
  provider: manual
  repo: releases/longbridge-desktop/2.4.0.md
  url: https://longbridge.com
---

<Figure src="..." alt="..." caption="..." width={1600} height={1000} />

主角功能的两三句话：解决了什么问题，用户现在可以怎么做。

<Steps title="怎么用">
  <Step title="第一步">…</Step>
  <Step title="第二步">…</Step>
</Steps>

## 新增功能

- 其余新增，一条一句

## 体验优化

- …

## 问题修复

- …
```

### B 综合版

```mdx
---
（frontmatter 同上，highlights 取 3-5 条）
---

## 新增功能

### 自选列表支持看当日走势

一句话说明价值。

<Figure src="..." alt="..." width={1600} height={1000} />

### 选股器支持自定义指标

一句话说明价值。

## 体验优化

- 逐条，一句一条，不配图

## 问题修复

- …
```

要点：只给最值得说的一到两个小节配图，其余保持列表。

### C 改版版

```mdx
<Compare
  before="https://assets.lbkrs.com/release-notes/<product>/<version>/x-before.png"
  after="https://assets.lbkrs.com/release-notes/<product>/<version>/x-after.png"
  alt="说明改了什么"
  caption="拖动分隔线对比改版前后"
/>

两三句话讲清为什么改、用户能感知到什么。

## 这次调整了什么

- 变化点，一条一句

<Callout type="info">原来的入口现在在「更多」菜单里。</Callout>

## 问题修复

- …
```

### D 维护版

```mdx
---
（frontmatter 同上；highlights 可以留空）
summary: 修复了若干影响使用的问题，建议更新
---

## 问题修复

- 一条一句，只写用户能感知的
```

维护版**不配任何图**。这类版本产品经常给一长串内部修复，挑出用户能感知的那几条，其余合并成「其他稳定性修复」。

### E 变更版

```mdx
<Callout type="warning">
本次升级后需要重新登录，自定义布局要重新保存一次。
</Callout>

## 需要你做什么

<Steps title="迁移步骤">
  <Step title="升级前">导出现有布局。</Step>
  <Step title="升级后">在「窗口 - 布局」里重新导入。</Step>
</Steps>

## 影响范围

- 谁会受影响、什么时候生效

（后面接 A/B/C 的正文结构）
```

## 三语

`zh-CN` 定稿后再翻。三个语言的**媒体块数量、位置、highlights 条数必须一致**，读者切语言时不该发现内容变多变少。术语表见 `release-notes-mdx`。

## 自定义组件

产品想要现成组件做不到的交互时，按这三级走，不要一上来就改公共组件：

**一级 · 一次性**：在这一篇 MDX 里直接写 HTML + 内联 `<style>`。适合只此一版会用的排版。不要在 MDX 里写 `<script>`——脚本要跟着组件走，否则下次没人知道它在哪。

**二级 · 试验组件**：`src/components/release/custom/<Name>.astro`，在 MDX 里 `import Name from '@components/release/custom/Name.astro'` 使用。这一层不进全局注入，改坏了只影响用到它的那几篇。

**三级 · 沉淀**：同一个交互被三个以上版本用过、形态稳定了，移到 `src/components/release/`，并同步四处：
1. 详情页 `src/pages/[locale]/[product]/[version].astro` 的 `mdxComponents` 映射（加了才能免 import）
2. `/[locale]/changelog/preview` 预览页加一节，带效果和写法
3. `release-notes-media` skill 的组件清单表
4. README 的组件表

### 写组件的硬性要求

- **props 里描述性文字必填**：图片 `alt`、视频 `label`。`scripts/check-assets.ts` 会检查，新组件要顺手把检查规则加进去。
- **动效要能关**：所有动画在 `prefers-reduced-motion: reduce` 下退化为无动画。
- **没有 JS 也要能读**：内容默认可见，脚本只做增强（参考 `Steps`：无脚本时步骤平铺）。
- **脚本用委托 + `astro:page-load`**：站点开了客户端路由，组件脚本只执行一次，直接绑在节点上会在换页后失效；用 `dataset` 标记防重复初始化。
- **动态创建的元素要用全局样式**：Astro 的 scoped 样式靠编译期属性实现，JS 新建的元素拿不到，这类样式写进 `src/styles/global.css`。
- **颜色走 token**：用 `var(--accent)`、`var(--color-ink)` 这些变量，不要写死色值，否则暗色模式和产品主题色都会失效。

## 验收清单

- [ ] `bun run check` 与 `bun run check:assets` 通过
- [ ] `bun run preview:report` 里这一版没有红色阻断项
- [ ] 三语齐全且结构一致；未翻完的保持 `status: draft`
- [ ] 本地 `bun run dev` 打开这一版：图没裂、视频能播、对比能拖、步骤能切
- [ ] 定稿后把三语的 `status` 一起改成 `published`
