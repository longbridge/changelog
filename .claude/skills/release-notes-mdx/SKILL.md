---
name: release-notes-mdx
description: 把 releases/<product>/ 里抓到的 Release 原文改写成对外发布的 MDX 更新日志（zh-CN / zh-HK / en），并维护列表页展示的大版本总结。当用户要求整理更新日志、润色版本说明、生成对外 Release Notes、翻译版本文案、写大版本总结，或把 draft 状态的 MDX 转成 published 时使用。
---

# Release Notes 对外化改写

> 路径相对仓库根：原数据在 `releases/`，代码在 `app/`。`bun run` 命令在 `app/` 下执行。

把仓库里抓到的内部版本说明，改写成用户读得懂、可以对外发布的更新日志。

## 数据流位置

```
releases/<product>/<tag>.<locale>.md ← bun run fetch 抓取的原文（frontmatter 带 fetchedAt），只读
app/src/content/releases/zh-CN/...mdx    ← bun run transform 生成的初稿，本 skill 负责改写
app/src/content/releases/zh-HK|en/...    ← 由 zh-CN 定稿翻译而来
app/src/content/majors/<locale>/...mdx   ← 大版本总结，transform 只补空壳，内容本 skill 写
```

**不要修改抓取原文**（`releases/<product>/<tag>.<locale>.md`），重新 fetch 会覆盖。同目录下没有 frontmatter 的 `<version>.md` 是产品手写稿，走 `release-page-compose`。

这是公开仓库：改写稿里不能出现内部系统名、内部链接、人名、未对外的功能。

## 两层结构

站点按**大版本**组织：版本号前两段就是大版本（`0.20.1` → `0.20`，日期版本 `2026.09.11` → `2026.09`）。

- **列表页只展示大版本**：读者看到的是大版本的标题与摘要，来自 `app/src/content/majors/`
- **大版本页里按小版本分节**：每个小版本的标题与正文来自 `app/src/content/releases/`，侧边栏可以在小版本之间跳

所以一个版本要出现在站点上，两件事缺一不可：小版本 `published`，**且**它所属的大版本总结三语都 `published`。
`bun run check:assets` 会把只做了一半的挑出来。

## 三份参考

规则都在 `references/` 里，按用到的先后：

| 文件 | 什么时候读 |
| --- | --- |
| [`classification.md`](references/classification.md) | 动笔前。从原文里挑出哪些该写——含「已回退」核对、部署单元受众、六个判断问题 |
| [`brand-voice.md`](references/brand-voice.md) | 写的时候。不说黑话、不说废话、不写长句，以及标题怎么写 |
| [`examples.md`](references/examples.md) | 卡住的时候。本仓库真实的原文 → 发布稿对照 |

## 工作步骤

1. 确认范围：用户指定的产品 / 版本，或 `status: draft` 的全部条目。
2. **先确认原文是全的**：`github` 来源只抓得到有 Release 对象的 tag，没建 Release 的版本
   一条都看不到。对一次数，缺口从上游仓库的 git log 补——整理一整个月时尤其要做。做法见 `classification.md` 第〇节。
3. 读初稿 MDX，同时读 `releases/<product>/<tag>.<locale>.md` 的原文作为事实依据。
   **原文的三张表（已回退 / 影响的部署单元 / 共享包改动）不要跳过**，它们决定了哪些条目
   根本不该进入候选。原文里出现没见过的产品概念，回 git 搜来源——一条孤立的修复背后
   可能是一整个功能。
4. 按 `classification.md` 挑出该写的条目，按下面的规则改写正文，补齐 `summary` 与 `highlights`。
   **一个小版本只说 1–3 件事，大版本总结只说 3–4 件**，其余并进去或不写。
5. 把 `status` 从 `draft` 改成 `published`。
6. 翻译到其他语言：先确保 zh-CN 定稿，再生成 zh-HK 和 en，三语的 `highlights` 条数与顺序保持一致。
7. 写或更新这些版本所属的**大版本总结**（见下一节）。
8. 改完执行 `bun run check:assets` 与 `bun run build` 确认能过。

