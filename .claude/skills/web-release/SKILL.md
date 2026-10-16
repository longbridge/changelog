---
name: web-release
description: The full path for writing a public Release Page in this repo from scratch, seeing it in the local preview, reviewing it on the PR preview, and finally shipping it to production. Use when the user says things like 「帮我写一个 release page」「加一个版本的更新日志」「这版更新怎么发到 release 站点」「我写完了怎么预览」「预览里看不到我刚写的版本」 ("write a release page", "add a changelog entry for a version", "how do I preview this", "my new version doesn't show up in the preview"), or is new to this repo and doesn't know which file to start with.
---

# Write a Release Page and ship it

This is the entry skill: everything an agent needs to know to build a version page in this repo from scratch, see it, and ship it.
Wording, media, and layout are covered by three other skills; this one only routes you to the right one and makes sure no step is skipped.

## Route first

| What you have | Where to go |
| --- | --- |
| A product manager's md (or one placed at `releases/<product>/<version>.md`) | Read `release-page-compose` (layout recipes) first, then come back here from step 4 |
| Internal source fetched by `bun run fetch` / a `status: draft` first draft | Read `release-notes-mdx` (public voice and three locales) first, then come back here from step 4 |
| Copy is final, needs images / video | Read `release-notes-media` |
| Nothing; writing a version by hand from scratch | Stay here and start at step 1 |

The handwritten md template uses English keys and sections (`Product` / `Version` / `Release date` / `Platforms`; `## Key message` / `## New` / `## Improved` / `## Fixed` / `## Heads-up` / `## Assets`); legacy Chinese keys are still accepted. Mapping: Key message → `summary` / `highlights`; New / Improved / Fixed → the three MDX groups; Heads-up → `<Callout>`; Assets → media. Details in `release-page-compose`.

Whichever path you take, the three rule files under `release-notes-mdx/references/` apply:

