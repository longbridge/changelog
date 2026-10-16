---
name: release-notes-media
description: Add images, videos, before/after comparisons, step-by-step walkthroughs, interactive demos and other rich media and motion to finalized Release Notes MDX, so release notes can be seen and tried, not just read. Use when the user asks to enrich the changelog, add screenshots or demos, make a before/after comparison, add interactive animation, or make a text-only release note more vivid — e.g. 「加截图」「配个视频」「做前后对比」「加个演示」「让更新日志更生动」.
---

# Rich Media for Release Notes

> Paths are relative to the repo root: raw data lives in `releases/`, code in `app/`. Run `bun run` commands from `app/`.

A text-only changelog is understandable, but it doesn't show the *change*. This skill upgrades entries that have already been rewritten for the public into content readers can see and interact with.

## Prerequisite

Public-facing copy comes first, rich media second. If the MDX is still a `status: draft` fetched first draft, run `release-notes-mdx` to get the copy right, then come back here.

## Iron rule: never fabricate assets

**Never write an image or video path that doesn't exist.** The site will still build, but production will show a broken image.

When there are no assets, handle it in this order:

1. Ask the user for them: say which screen, which state, and whether light and dark versions are needed
2. If the user gives local files, upload them to our CDN following "Uploading assets" in `AGENTS.md`; if they give CDN links, use those directly. Only write full URLs in MDX
3. If you can't get them, keep it text-only and tell the user "these entries would be clearer with images"

There is exactly one exception: when the user explicitly asks for an effect preview, you may use the sample assets under `/release-assets/_example/`, and must state at hand-off that they are placeholders.

After editing, run `bun run check:assets`; it flags missing assets, missing alt text and external images.

## Components

These components are **used directly in MDX without import** (the detail page injects them).

| Component | Use for this kind of change | Key props |
| --- | --- | --- |
| `<Figure>` | New UI, new entry point, result screenshot | `src` `alt` (required) `caption` `width` `height` `zoom` `bare` |
| `<Compare>` | Redesigns, re-layouts, visual upgrades — anything with a "this is how it used to look" counterpart | `before` `after` `alt` (required) `beforeLabel` `afterLabel` `caption` |
| `<Video>` | Flows that only make sense when shown as an action; motion that is itself the selling point | `src` `label` (required) `poster` `caption` `autoplay` `loop` `controls` |
| `<Steps>` + `<Step>` | Setup, migration or enablement steps the user needs to follow | `<Steps title>`, one `<Step title>` per step |
| `<Demo>` | Features that can be tried directly in the web page | `src` `title` `poster` `ratio` `caption` |
| `<LinkPreview>` | Outbound links in the body: help center, website, docs | `href` `label` `poster` `ratio` `preview` `newTab` |
| `<Kbd>` | Keyboard shortcuts | `keys="⌘+K"` |
| `<Callout>` | Upgrade notes, breaking changes, time-limited notices | `type="info｜warning｜success"` |

Plain Markdown links in the body (`[text](url)`) are automatically wrapped in `<LinkPreview>`, so **don't change how you write links just to get a preview**;
write the tag by hand only when you need to set `poster` or `label`, or turn the preview off with `preview={false}`.

Order of preference: **if it can be a screenshot, don't just write words; if there's a before/after, use Compare; if it only makes sense in motion, use Video; if it can be tried, use Demo.**

## Restraint

This is a changelog, not a launch-event landing page.

- **At most 2-3** rich media blocks per version, usually on the entries that correspond to `highlights`
- One media item per change; don't give the same feature both a screenshot and a video
- Pure fixes, pure performance and pure backend changes get **no images**
- The bug-fixes group (`## 问题修复` in zh-CN) is basically all text
- Entrance animations for body paragraphs, lists and headings are automatic site-wide; nothing to do in MDX

## Asset guidelines

Assets don't go into the repo; upload them to our CDN and write the full URL in MDX. The upload tool always places files under `uploads/<random uuid>/<filename>` and the directory can't be customized, so filenames are what tell assets apart:

```
https://assets.lbkrs.com/uploads/<uuid>/quotes-list.png          screenshot
https://assets.lbkrs.com/uploads/<uuid>/quotes-list-dark.png     dark version (optional)
https://assets.lbkrs.com/uploads/<uuid>/quotes-before.png        comparison image
https://assets.lbkrs.com/uploads/<uuid>/drag-layout.mp4          demo video
```

- Screenshots 1600-2400px wide, png; photos as jpg/webp
- Single image < 500KB; video < 4MB, < 15 seconds, muted, loops cleanly
- Pass `width` / `height` (original pixels) to `<Figure>` to avoid layout shift while loading
- Crop screenshots to the relevant area; don't include the whole screen with unrelated windows and personal info
- **No real user data in screenshots**: accounts, phone numbers, real holdings and amounts must all be replaced with demo data

## Accessibility and performance

The components already handle lazy loading, play-on-enter-viewport, `prefers-reduced-motion`, keyboard support and the lightbox. You only need to make sure:

- `alt` describes **what change the image shows**, not just "screenshot"
- `<Video label>` describes what the demo is doing
- `caption` is the description for everyone, `alt` is the replacement for people who can't see the image; don't make them the same sentence

## Three locales

Assets are shared, text is translated: `alt`, `caption`, `<Steps>` titles and body, and `<Callout>` content each need a version for `zh-CN` / `zh-HK` / `en`. Keep the number and position of media blocks identical across the three locales, so readers switching language don't see content appear or disappear.

## Full example

A zh-CN page (the copy stays in Chinese; the zh-HK and en files mirror the same blocks with translated text):

```mdx
## 新增功能

- 自选列表支持直接查看当日走势

<Compare
  before="https://assets.lbkrs.com/uploads/<uuid>/watchlist-before.png"
  after="https://assets.lbkrs.com/uploads/<uuid>/watchlist-after.png"
  alt="自选列表从纯数字改为带走势图的卡片"
  caption="拖动分隔线对比改版前后"
  width={1600}
  height={1000}
/>

- 支持拖拽调整多屏布局

<Video
  src="https://assets.lbkrs.com/uploads/<uuid>/drag-layout.mp4"
  poster="https://assets.lbkrs.com/uploads/<uuid>/drag-layout-poster.jpg"
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

## Wrap-up

1. `bun run check:assets` — assets and descriptions
2. `bun run build` — the build passes
3. Take a quick local look: `bun run dev`, confirm images aren't broken, videos play, comparison sliders drag, and steps switch