## 大版本总结

`app/src/content/majors/<locale>/<product>/<major>.mdx`，`transform` 只会补出空壳：

```yaml
title: Longbridge Pro 0.20   # 占位，要改
summary: ''
highlights: []
status: draft
```

要写的是**这一整个大版本给用户带来了什么**，不是把小版本的说明拼起来：

- `title` 一句话，规则与小版本标题相同
- `summary` 一句话，40 字以内，概括这个大版本最值得说的一到两件事
- `highlights` 2-4 条短语，是整个大版本的亮点，不是某个小版本的
- 正文可以留空——细节就在下面的小版本分节里，重复一遍只会让页面变长
- 三语齐了再把 `status` 改成 `published`

新的小版本并进一个已经发布的大版本时，回头看一眼总结还准不准：新增了值得说的功能就补进 `highlights`，
只是修复就不用动。

## 改写规则

**视角**：写用户能感知的变化，不写实现。

- ✗ `桌面端 view 切换支持 widget 不销毁` → ✓ `切换页面后返回，行情与自选状态保持不变`
- ✗ `体验优化 - Dropdown 控件优化` → ✓ `下拉菜单操作更顺滑`
- ✗ `多租户配置迁移到配置平台` → 与用户无关，删掉

**必须删除**：内部系统/服务名（配置平台、网关、某某 service）、代码符号（组件名、接口名、字段名）、人名与工号、内部链接、MR/issue 编号、纯重构与运维变更、尚未对外开放的功能。

**合并同类项**：原文常把一个功能拆成多条（如「资产交易支持美股做空」「资产支持美股做空」），合并成一条完整表述。

**分组**：正文用二级标题 `## 新增功能` / `## 体验优化` / `## 问题修复`，组内每条一个列表项。没有内容的分组直接删掉，不要留空标题。

**一个 tag 不一定值得一篇**：抓取是按发布 tag 走的，但读者看的是功能。一个 tag 里只有
一两条纯修复、凑不出标题时，把它标成 `status: skipped`，条目并进相邻那一版的 `## 问题修复`。
判断依据是「这一节值不值得占读者一屏」，不是「这个 tag 发没发」。

反过来，同一个功能被拆在几个 tag 里发（先出页面、再补筛选、最后修问题），写的时候合成一条完整
表述，挂在功能成型的那一版下面，不要按 tag 各写一遍。

被 `skipped` 的版本仍然留着文件和 frontmatter——它记录了这次发布确实存在，只是不单独成节。
`check:assets` 只核对 `published` 的条目，所以 `skipped` 的正文可以清空；但**三语要一起标
`skipped`**，只标一个语言会让另外两个变成「published 但缺语言」。

**长度**：每条一句话，20-40 字；`summary` 一句话概括本次版本（不超过 60 字）；`highlights` 取 2-5 条最值得说的，是用于列表页展示的短语（不超过 20 字），不带句号。

**原文为空时**：初稿里会有 `{/* 原始 Release 说明为空 */}` 注释。不要凭空编造功能，改为向用户确认，或把该条目标为 `status: skipped`（不会对外展示）。

## 补齐待翻译的条目

抓取和转换阶段**不做机器翻译**，翻译是这个 skill 的活——金融术语和港式用语机器换不对。

缺语言时脚本的行为分两种，取决于来源是不是对外口径：

| 来源 | 缺语言时 | `i18n:todo` 能看到吗 |
| --- | --- | --- |
| `repo-docs` / `appstore` / `release-api` | 用最接近的语言生成占位，标 `translation.status: pending` | 能 |
| `github` | **什么都不生成**，只有源语言一个文件 | 看不到 |

所以内部口径的来源（`github` Release）改写完之后，**另外两个语言的文件要自己建**：
按源语言的 frontmatter 复制一份，翻译正文与 `title` / `summary` / `highlights`，
三语一起转 `published`。漏建不会有任何提示，但站点的语言切换会回落到产品页。

```bash
bun run i18n:todo            # 列出待翻译条目，同时给出译文与原文路径
bun run i18n:todo --locale en
```