| File | Covers |
| --- | --- |
| [`classification.md`](../release-notes-mdx/references/classification.md) | Which changes belong in the notes (required reading when there's an upstream source) |
| [`brand-voice.md`](../release-notes-mdx/references/brand-voice.md) | No jargon, no filler, no long sentences; how to write titles |
| [`examples.md`](../release-notes-mdx/references/examples.md) | Real source → published pairs from this repo |

Almost all rework traces back to these three; go through them before writing.

All three skills only cover "what it should look like". **Where to write, how to view it, and how to ship it are this skill's job.**

## 0 · Environment and red lines

The repo root holds source data `releases/`, page assets `assets/` and code `app/`. **All `bun run` / `make` commands below run inside `app/`**; file paths are relative to the repo root.

```bash
cd app && bun install
```

Confirm these before writing — violating them means rework:

- **Never hand-edit fetched sources** `releases/<product>/<tag>.<locale>.md` (frontmatter has `fetchedAt`); a re-run of `bun run fetch` overwrites them as-is.
- **This is a public repo**: no internal system names, internal links, personal names, or unreleased features.
- **Never write asset paths that don't exist.** No screenshot means stay text-only and ask the user for one; don't invent a plausible-looking URL.
- New images and videos go into the repo under `assets/<product>/<version>/` and are referenced as `/assets/<product>/<version>/<file>` (see "Assets" in `AGENTS.md`). Existing full URLs on our own CDN (`assets.lbkrs.com` / `assets.lbctrl.com` / `pub.lbkrs.com`) remain valid. Never replace a file that's already on `main`; use a new filename.
- The frontmatter fields `product` `version` `tag` `releasedAt` `source` describe the same release and must be identical across all three locales.

## 1 · Locate: the six files to touch

The site has two layers: **the list page shows only major versions; a minor version is a section inside its major version page, with no URL of its own.**
Major version = the first two segments of the version (`0.20.1` → `0.20`, date version `2026.09.14` → `2026.09`).

So for a version to appear on the site, **all six files are required** (3 locales × 2 layers):

```
app/src/content/releases/{zh-CN,zh-HK,en}/<product>/<tag>.mdx    what this version did
app/src/content/majors/{zh-CN,zh-HK,en}/<product>/<major>.mdx     what this whole major version brings
```

- `<product>` is the `id` from `app/config/products.config.ts`; don't make one up. If the product isn't in the repo yet, add its config first, touching only that file.
- `<tag>` is the URL anchor and also the file name. Two styles have been used historically, `v0.20.1` and `release-2026.08.14`; **match the existing files for the same product**, don't mix.
- If the major version summary already exists (an earlier release in the same month / major version), don't create a new one; update it.

Confirm the location before writing:

```bash
ls app/src/content/releases/zh-CN/<product>/     # naming style of existing versions
ls app/src/content/majors/zh-CN/<product>/       # does this major version's summary exist
```

## 2 · Filling in frontmatter

Minor version `app/src/content/releases/<locale>/<product>/<tag>.mdx`:

| Field | Source |
| --- | --- |
| `product` `version` `tag` | Upstream tag / version given by the product manager. `version` is the displayed version; `tag` is the file name |
| `locale` | Must match its directory |
| `releasedAt` | ISO time. Copy it from the fetched source `releases/<product>/<tag>.<locale>.md` if one exists for the same version; otherwise use the release date from the product manager |
| `platforms` | The source's `platforms` in `products.config.ts`, e.g. `[Web]` |
| `title` | What this release gives users: one sentence, max 16 characters, no trailing period. **Never just the version number** |
| `summary` | One-sentence overview, max 60 characters; used by the list page and SEO |
| `highlights` | 2-5 phrases, each max 20 characters, no trailing period. These are human-written highlights — **don't stuff module names in** |
| `status` | Start as `draft`; switch all three locales to `published` together once complete |
| `source` | Provenance; not shown on the page but required by the schema |

If there's an upstream, copy `source` from the fetched source; **for a purely handwritten release with no upstream tag**, fill it like this:

```yaml
source:
  provider: manual
  repo: releases/<product>/<version>.md   # where the original notes live; if none, the product id
  url: https://longbridge.com               # must be a valid URL
```

The major version summary `app/src/content/majors/<locale>/<product>/<major>.mdx` has only frontmatter; the body can be empty
(the details are in the minor version sections below it; repeating them only makes the page longer):

```yaml
product: longbridge-web
major: '2026.09'
locale: zh-CN
title: 一句话，规则同小版本
summary: 一句话，40 字以内，概括这个大版本最值得说的一到两件事
highlights:              # 2-4 items; highlights of the whole major version, not of one minor version
  - 亮点短语
status: draft
```

(The zh-CN values above are placeholders: `title` follows the same rules as a minor version; `summary` is one sentence, max 40 characters, covering the one or two things most worth saying about this major version.)

When merging a new minor version into a major version that's **already published**, recheck whether the summary is still accurate: if it adds a feature worth mentioning, add it to `highlights`; if it's only fixes, leave it.

## 3 · What the body can contain

The body is MDX. These components are **written as tags directly, no import needed**: `<Figure>` `<Compare>` `<Video>` `<Steps>`+`<Step>` `<Demo>` `<LinkPreview>` `<Kbd>` `<Callout>`.
Plain Markdown links are automatically wrapped in `<LinkPreview>`; no need to change how you write them to get a preview.

**The site ships a preview page showing what each component looks like and how its props are written** — look at it before writing; it's faster than guessing prop names:

```bash
bun run dev
open http://localhost:4321/zh-CN/changelog/preview
```

Group with `## 新增功能` / `## 体验优化` / `## 问题修复` (zh-CN headings for New / Improved / Fixed; use the equivalent translated headings in zh-HK and en). Delete any group with no content.
One sentence per item, 20-40 characters, only changes users can notice, worded per the three brand-voice rules. For layout see `release-page-compose`; for restraint in media use see `release-notes-media`.

## 4 · Validate

```bash
bun run check          # types and frontmatter schema
bun run check:assets   # assets exist, alt text complete, three locales complete, major summary keeping up; asset filenames, sizes, no replacing files already on main
```

`check:assets` catches "half-done" work: a minor version is `published` but a locale's file is missing, or the major version summary isn't `published` yet — in either case the page won't appear online.

## 5 · Preview

Three kinds; pick by situation.

| Situation | How |
| --- | --- |
| Viewing while writing | `bun run dev`, shows drafts automatically. Astro 7's dev server is a daemon: `bunx astro dev status` / `stop` / `logs` |
| Self-check when done / handing to product for review | `bun run preview:build`, then open the `app/dist/preview/index.html` it prints at the end |
| Online review after the PR is open | The `preview` workflow deploys every PR to `main` (drafts included) to Cloudflare Pages and comments the link to the site root: `https://pr-<number>.<project>.pages.dev`. See step 6 |

`app/dist/preview/index.html` is an index: which versions changed, whether all three locales are present, whether assets are missing, which items are still drafts,
with each locale label linking straight to this version's anchor on the major version page. It covers "every changed version in the working tree" — **uncommitted and untracked new files count too**, so you can run it right after writing.

The direct URL for a version looks like this (a minor version is an anchor, not a standalone page):

```
http://localhost:4321/<locale>/changelog/<product>/v<major>#<tag>
e.g.: http://localhost:4321/zh-CN/changelog/longbridge-web/2026.09/#release-2026.09.14
```

### Can't find the version you just wrote in the preview?

Check in this order, from most to least likely:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Whole version missing, not on the list page either | **Missing major version summary.** Minor versions hang under the major version page; without `app/src/content/majors/<locale>/<product>/<major>.mdx` nothing renders | Create that file. `bun run preview:report` reports it as a blocker |
| Visible locally or on the PR preview, gone after `bun run build` or in production | Both previews show drafts; production doesn't. `status` is still `draft`, or the major version summary is still `draft` | Switch both layers to `published` |
| Never appears no matter what | `status: skipped` | That status means "never shown"; change it |
| Switching language jumps back to the product page | That locale's file wasn't created | Complete all three locales; `bun run i18n:todo` lists what's pending |
| Links in the preview index 404 | dist has no site build yet | Run `bun run preview:build`, not just `preview:report` |
| No preview link on the PR | The `preview` workflow is still running, skipped the deployment (no Cloudflare token), or the PR comes from a fork / the sync bot | `gh pr checks --watch`; if it was skipped, fall back to the local preview and say so |
| `preview` fails at "Deploy to Cloudflare Pages" with an authentication error | The `CLOUDFLARE_API_TOKEN` secret expired or was revoked (tokens are issued with an expiry date) | Tell the user; a repo admin creates a new token and runs `gh secret set CLOUDFLARE_API_TOKEN`. Meanwhile use the local preview |
| Preview link returns 404 | The PR was closed or merged; the `cleanup` job deletes its previews | Reopen the PR to rebuild it, or use production after merge |
| Broken images | Asset path doesn't exist, or the file isn't under `assets/<product>/<version>/` | Run `bun run check:assets`, then ask the user for the real asset — **don't swap in another guessed path** |
| Online image still shows the old version | A file already on `main` was replaced; assets are cached for a year | Revert it and use a new filename; `check:assets` flags replacements |

## 6 · Commit and ship

**One branch, one PR, merge = deploy**: cut `release/<product>-<version>` from `main` and open one PR to `main`. Every PR gets a Cloudflare Pages preview with drafts included; merging the PR deploys production (longbridge.com). No tags.

Merging ships the PR as is — before committing, switch the minor version and the major version summary to `published` in all three locales together, then rerun step 4.

```bash
git switch -c release/<product>-<version> origin/main
git add app/src/content releases assets   # run from the repo root; content and assets only, dist/ never goes in the repo
git commit -m "feat(<product>): release notes for <version>"
git push -u origin HEAD
gh pr create --base main --title "feat(<product>): release notes for <version>"
```

Wait for `check` and `preview` (`gh pr checks --watch`). The preview bot comments the link on the PR; review at `https://pr-<number>.<project>.pages.dev` and `https://pr-<number>.<project>.pages.dev/<locale>/changelog/<product>/v<major>#<tag>`. The project is the repo variable `CLOUDFLARE_PAGES_PROJECT`, currently `longbridge-changelog`.
If something's wrong, keep pushing to this branch; the preview URL stays the same. When the PR is closed or merged, the `cleanup` job deletes its previews and the link returns 404.

Merge only after the user explicitly says to go live. `main` needs an approval from a code owner (`.github/CODEOWNERS`); `--auto` merges as soon as it's approved:

```bash
gh pr merge <number> --auto --merge --delete-branch
```

Enabling auto-merge (this command, or **Enable auto-merge** on the PR page) sends the code owner a Slack message with the preview and PR links. Tell the user the PR is waiting for that approval; the approver opens the PR → **Files changed** → **Review changes** → **Approve**, and it merges itself. Don't bypass the review. Pushing after the approval dismisses it.

Never push to `main` directly. If the `production` environment requires approval, point the user to the Actions page; never bypass it.

## Pre-delivery checklist

- [ ] This release says no more than 3 things (major version summary no more than 4)
- [ ] This release deserves its own section (if it's only one or two pure fixes, mark it `skipped` in all three locales and fold it into an adjacent version)
- [ ] All six files exist: three-locale minor version + three-locale major version summary
- [ ] Read-through finds no jargon, no filler, no sentence over 30 characters; the title answers "what can users do now"
- [ ] `bun run check` and `bun run check:assets` pass
- [ ] `bun run preview:build` shows **no red blockers** for this release
- [ ] Open the preview index and click into each locale to confirm the page really exists, images aren't broken, and `title` isn't a version number
- [ ] Three locales share the same structure: media block count and position, list item count, and `highlights` count all match
- [ ] Once final, switch `status` of the minor version and the major version summary to `published` **together**
- [ ] No asset path was invented; new assets are in `assets/<product>/<version>/` with lowercase English filenames and within size limits
- [ ] No internal system names, internal links, or personal names (public repo)
