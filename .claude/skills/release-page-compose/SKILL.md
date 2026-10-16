---
name: release-page-compose
description: Turn a release md handed over by a product manager into a complete public changelog page — pick a layout, fill the skeleton, add media, produce all three locales, and generate the preview. Use when the user says things like 「产品给了一份更新说明」「把这版做成 release page」「按模板排一下这个版本」「releases/ 里的内容装配一下」 ("product sent release notes", "turn this version into a release page", "lay out this version from the template"), or when a new interaction needs a custom component.
---

# Composing a Release Page

> Paths are relative to the repo root: source data lives in `releases/`, code in `app/`. Run `bun run` commands inside `app/`.

The product manager hands over one md file; this skill turns it into a page ready to publish. The core idea is **fill in a recipe**, not redesign the layout every time.

## Input

The product manager puts the file at `releases/<product>/<version>.md`. The format is described in "Release notes template" in the repo-root `CONTRIBUTING.md`:

```
Product: longbridge-pro
Version: 1.1.0
Release date: 2026-10-20
Platforms: macOS, Windows

## Key message
## New
## Improved
## Fixed
## Heads-up
## Assets
```

No frontmatter. Content may be in any language. Legacy Chinese keys are still accepted: `产品` / `版本` / `发布日期` / `平台` and sections `这一版最想让用户知道的` / `新增` / `优化` / `修复` / `需要用户注意的` / `素材`.

How the sections map onto the page:

| Template section | Goes into |
| --- | --- |
| Product / Version / Release date / Platforms | frontmatter `product` / `version` + `tag` / `releasedAt` / `platforms` |
| Key message | `summary` and `highlights` (and the lead paragraph for recipe A) |
| New / Improved / Fixed | the three MDX groups `## 新增功能` / `## 体验优化` / `## 问题修复` (zh-CN headings; translate them in zh-HK / en) |
| Heads-up | a `<Callout>` (recipe E when users must take action) |
| Assets | media, via `release-notes-media` |

What you receive is often incomplete. Handle it in this order — **don't block on step one waiting for everything**:

| Missing | What to do |
| --- | --- |
| Version, date, platforms | Look in the same directory `releases/<product>/` for the fetched source of the same version (`<tag>.<locale>.md`), or ask |
| User value of each change | Compose from the source as-is first, list the items you don't understand, and ask about them all at once |
| Assets | Ship a text-only version first; in the preview report, flag "these items would be clearer with an image" |
| Traditional Chinese / English | Do `zh-CN` first and keep `status: draft`; switch all locales to published together once translated |

Product managers usually already write from the user's perspective, but still run it through
[`release-notes-mdx/references/brand-voice.md`](../release-notes-mdx/references/brand-voice.md):
remove internal system names, drop empty words like "optimized / improved / all-new" (「优化/提升/全新」), break up long sentences, one sentence per item.
The most common problems in product-written drafts are marketing hype and corporate jargon; in engineering drafts it's leaked implementation detail — fix both.
If unsure how to rewrite something, check the real before/after pairs in [`examples.md`](../release-notes-mdx/references/examples.md).

## Five steps

1. **Locate**: read the product manager's `releases/<product>/<version>.md`. If the same directory has a fetched source for the same version, compare the two: the product manager's wording wins, the fetched source fills gaps.
2. **Pick a layout**: choose one recipe from the decision table below.
3. **Fill in**: copy the recipe skeleton and fill each item. Fill frontmatter `product` `version` `tag` `releasedAt` `source` accurately from the fetched source or the product manager's info; for a purely handwritten draft, `source` is `provider: manual`, `repo: releases/<product>/<version>.md`, `url: https://longbridge.com`.
4. **Add media**: go through the `release-notes-media` skill. No assets means stay text-only — never invent paths.
5. **Verify**:
   ```bash
   bun run check:assets     # assets and alt text
   bun run preview:report   # which versions changed this time, what's missing
   bun run preview:build    # build including drafts; open app/dist/preview/index.html locally
   ```

## Decision table

| Shape of this release | Recipe |
| --- | --- |
| One headline feature, everything else is supporting | A Headline |
| Three or more parallel new features / improvements | B Roundup |
| UI redesign, interaction rearranged | C Redesign |
| Only fixes, performance, compatibility | D Maintenance |
| Users must do something to keep using it | E Breaking change (can stack with A/B/C, Callout at the top) |

## Recipes

The skeletons below can be copied directly. They show zh-CN output, so the sample copy (headings, titles, highlights, step labels, callouts) stays in Chinese. `highlights` are short phrases shown on the list page: at most 20 characters, no trailing period.

