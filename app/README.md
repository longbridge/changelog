# app

Code for the Longbridge changelog site: **fetch public sources → save as md → rewrite into MDX in three locales → build a static site with Astro**.

The workflow for product managers and agents is in the root [`README.md`](../README.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`AGENTS.md`](../AGENTS.md). This document only covers the code. All commands run in `app/`.

## Quick start

```bash
bun install
bun run fetch        # 1. fetch configured public sources into ../releases/<product>/
bun run transform    # 2. clean up and generate first-draft MDX in src/content/releases/
bun run dev          # 3. local preview (drafts included)
bun run build        # 4. build the static site into dist/ (published entries only)
```

## Data flow

```
Handwritten (via PR)                      Public sources (scheduled fetch)
releases/<product>/<version>.md           releases/<product>/<tag>.<locale>.md
        │  release-page-compose                   │  bun run transform
        └──────────────────┬──────────────────────┘
                           ▼
   src/content/releases/<locale>/<product>/<tag>.mdx    releases
   src/content/majors/<locale>/<product>/<major>.mdx     major-version summaries (what the list page shows)
                           │  bun run build
                           ▼
                         dist/
```

**md is input, mdx is output.** `releases/` only contains product directories, and both kinds of md live side by side: handwritten notes have no frontmatter, fetched sources have `fetchedAt` in their frontmatter, and `readRaw` only reads the latter.

During transform:

- Sources already written for the public (`repo-docs`, `appstore`, `release-api`) → format conversion only, `published` directly
- Sources in internal wording (`github` Releases) → cleaned up and grouped, left as `draft` for a skill to rewrite
- A locale without a source → filled with the closest locale as a placeholder, marked `translation.status: pending` and kept `draft`.
  **No machine translation.** `bun run i18n:todo` lists the backlog; the `release-notes-mdx` skill does the translation

`transform` never overwrites existing MDX by default, so re-fetching won't wipe manual edits.

## Two levels of versions

Each entry on the list page is a **major version** (first two parts of the version: `0.20.1` → `0.20`; date versions `2026.09.11` → `2026.09`) and shows the major-version summary. Clicking through opens the major-version page, where the body has one section per **release** in reverse order, and the sidebar jumps between releases.
Releases have no page of their own; their link is the anchor `#<filename>` on the major-version page.

So publishing a version takes both: the release is `published`, and its major-version summary is `published` in all three locales.

## Deployment

**Every PR gets a preview, merging deploys production.** No tags, no staging branch:

| When | Deployed to |
| --- | --- |
| A PR to `main` is opened or updated | Cloudflare Pages preview with drafts, `https://pr-<number>.<project>.pages.dev`, linked in a PR comment |
| The PR is merged into `main` | Production, `longbridge.com/<locale>/changelog` |

One branch and one PR per release, cut from `main`. The preview URL stays the same for the life of the PR and stops working once the PR is closed or merged. Locally, `bun run preview:build` builds the same thing.

Workflows live in `../.github/workflows/`:

| File | Trigger | What it does |
| --- | --- | --- |
| `check.yml` | PR to `main` | `check` + `check:assets`; must pass to merge |
| `preview.yml` | PR to `main` | Build with drafts → Cloudflare Pages → sticky PR comment with the link to the site root. When the PR is closed or merged, deletes all of its preview deployments |
| `deploy.yml` | Push to `main` | Check → build → upload to OSS with `bun run deploy` |
| `sync.yml` | Daily schedule, or manual | Fetch + transform; if anything changed, open (or update) a PR from the `sync/releases` branch. Never auto-merges |

### Deployment targets

The repository is public, so **bucket names, paths and credentials are never in code**. They're all configured in the GitHub repository settings:

