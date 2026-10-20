# Longbridge Changelog

[![check](https://github.com/longbridge/changelog/actions/workflows/check.yml/badge.svg)](https://github.com/longbridge/changelog/actions/workflows/check.yml)
[![deploy](https://github.com/longbridge/changelog/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/longbridge/changelog/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**English** | [简体中文](README.zh-CN.md)

Source of the public release notes for Longbridge products, published at **[longbridge.com/en/changelog](https://longbridge.com/en/changelog)**.

The site is a static [Astro](https://astro.build) build in three locales (English, Simplified Chinese, Traditional Chinese). Release notes are either fetched from public sources or written by the product team, rewritten into MDX, reviewed on a per-PR preview, and deployed on merge.

- **Live site:** [English](https://longbridge.com/en/changelog) · [简体中文](https://longbridge.com/zh-CN/changelog) · [繁體中文](https://longbridge.com/zh-HK/changelog)
- **Feeds:** RSS `https://longbridge.com/<locale>/changelog/rss.xml`, [JSON Feed](https://www.jsonfeed.org/version/1.1/) `https://longbridge.com/<locale>/changelog/rss.json` (latest 50 releases)

## Table of contents

- [Products](#products)
- [Getting started](#getting-started)
- [Publishing release notes](#publishing-release-notes)
- [Repository structure](#repository-structure)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Products

| ID | Product |
| --- | --- |
| `longbridge-pro` | Longbridge Pro (desktop) |
| `longbridge-ai` | LongbridgeAI |
| `longbridge-web` | Longbridge Web |

Products are configured in [`app/config/products.config.ts`](app/config/products.config.ts).

## Getting started

Prerequisites: [Bun](https://bun.sh) 1.3 or later. The [GitHub CLI](https://cli.github.com) is only needed to fetch from GitHub Releases.

```bash
git clone https://github.com/longbridge/changelog.git
cd changelog/app
bun install
bun run dev            # local preview with drafts at http://localhost:4321/en/changelog
```

Other common commands, all run from `app/`:

```bash
bun run check          # type and schema check
bun run check:assets   # media references, alt text, locale parity
bun run build          # production build to dist/ (published entries only)
bun run preview:build  # build including drafts, plus a review report at dist/preview/index.html
```

See [`app/README.md`](app/README.md) for the content pipeline, configuration, MDX components and every command.

## Publishing release notes

> [!NOTE]
> This section is for the Longbridge team. Outside contributions are welcome as issues; see [Contributing](#contributing).

1. Write the release notes as `releases/<product>/<version>.md` using the [template](CONTRIBUTING.md#release-notes-template).
2. Open [Claude Code](https://claude.com/claude-code) (or another coding agent) at the repository root and ask it to publish the file, e.g. `Publish releases/longbridge-pro/1.1.0.md`.
3. The agent rewrites the copy, produces all three locales and a local preview, and **stops for your review**. After you approve, it opens a PR and sends you the online preview link; after you approve that, it sets the PR to merge automatically once a code owner approves it, and the merge takes it live.

The full agent workflow, including its review gates, is in [`AGENTS.md`](AGENTS.md).

## Repository structure

```
.
├── releases/<product>/          Source notes, one directory per product
│   ├── <version>.md             Written by the product team (input)
│   └── <tag>.<locale>.md        Fetched from public sources (do not edit)
├── assets/<product>/<version>/  Screenshots and recordings, deployed with the site
├── app/                         Astro site and CLI scripts
│   ├── config/                  Products, locales, frontmatter schema
│   ├── scripts/                 fetch, transform, checks, preview report, deploy
│   └── src/content/             Published MDX (releases and major-version summaries)
├── .claude/skills/              Agent skills for composing and rewriting release notes
├── .github/workflows/           CI: check, preview, deploy, sync
└── AGENTS.md                    Instructions for coding agents
```

## Deployment

| When | Result |
| --- | --- |
| A PR to `main` is opened or updated | Preview on [Cloudflare Pages](https://pages.cloudflare.com), linked in a PR comment |
| The PR is merged into `main` | Production, [longbridge.com/en/changelog](https://longbridge.com/en/changelog) |

Each release uses its own branch and PR. Details are in [`app/README.md`](app/README.md#deployment).

## Contributing

Found a typo, a broken link or wrong information? [Open an issue](https://github.com/longbridge/changelog/issues/new/choose). Release notes are published by the Longbridge team, so we don't accept outside pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for details and commit conventions.

## License

The source code is released under the [MIT License](LICENSE).

Release notes content (`releases/`, `app/src/content/`), the Longbridge name, logos and other brand assets are © Longbridge. All rights reserved. They are not covered by the MIT License.
