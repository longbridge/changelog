# Project conventions

The public Longbridge release notes site. A three-stage content pipeline: fetch (scripts) → rewrite (skills + people) → build (Astro SSG).

These are the development conventions for the **code directory** `app/`. Paths below are relative to `app/` and commands run in `app/`. The repository root only holds the open-source docs, `AGENTS.md` (the end-to-end workflow for product managers and agents), the source notes in `releases/` and this directory. Source paths are written as `releases/...` and refer to the one at the repository root. In code, locate them with `REPO_ROOT` / `RAW_DIR` from `scripts/lib/paths.ts`; don't hard-code `../`.

The repository is hosted on GitHub and public. Code, comments and content must not contain internal domains, internal system names or people's names. Deployment targets (bucket, path, credentials) live only in GitHub Secrets / Variables. Docs, code comments, commit messages and PR titles are in English; see `CONTRIBUTING.md` at the repository root for the commit convention.

## Directory ownership

| Directory | Written by | Rules |
| --- | --- | --- |
| `config/` | People | Adding a product, repository or locale only touches this directory |
| `releases/<product>/<version>.md` (repo root) | Product team | Handwritten notes, no frontmatter, input to `release-page-compose`. `releases/` only contains product directories |
| `scripts/` | People | Fetch and transform CLIs, TypeScript run by Bun |
| `releases/<product>/<tag>.<locale>.md` (repo root) | `bun run fetch` | **Don't edit by hand**; re-fetching overwrites them. The frontmatter has `fetchedAt`, which `readRaw` uses to tell them apart from handwritten notes |
| `src/content/releases/` | First draft by `bun run transform`, then edited by skills / people | transform doesn't overwrite existing files by default |
| `src/content/majors/` | People / skills | Major-version summaries, the layer the list page shows; transform only creates empty shells |
| Rest of `src/` | People | Site code |

## Common commands

```bash
bun run fetch --product <id>      # fetch
bun run transform --locale en     # generate first drafts for one locale
bun run dev                       # preview (shows drafts); Astro 7 runs it as a daemon
bunx astro dev stop               # stop the dev server
bun run build                     # production build, published entries only
SHOW_DRAFTS=1 bun run build       # include drafts for review
bun run check                     # type check
bun run check:assets              # asset references, accessible descriptions, locale parity
bun run i18n:todo                 # list entries waiting for translation
bun run preview:build             # build with drafts + preview report, for product review
# Releasing is done by merging: PR into canary → staging, into main → production (.github/workflows/deploy.yml)
```

## Content rules

- The four skills: `web-release` (entry point: write a release page from scratch → local preview → PR to canary for staging → PR to main to go live; read it first if you're new to the repo), `release-page-compose` (product md → full page, including layout recipes and custom component extensions), `release-notes-mdx` (fetched source → public wording in three locales), `release-notes-media` (rich media for finalized copy).
- **Never write asset paths that don't exist.** Without a screenshot, keep it text-only and ask the user for one; `bun run check:assets` catches broken images.
- Images and videos in the body use full URLs on our own CDN (`assets.lbkrs.com` / `assets.lbctrl.com` / `pub.lbkrs.com`); assets are not committed. `public/changelog/release-assets/` only holds sample images for the component preview page.
- `status`: `draft` is visible locally only / `published` is public / `skipped` is never shown.
- `product` `version` `tag` `releasedAt` `source` in the frontmatter are maintained by scripts; don't touch them when rewriting.
- The site has two levels: the list page only shows **major versions** (first two parts of the version, `0.20.1` → `0.20`, `2026.09.11` → `2026.09`). A major-version page has one section per release; releases have no URL of their own, and the anchor is `#<filename>`.
- For a version to appear on the site, the release must be `published` and its major-version summary must be `published` in all three locales. `bun run check:assets` blocks half-done releases.
- Locale files must be aligned by version: `src/content/releases/{zh-CN,zh-HK,en}/<product>/<tag>.mdx`. When a locale is missing, the locale switcher falls back to that locale's product page instead of a 404; `bun run check:assets` reports `published` entries that are missing a locale.
- **Scripts never machine-translate.** When a curated source lacks a locale, transform fills in the closest locale as a placeholder, marks `translation.status: pending` and keeps it `draft`; `bun run i18n:todo` lists these. **Non-curated sources get no placeholders**; the `release-notes-mdx` skill creates the other two locales when it flips the entry to `published`.
- `curated` sources (`repo-docs` / `appstore`) are already public wording. They're `published` straight after transform; don't rewrite the copy. Only releases written in internal wording need rewriting.
- Write keyboard shortcuts as inline code (`` `Cmd + K` ``) and `src/lib/kbd-plugin.ts` renders them as keycaps. It matches "joined by + and contains a modifier" or "a single key name"; ordinary code is unaffected.
- `highlights` are highlight phrases written by people / AI; `topics` are mechanically extracted module tags. Don't put module names in highlights.

## Code conventions

- Use `bun` for package management and running scripts.
- TypeScript is pinned to 6.x: the 7.x native compiler doesn't expose the APIs `astro check` depends on yet.
- Import Zod from `zod` directly, not the deprecated `z` from `astro:content`.
- Path aliases: `@components/*` `@layouts/*` `@lib/*` `@config/*`, also usable in MDX.
- The URL fragment equals the MDX filename (`content.config.ts` defines a custom `generateId`). Don't revert to default slugification, or `v1.19.0` becomes `v1190` and may collide.
- Cross-page animations rely on `transition:name`; the same entry on the list page and the detail page must get the same name from `releaseTitleId()`.
- Styles use Tailwind v4 with colors from the `@theme` tokens in `src/styles/global.css`. The product accent color is injected via the `--accent` CSS variable; don't hard-code it.
- MDX components are injected through `mdxComponents` on the detail page. Add new components to that map so MDX authors don't need imports.
- Elements created by scripts (such as the Steps switcher buttons) don't get Astro's scoped styles; their styles must go in `global.css`.
- Under client-side routing (`ClientRouter`) component scripts run only once: bind events by delegation, initialize on `astro:page-load`, and guard against double initialization with a `dataset` flag.
- All motion must degrade to no animation under `prefers-reduced-motion: reduce`.
- A new MDX component must be added in four places: `mdxComponents` on the detail page, the `/[locale]/changelog/preview` preview page, the list in the `release-notes-media` skill, and the component table in README. See the `release-page-compose` skill.
- The frontmatter schema is defined once in `config/content.schema.ts`; `src/content.config.ts` and the scripts import it from there. Change fields there first.
- CI lives in `.github/workflows/` and every job uses `working-directory: app`. PRs run `check.yml`; merges into `canary` / `main` are deployed to staging / production by `deploy.yml`; `sync.yml` fetches on a schedule and opens a PR to `main`.
- Only public data sources. Before adding an internal source that needs credentials, confirm first: fetched text goes into the public repository verbatim.