### A Headline

```mdx
---
product: longbridge-desktop
version: '2.4.0'
tag: v2.4.0
locale: zh-CN
title: Longbridge 桌面端 2.4.0
summary: (one sentence naming this release's headline feature, max 60 characters)
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

(Two or three sentences on the headline feature: what problem it solves, what users can do now.)

<Steps title="怎么用">
  <Step title="第一步">…</Step>
  <Step title="第二步">…</Step>
</Steps>

## 新增功能

- (other new features, one sentence each)

## 体验优化

- …

## 问题修复

- …
```

### B Roundup

```mdx
---
(frontmatter same as above; 3-5 highlights)
---

## 新增功能

### 自选列表支持看当日走势

(One sentence on the value.)

<Figure src="..." alt="..." width={1600} height={1000} />

### 选股器支持自定义指标

(One sentence on the value.)

## 体验优化

- (one sentence per item, no images)

## 问题修复

- …
```

Key point: only give images to the one or two subsections most worth showing; keep the rest as lists.

### C Redesign

```mdx
<Compare
  before="https://assets.lbkrs.com/uploads/<uuid>/x-before.png"
  after="https://assets.lbkrs.com/uploads/<uuid>/x-after.png"
  alt="说明改了什么"
  caption="拖动分隔线对比改版前后"
/>

(Two or three sentences on why it changed and what users will notice.)

## 这次调整了什么

- (one change per item, one sentence each)

<Callout type="info">原来的入口现在在「更多」菜单里。</Callout>

## 问题修复

- …
```

### D Maintenance

```mdx
---
(frontmatter same as above; highlights may be empty)
summary: 修复了若干影响使用的问题，建议更新
---

## 问题修复

- (one sentence per item, only what users can notice)
```

Maintenance releases get **no images at all**. Product managers often hand over a long list of internal fixes for these; pick the few that users can notice and merge the rest into "other stability fixes" (「其他稳定性修复」).

### E Breaking change

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

- (who is affected, when it takes effect)

(Then continue with the body structure of A/B/C.)
```

## Three locales

Translate only after `zh-CN` is final. Across the three locales, **the number and position of media blocks and the number of highlights must match** — readers switching languages should never find content appearing or disappearing. The glossary lives in `release-notes-mdx`.

## Custom components

When the product manager wants an interaction the existing components can't do, go through these three levels — don't start by changing shared components:

**Level 1 · One-off**: write HTML + inline `<style>` directly in this one MDX file. Suitable for a layout only this release will use. Don't write `<script>` in MDX — scripts must live with a component, or next time nobody will know where it is.

**Level 2 · Experimental component**: `src/components/release/custom/<Name>.astro`, used in MDX via `import Name from '@components/release/custom/Name.astro'`. This level is not globally injected; if it breaks, only the pages using it are affected.

**Level 3 · Promote**: once the same interaction has been used by three or more releases and its shape is stable, move it to `src/components/release/` and update all four places:
1. The `mdxComponents` mapping in the detail page `src/pages/[locale]/[product]/[version].astro` (required for import-free use)
2. Add a section to the `/[locale]/changelog/preview` page, showing the result and the usage
3. The component list table in the `release-notes-media` skill
4. The component table in `app/README.md`

### Hard requirements for components

- **Descriptive text props are required**: image `alt`, video `label`. `scripts/check-assets.ts` checks these; when adding a new component, add its check rules too.
- **Motion must be disableable**: all animation degrades to none under `prefers-reduced-motion: reduce`.
- **Readable without JS**: content is visible by default; scripts only enhance (see `Steps`: without scripts, steps are laid out flat).
- **Scripts use delegation + `astro:page-load`**: the site uses client-side routing, so component scripts run only once; handlers bound directly to nodes stop working after navigation. Use `dataset` markers to prevent double initialization.
- **Dynamically created elements need global styles**: Astro scoped styles rely on compile-time attributes, which JS-created elements don't get; put those styles in `src/styles/global.css`.
- **Colors use tokens**: use variables like `var(--accent)` and `var(--color-ink)`, never hard-coded values, or dark mode and product theme colors will break.

## Acceptance checklist

- [ ] `bun run check` and `bun run check:assets` pass
- [ ] `bun run preview:report` shows no red blockers for this release
- [ ] All three locales exist with the same structure; untranslated ones stay `status: draft`
- [ ] Open this release in local `bun run dev`: images not broken, videos play, compares drag, steps switch
- [ ] Once final, switch `status` to `published` in all three locales together