| Kind | Name |
| --- | --- |
| Repository variables | `OSS_BUCKET` `OSS_ENDPOINT` |
| `production` environment variables | `OSS_PREFIX` |
| Credentials | The organization-wide `FE_LB_ASSET_ACCESS_KEY_*` by default. To use a different key, set `OSS_ACCESS_KEY_ID` `OSS_ACCESS_KEY_SECRET` on the `production` environment |
| PR previews | Secrets `CLOUDFLARE_API_TOKEN` (Cloudflare Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`, variable `CLOUDFLARE_PAGES_PROJECT` (a Direct Upload project). Without the token the preview job builds but skips deploying. Create the token with an expiry date and only the "Cloudflare Pages: Edit" permission; when it expires, deploys fail with an authentication error until a new one is set |

The `production` environment can also require reviewers, so someone has to approve the upload after a merge into `main`.

Before uploading, `bun run deploy` verifies asset paths in the build output, then uploads in three passes: hashed static assets are cached for a year; HTML, sitemap and RSS are not cached.
Emergency upload from a local machine: export the five variables above and run `make deploy:website-local`.

Public URLs put the locale first: `longbridge.com/en/changelog/<product>/<major>`. The build base is `/`, and `changelog` is a route segment (`src/pages/[locale]/changelog/`, defined by `SITE_SEGMENT` in `config/site.config.ts`). The main site's reverse proxy forwards these paths:

| Path | Content |
| --- | --- |
| `/<locale>/changelog/**` | Pages and RSS |
| `/changelog/_astro/**` | Built JS / CSS (`build.assets`) |
| `/changelog/sitemap-*.xml` | Sitemap |
| `/changelog` | Redirects to a locale based on the main site's `locale` cookie |

Changing `SITE_SEGMENT` requires the same change in the main site's proxy configuration.

## Configuration

### Adding a product

Edit `config/products.config.ts`:

```ts
{
  id: 'longbridge-app',              // URL segment and directory name under releases/
  order: 10,                          // order on the home page
  accent: '#2f7d6b',                  // accent color for this product's pages
  homepage: 'https://longbridge.com/download',
  name: { 'zh-CN': '…', 'zh-HK': '…', en: '…' },
  summary: { 'zh-CN': '…', 'zh-HK': '…', en: '…' },
  sources: [],                        // leave empty if there's no public source; content comes in via PR
}
```

A product can have several `sources`; their results are merged into one timeline. `hidden: true` hides the product from the public site; it still appears in builds with drafts.

### Data sources

**Public sources only**: fetched text is committed verbatim to this public repository.

| provider | Reads | Requires |
| --- | --- | --- |
| `repo-docs` | Changelogs kept in a repository, one directory per locale (already public wording) | Nothing, public HTTP |
| `appstore` | App Store release notes, locale by store region | Nothing, public HTTP |
| `release-api` | A product's own public release notes API | Nothing, public HTTP |
| `github` | Release bodies of a public repository | [`gh`](https://cli.github.com) |

A `repo-docs` configuration looks like this:

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

`<video>` and `<img>` in the source are replaced with the site's `<Video>` / `<Figure>` components, and the source site's `<style>` and layout wrappers are dropped.
Set `RELEASE_NOTES_GH_TOKEN` to raise the GitHub API rate limit; CI uses the workflow's built-in token.

### Locales

Add or remove them in `LOCALES` in `config/site.config.ts`. The default is three locales, `en` `zh-HK` `zh-CN` (also the order in the language switcher), with routes like `/zh-HK/changelog/longbridge-pro/2.1`. `/changelog` redirects based on the main site's `locale` cookie and falls back to the default locale (`en`).

## Commands

| Command | Description |
| --- | --- |
| `bun run fetch` | Fetch all products. `--product <id>` limits products (comma-separated), `--limit n` limits entries, `--dry-run` writes nothing |
| `bun run transform` | Generate missing MDX drafts. `--locale en` picks the locale, `--force` overwrites existing drafts (loses manual edits), `--product <id>` limits products |
| `bun run dev` | Local preview with `draft` entries. Astro 7 runs it as a daemon: `bunx astro dev status` / `stop` / `logs` |
| `bun run build` | Production build, `published` only. `SHOW_DRAFTS=1 bun run build` includes drafts |
| `bun run check` | Type check (needs TypeScript 6.x; 7.x doesn't provide the APIs `astro check` depends on yet) |
| `bun run check:assets` | Checks that assets exist, images and videos have descriptions, no unreliable external images, published entries exist in all three locales, titles aren't still script placeholders, and major-version summaries are up to date |
| `bun run i18n:todo` | Lists untranslated entries with the translation and source paths |
| `bun run preview:report` | Lists versions changed in this branch (compared with `main`, including uncommitted files), missing locales and assets; writes `dist/preview/index.html` |
| `bun run preview:build` | Build with drafts + preview report, for local review. The PR preview deploys the same build without the report |
| `bun run deploy` | Upload `dist/` to OSS, target from the `OSS_*` environment variables; `--dry-run` only prints the commands |

## MDX frontmatter

A release, `src/content/releases/<locale>/<product>/<tag>.mdx`:

```yaml
product: longbridge-pro         # maintained by scripts, don't edit
version: '2.3.11'               # maintained by scripts, don't edit
tag: v2.3.11                    # maintained by scripts, don't edit
locale: en
title: Place and amend orders from the chart   # what this version does, not just the version number
summary: One sentence, also used for SEO
highlights:                     # 2-5 items
  - Pre-market and after-hours quotes for US stocks
releasedAt: 2025-08-20T02:30:10.685Z
platforms: [macOS, Windows, Linux]
status: draft                   # draft: local only / published: public / skipped: never shown
source: { provider, repo, url } # maintained by scripts, don't edit; handwritten notes use provider: manual
```

A major-version summary, `src/content/majors/<locale>/<product>/<major>.mdx`, is what the list page shows:

```yaml
product: longbridge-pro
major: '2.3'                    # maintained by scripts, don't edit
locale: en
title: Screener, quant and grid trading
summary: One sentence for the whole major version
highlights:                     # 2-4 items for the whole major version
  - Multi-factor stock screener
status: published
```

The body can be empty; the details are in the release sections on the major-version page.

## Rich media in the body

The body is MDX. These components can be used **without imports** (the detail page injects them):

| Component | Use |
| --- | --- |
| `<Figure src alt caption>` | Screenshot, click to zoom |
| `<Compare before after alt>` | Before/after comparison with a draggable divider |
| `<Video src label poster>` | Walkthrough; autoplays muted in the viewport, pauses when scrolled away |
| `<Steps>` + `<Step title>` | Step-by-step guide with a switcher |
| `<Demo src title poster>` | Interactive demo; the iframe loads only on click |
| `<LinkPreview href>` | External link with a live preview of the target page on hover |
| `<Kbd keys="⌘+K">` | Keyboard shortcut. Inline code such as `` `Cmd + K` ``, `` `Shift + Esc` `` or `` `ESC` `` renders as the same keycaps (`src/lib/kbd-plugin.ts`), so curated sources need no changes |
| `<Callout type>` | Callout box: `info` / `warning` / `success` |

Plain Markdown links in the body are wrapped in `<LinkPreview>` automatically. Write the tag by hand only to set `poster` or `label`, or to turn the preview off.

Put images and videos in the repo-root `assets/<product>/<version>/` and reference them as `/assets/<product>/<version>/<file>`; the components add the `/changelog` prefix. `public/changelog/assets` is a symlink to that directory, so dev, build and deploy all include the files. Filenames are lowercase English (they appear in public URLs). Assets aren't content-hashed and are cached for a year, so never replace a file already on `main`: use a new filename. `bun run check:assets` checks names, sizes (warns above 500 KB for images and 4 MB for videos, fails above 20 MB, which keeps under the 25 MiB Cloudflare Pages limit) and replaced files. Older entries use full URLs on our CDN (`assets.lbkrs.com` / `assets.lbctrl.com` / `pub.lbkrs.com`), which remain valid. Scroll-in animations for paragraphs and lists are applied site-wide, and all motion respects the system's reduced-motion setting.

See the `release-notes-media` skill for usage and restraint guidelines, and run `bun run check:assets` when you're done.

## Local preview

```bash
bun run preview:build          # build with drafts + report
open dist/preview/index.html
```

The index lists which versions changed, whether all three locales are present, which assets are missing and which entries are still drafts. Each locale tag links to that release's anchor on its major-version page (`…/<major>/index.html#<tag>`).
It covers **every changed version in the working tree**, including uncommitted and untracked files, so you can run it right after writing.
`preview:report` alone doesn't build, so `dist/` has no pages and the links 404; it reminds you at the end.

## Directory layout

```
../releases/<product>/   Source notes: handwritten and fetched
../assets/<product>/     Images and videos used in the pages
../.github/workflows/    check / deploy / sync
../.claude/skills/       web-release (entry), release-page-compose (composing), release-notes-mdx (public wording), release-notes-media (rich media)
config/                  Product and site configuration; adding a product only touches this
scripts/                 CLIs for fetch, transform, checks, preview and upload
src/content/releases/    Release MDX (written by people and AI)
src/content/majors/      Major-version summaries, shown on the list page (written by people and AI)
src/pages/               Routes: /[locale]/changelog/[product]/[major]
src/components/          Page components
src/components/release/  Rich media components available in MDX
src/components/release/custom/  Experimental components (need explicit imports)
public/changelog/assets           Symlink to ../../../assets (repo-root assets/), keep it
public/changelog/release-assets/   Sample images for the component preview page
```

## The four skills

| Skill | When to use |
| --- | --- |
| `web-release` | **Entry point.** The full path from writing a release page → local preview → PR preview → merge to go live, including a "not showing in preview" troubleshooting table |
| `release-page-compose` | A product manager handed over an md that needs to become a full page. Includes layout recipes and the custom component path |
| `release-notes-mdx` | Fetched sources need rewriting into public wording and translating into three locales |
| `release-notes-media` | The copy is final; add screenshots, comparisons and walkthroughs to highlights |

The first three define what the page says; `web-release` defines where to write it, how to preview it and how to ship it.
