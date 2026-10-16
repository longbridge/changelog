# Contributing

Thanks for helping improve the Longbridge changelog.

## Reporting issues

Anyone can [open an issue](https://github.com/longbridge/changelog/issues/new/choose) for:

- typos, broken links, missing translations or wrong information in the release notes
- bugs on the site itself (layout, navigation, RSS, accessibility)

For questions about Longbridge apps or your account, contact Longbridge support. This repository only covers the changelog site.

## Pull requests

Release notes are official product communication, so pull requests are limited to the Longbridge team. Outside pull requests will be closed. Please open an issue instead and we'll make the change.

## For the Longbridge team

### Release notes template

Save the notes as `releases/<product>/<version>.md`, for example `releases/longbridge-pro/1.1.0.md`. The file has no frontmatter. Write the content in whatever language you prefer; the agent produces all three locales.

```md
Product: longbridge-pro
Version: 1.1.0
Release date: 2026-10-20
Platforms: macOS, Windows

## Key message

One or two sentences. They become the summary and highlights at the top of the page.

## New

-

## Improved

-

## Fixed

-

## Heads-up

Anything users must act on after upgrading (sign in again, a moved entry point). Delete this section if there's nothing.

## Assets

Screenshots or recordings for each item, saying which item each one is for. Local file paths are fine:
the agent copies them into assets/<product>/<version>/ and they're deployed with the site. Leave this empty for a text-only page.
- Watchlist redesign, before and after: ~/Desktop/watchlist-before.png ~/Desktop/watchlist-after.png
```

Leave a field empty if you're unsure and the agent will ask. To change a published version, edit the same file and run the agent again. A new product needs an entry in [`app/config/products.config.ts`](app/config/products.config.ts) first; ask the agent to add it.

Then follow [Publishing release notes](README.md#publishing-release-notes). The agent workflow and its review gates are defined in [AGENTS.md](AGENTS.md).

### Branches

- Cut one branch per release from `main`: `release/<product>-<version>`, and open a PR to `main`.
- Every PR gets a preview on Cloudflare Pages; the link is commented on the PR and stays the same as you push.
- Merging needs an approving review from a code owner (see [`.github/CODEOWNERS`](.github/CODEOWNERS)); a new push dismisses earlier approvals. Merging the PR deploys production. Never push to `main` directly.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org) in English, imperative mood, no trailing period:

```
<type>(<scope>): <subject>
```

| Type | Use for |
| --- | --- |
| `feat` | New release notes, new site features |
| `fix` | Corrections to content or code |
| `docs` | README, AGENTS.md, skills and other docs |
| `chore` | Content sync, dependencies, tooling |
| `ci` | GitHub Actions workflows |
| `refactor` / `style` / `perf` / `test` | As usual |

The scope is a product ID for content (`longbridge-pro`) or an area for code (`preview`, `deploy`, `fetch`). Examples:

```
feat(longbridge-pro): release notes for 1.1.0
fix(longbridge-ai): correct release date of 2.3.0
fix(preview): find build output in locale-first directories
```

PR titles follow the same format.

### Before opening a PR

Run these from `app/` and make sure they pass. CI runs the first two on every PR:

```bash
bun run check
bun run check:assets
bun run preview:build
```

The repository is public. Don't commit internal hostnames, internal system names, people's names, credentials or unreleased features. Deployment targets and credentials live in GitHub Secrets and Variables only.

### Assets

Put images and videos in `assets/<product>/<version>/` and reference them as `/assets/<product>/<version>/<file>`. Filenames are lowercase English (they're public URLs); keep images under 500 KB and videos under 4 MB. Never replace a file that's already on `main`, since assets are cached for a year: use a new filename. `bun run check:assets` enforces all of this.

Code conventions are in [`app/CLAUDE.md`](app/CLAUDE.md) and [`app/README.md`](app/README.md).
