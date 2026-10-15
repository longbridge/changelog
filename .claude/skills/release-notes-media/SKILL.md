---
name: release-notes-media
description: 给已经定稿的 Release Notes MDX 加上图片、视频、前后对比、分步演示、可交互 demo 等富媒体与动效，让版本说明可看可玩。当用户要求丰富更新日志、加截图或演示、做前后对比、加交互动画、把纯文字的版本说明做得更生动时使用。
---

# Release Notes 富媒体增强

> 路径相对仓库根：原数据在 `releases/`，代码在 `app/`。`bun run` 命令在 `app/` 下执行。

纯文字的更新日志能读懂，但读不出"变化"。这个 skill 负责把已经改写成对外口径的条目，升级成看得见、点得动的内容。

## 前置

先有对外文案，再谈富媒体。如果 MDX 还是 `status: draft` 的抓取初稿，先走 `release-notes-mdx` 把文案改对，再回到这里。

## 铁律：不要编造素材

**绝不写一个不存在的图片或视频路径。** 站点会构建通过，但线上就是一个裂图。

没有素材时，按这个顺序处理：

1. 问用户要：说明需要哪一屏、什么状态、明暗两版要不要
2. 拿到图后请用户传到自家 CDN，你在 MDX 里写返回的完整 URL
3. 要不到就保持纯文字，并告诉用户"这几条如果配图会更清楚"

只有一种例外：用户明确要求做效果预览时，可以用 `/release-assets/_example/` 下的示例素材，并在交付时说明这是占位。

改完执行 `bun run check:assets`，它会挑出不存在的素材、缺失的 alt 与外链图片。

## 组件清单

这些组件在 MDX 里**直接使用，不需要 import**（详情页已经注入）。

| 组件 | 用在什么变化上 | 关键属性 |
| --- | --- | --- |
| `<Figure>` | 新界面、新入口、结果截图 | `src` `alt`(必填) `caption` `width` `height` `zoom` `bare` |
| `<Compare>` | 改版、重排、视觉升级——有"以前长这样"的对照 | `before` `after` `alt`(必填) `beforeLabel` `afterLabel` `caption` |
| `<Video>` | 一段操作才讲得清的流程、动效本身就是卖点 | `src` `label`(必填) `poster` `caption` `autoplay` `loop` `controls` |
| `<Steps>` + `<Step>` | 用户需要跟着做的配置、迁移、开启步骤 | `<Steps title>`，每个 `<Step title>` 一步 |
| `<Demo>` | 能在网页里直接玩的功能 | `src` `title` `poster` `ratio` `caption` |
| `<LinkPreview>` | 正文里要跳出去的链接：帮助中心、官网、文档 | `href` `label` `poster` `ratio` `preview` `newTab` |
| `<Kbd>` | 快捷键 | `keys="⌘+K"` |
| `<Callout>` | 升级须知、破坏性变更、限时说明 | `type="info｜warning｜success"` |

正文里的普通 Markdown 链接（`[文案](url)`）会自动套上 `<LinkPreview>`，**不用为了预览去改写法**；
只有要指定 `poster`、`label` 或用 `preview={false}` 关掉预览时才手写这个标签。

选择顺序：**能截图就别只写字，有对照就用 Compare，要动起来才说得清就用 Video，能上手就用 Demo。**

## 克制原则

这是更新日志，不是发布会落地页。

- 每个版本**最多 2-3 个**富媒体块，通常配在 `highlights` 对应的那几条上
- 一条变更配一个媒体，不要同一功能又截图又视频
- 纯修复、纯性能、纯后台改动**不配图**
- `## 问题修复` 那一组基本都是纯文字
- 正文段落、列表、标题的进场动画是全站自动的，不需要在 MDX 里做任何事

## 素材规范

素材不进仓库，传到自家 CDN 后在 MDX 里写完整 URL。建议按产品与版本分目录：

```
https://assets.lbkrs.com/release-notes/<product>/<version>/
  quotes-list.png          截图
  quotes-list-dark.png     暗色版（可选）
  quotes-before.png        对比图
  quotes-after.png
  drag-layout.mp4          演示视频
  drag-layout.webm         同名 webm 会被自动当作备选源
  drag-layout-poster.jpg   视频封面
```

- 截图宽度 1600-2400px，png；照片类用 jpg/webp
- 单张图 < 500KB，视频 < 4MB、时长 < 15 秒、静音、循环得上
- 给 `<Figure>` 传 `width` / `height`（原始像素），避免加载时页面跳动
- 截图裁到相关区域，不要整屏带着无关的窗口和个人信息
- **截图里不能有真实用户信息**：账号、手机号、真实持仓与金额一律替换成演示数据

## 无障碍与性能

组件已经处理好懒加载、进入视口才播放、`prefers-reduced-motion`、键盘可用与灯箱。你只需要保证：

- `alt` 写这张图**说明了什么变化**，不是"截图"两个字
- `<Video label>` 写这段演示在做什么
- `caption` 是给所有人看的说明，`alt` 是给看不见图的人的替代，两者不要写成同一句

## 三语

素材共用，文字要翻：`alt` `caption` `<Steps>` 的标题与正文、`<Callout>` 内容都要按 `zh-CN` / `zh-HK` / `en` 各写一份。三个语言版本的媒体块数量和位置保持一致，读者切换语言时不会发现内容变多变少。

## 完整示例

```mdx
## 新增功能

- 自选列表支持直接查看当日走势

<Compare
  before="https://assets.lbkrs.com/release-notes/longbridge-pro/2.4.0/watchlist-before.png"
  after="https://assets.lbkrs.com/release-notes/longbridge-pro/2.4.0/watchlist-after.png"
  alt="自选列表从纯数字改为带走势图的卡片"
  caption="拖动分隔线对比改版前后"
  width={1600}
  height={1000}
/>

- 支持拖拽调整多屏布局

<Video
  src="https://assets.lbkrs.com/release-notes/longbridge-pro/2.4.0/drag-layout.mp4"
  poster="https://assets.lbkrs.com/release-notes/longbridge-pro/2.4.0/drag-layout-poster.jpg"
  label="把行情窗口拖到第二块屏幕并自动吸附对齐"
  caption="窗口会自动吸附到网格"
/>

<Steps title="启用新版布局">
  <Step title="打开偏好设置">
    菜单栏选择「偏好设置」，或按 <Kbd keys="⌘+," />。
  </Step>
  <Step title="切换布局模式">
    在「窗口」分页里选择「网格布局」。
  </Step>
</Steps>

<Callout type="warning">升级后原有的自定义布局需要重新保存一次。</Callout>
```

## 收尾

1. `bun run check:assets` —— 素材与描述
2. `bun run build` —— 构建能过
3. 本地看一眼：`bun run dev`，确认图没裂、视频能播、对比滑块能拖、步骤能切