逐条处理：

1. 打开 `原文` 和 `译文` 两个文件，译文此刻还是原文语言的占位内容
2. 按下面的口径把正文、`title`、`summary`、`highlights` 全部翻成目标语言
3. **结构必须对齐**：媒体块的数量与位置、列表条数、分组标题一一对应，读者切语言时不该发现内容变多变少
4. 改 frontmatter：`translation.status` 改成 `done`；确认无误后 `status` 改成 `published`
5. `bun run build` 确认能过

`product` `version` `tag` `releasedAt` `platforms` `source` 这些字段在各语言之间必须完全一致——它们描述的是同一次发布。

## 多语言口径

| 语言 | 要求 |
| --- | --- |
| `zh-CN` | 简体，大陆用语。「登录」「信息」「网络」 |
| `zh-HK` | 繁体，港式用语。「登入」「資訊」「網絡」，不要用简转繁直译 |
| `en` | 简洁祈使/陈述句，句首大写，不加句号。术语跟随 Longbridge 官网英文版 |

金融术语保持三语一致：港股 / 港股 / HK stocks、美股 / 美股 / US stocks、做空 / 沽空 / Short selling、自选 / 自選 / Watchlist、持仓 / 持倉 / Positions。

## frontmatter 约定

只编辑这几个字段，其余（`product` `version` `tag` `releasedAt` `source`）由脚本维护，不要改：

```yaml
title: 这版改了什么，不要只写版本号
summary: 一句话概括，列表页与 SEO 描述都会用
highlights: [亮点短语, 亮点短语]
status: published   # draft 未完成 / published 对外可见 / skipped 不展示
```

`title` 是列表页扫读的唯一依据——版本号与日期站点会自己补在旁边，所以标题要写「这版
给用户带来了什么」，用产品化、用户能懂的话，像一句话而不是几个名词：

- ✗ `Longbridge Pro 0.20.0`（脚本占位，只说明是哪一版）
- ✗ `LongbridgeAI、交易、期权`（几个模块名并排，不是人话）
- ✓ `LongbridgeAI 正式上线`
- ✓ `图表里直接下单改单`
- ✓ `修复交易密码保护下的账户设置`（纯修复的版本就写修了什么）

写法：一句话，不超过 16 个字（英文 60 字符），不带句号，不写「优化」「体验提升」这种
没有信息量的词。一版动了好几块就挑最值得说的一到两件，剩下的交给 `summary`。

三语一一对应，各自用本地说法：`图表里直接下单改单` / `圖表內直接落單改單` /
`Trade directly from the chart`。

**有原文就照原文，不造词**。`title` / `summary` / `highlights` 是原文里没有、要我们补的字段，
最容易写成 AI 腔：

- 先从**该语言自己的原文**里取功能名与原句（加粗标签、条目开头那几个字），三语各取各的，
  不要拿中文自己翻英文——上游 en 叫 `Dream Memory` 就写 `Dream Memory`
- 原文没有现成说法时，按该市场的 changelog 惯例直白描述：大陆 / 香港用产品里的界面叫法，
  英文参照美国主流产品的 release notes（`New models and in-chat rewards` 这种名词短语），
  不写口号
- 禁止自己发明的修辞和概念：✗ `越用越懂你` ✗ `Traceable financial data` ✗ `AI writes collaborative documents`
  ——原文没这么说，读者也不会这么说
- curated 来源（`repo-docs` / `appstore` / `release-api`）尤其如此：正文是产品写的，
  补的字段要像同一个人写的

## MDX 能力

正文是 MDX，站点已注入一组组件，**直接写标签即可，不需要 import**：

```mdx
<Callout type="warning">本次升级后需要重新登录。</Callout>
```

`<Callout>` 的类型有 `info`（默认）、`warning`、`success`。

图片、视频、前后对比、分步演示、可交互 demo 属于富媒体增强，走 `release-notes-media` skill——
它定义了素材规范与克制原则。文案定稿之后再做那一步，不要在改写阶段插入不存在的素材路径。
