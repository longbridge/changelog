# AGENTS.md

This repository builds the public Longbridge changelog site (`longbridge.com/<locale>/changelog`).
Your user is usually a **product manager**: they drop a md file into `releases/` and ask you to turn it into a live page. They don't know code and shouldn't need to.

Always reply in the user's language (often Chinese). Everything committed to the repository (docs, commit messages, PR titles and descriptions, code comments) is in English, except the zh-CN / zh-HK release notes content itself.

## Repository layout

```
releases/<product>/               Source notes, one directory per product, nothing else
  <version>.md                    Handwritten by the product team (no frontmatter) ← main input
  <tag>.<locale>.md               Public source fetched by the scheduled job (frontmatter has fetchedAt)
assets/<product>/<version>/       Screenshots and recordings referenced by the pages, deployed with the site
app/                              All code; run commands here (cd app)
  src/content/releases/<locale>/<product>/<tag>.mdx   Release page section ← your output
  src/content/majors/<locale>/<product>/<major>.mdx    Major-version summary ← your output
  config/products.config.ts       Single source of truth for product IDs
  CLAUDE.md                       Code conventions; read before changing anything in app/ other than content
.claude/skills/                   Four skills with the detailed writing instructions
.github/workflows/                check (PR checks), preview (Cloudflare Pages preview per PR), deploy (main), sync (scheduled fetch that opens a PR)
```

**md is input, mdx is output.** The md is the product manager's own words in one language; the mdx is your rewritten public copy in three locales, with components such as `<Video>` and `<Figure>`.
To change facts (add or remove items, change the version), edit the md and run again. For wording only, edit the mdx directly.

## Preview and production

| When | Result |
| --- | --- |
| A PR to `main` is opened or updated | GitHub Actions builds the site with drafts and deploys a preview to Cloudflare Pages. A bot comments the link on the PR: `https://pr-<number>.<project>.pages.dev` |
| The PR is merged into `main` | GitHub Actions deploys production, `longbridge.com/<locale>/changelog` |
| The PR is closed or merged | The preview deployments are deleted and the preview link stops working |

One branch and one PR per release: cut `release/<product>-<version>` from `main` and open a PR to `main`. Every push updates the same preview URL.

## When the user says "publish releases/xxx/yyy.md"

Follow these steps in order. **Steps marked ⛔ are gates: stop and wait for an explicit reply from the user. Don't continue on your own.**

### 1. Read and locate

- Read the md. If the product ID isn't in `app/config/products.config.ts`, stop and ask. Don't make one up.
- If the version, release date or platforms are missing, check the same directory for a fetched source of the same version (`<tag>.<locale>.md`). If there is none, ask.
- The template uses `Product:` `Version:` `Release date:` `Platforms:` and the sections `Key message` `New` `Improved` `Fixed` `Heads-up` `Assets`. Older files may use the Chinese keys (`产品` `版本` `发布日期` `平台`, `这一版最想让用户知道的` `新增` `优化` `修复` `需要用户注意的` `素材`); treat them the same.
- Collect every item you don't understand and ask about them **all at once**, not one by one.

### 2. Compose the page

- Load the `web-release` skill (the entry point; it lists the six files to touch), then follow it to `release-page-compose` to pick a layout and write zh-CN.
- Copy rules are in `.claude/skills/release-notes-mdx/references/brand-voice.md`: no invented terms, no slogans. Titles, summaries and highlights only use wording from the source.
- Produce zh-HK and en with the same structure in all three locales.
- Assets: put the user's **local files** into the repository as described in [Assets](#assets) and reference them as `/assets/<product>/<version>/<file>`. Existing CDN links (`assets.lbkrs.com` etc.) can be used as they are. If they give Feishu links, ask them to download the files locally and treat them as local files. **No assets means a text-only page.** Never make up a path.
- Set `source` to `provider: manual`, `repo: releases/<product>/<version>.md`, `url: https://longbridge.com`.
- Every file in this step is `status: draft`.

### 3. Self-check

```bash
cd app
bun run check            # schema and types
bun run check:assets     # assets, alt text, locale parity
bun run preview:build    # build with drafts and generate the preview index
```

Fix every error until all checks pass. If you can't fix something, tell the user plainly. Don't skip it.

### 4. ⛔ Gate 1: local preview

Start `bun run dev` (it runs as a daemon; stop it with `bunx astro dev stop`) and give the user:

- The preview index: `app/dist/preview/index.html` (which versions changed, whether all three locales are present, what's missing)
- Direct links to this release, one per locale: `http://localhost:4321/<locale>/changelog/<product>/<major>/#<tag>`
- A short note: which layout you chose, which source wording you changed and why, and which items would be clearer with a screenshot that isn't available yet

Then **stop** and ask: "Does this look right? Once you confirm, I'll open a PR and send you the online preview." If they want changes, make them and go back to step 3.
Don't commit or push until you get an explicit "confirmed / yes / OK".

### 5. ⛔ Gate 2: PR preview

After the user confirms:

- Change `status` to `published` for the release and the major-version summary, in all three locales, then run the step 3 checks again.
  Merging the PR deploys production as is, so the PR must already contain the final state.
- From the repository root:

  ```bash
  git switch -c release/<product>-<version> origin/main
  git add app/src/content releases assets
  git commit -m "feat(<product>): release notes for <version>"
  git push -u origin HEAD
  gh pr create --base main --title "feat(<product>): release notes for <version>"
  ```

- Wait for the `check` and `preview` workflows (`gh pr checks --watch`). The preview bot comments the link on the PR. Give the user:
  - the site: `https://pr-<number>.<project>.pages.dev`
  - direct links to this release, one per locale: `https://pr-<number>.<project>.pages.dev/<locale>/changelog/<product>/<major>#<tag>`

  Then **stop and wait for confirmation**. If they want changes, edit, re-run step 3, commit and push to the same branch; the preview URL stays the same.
- If the preview job skipped the deployment (no Cloudflare token configured), say so and fall back to the local preview. Don't treat it as passed.

### 6. ⛔ Gate 3: production

Only when the user explicitly says "go live / ship to production":

```bash
gh pr merge <number> --merge --delete-branch
```

Merging deploys production automatically. If the `production` environment requires approval, tell the user to find the approver on the Actions page. Never bypass it.
After the deploy finishes, give the production URL. The task is done.

## Assets

Images and videos live in the repository and are deployed together with the site. No upload step.

1. Copy the files into `assets/<product>/<version>/`, e.g. `assets/longbridge-pro/1.1.0/watchlist-after.png`.
2. Rename them: lowercase English, digits, `-` `_` `.` only, describing the content (`watchlist-before.png`). **The filename is part of a public URL**: nothing internal, no people's names.
3. Reference them in MDX as `/assets/<product>/<version>/<file>`, e.g. `<Figure src="/assets/longbridge-pro/1.1.0/watchlist-after.png" …>`. The components add the `/changelog` prefix.
4. For images, get the size with `sips -g pixelWidth -g pixelHeight <file>` and set `<Figure width height>`. Use `<Video>` for videos.
5. Keep them small: images under 500 KB, videos under 4 MB (hard limit 20 MB). Compress before committing; the repository keeps every version forever.
6. **Never replace a file that is already on `main`.** Assets are cached for a year, so a changed file won't reach users. Use a new filename instead. `bun run check:assets` enforces this.

Screenshots must not contain real user data: accounts, phone numbers, real holdings and amounts must be demo data.

## Hard rules

- Don't edit fetched sources (`releases/<product>/<tag>.<locale>.md`) or files of other products or versions.
- `product` `version` `tag` `releasedAt` `source` in the frontmatter must be identical in all three locales.
- Don't invent asset paths, feature names or numbers. Don't add anything the source doesn't say.
- Gates can't be skipped or combined: even if the user says "just ship it", show the preview once and publish only after they've seen it.
- Don't push to `main` directly; everything goes through a PR.
- This is a public repository: no internal system names, internal links, people's names or unreleased features.
- If the new version doesn't show up in the preview, see the troubleshooting table in the `web-release` skill. Nine times out of ten the major-version summary is missing.
- Commit messages and PR titles follow [Conventional Commits](CONTRIBUTING.md#commit-messages) in English.

## Other tasks

| The user says | Go to |
| --- | --- |
| "There's a sync PR", "tidy up the recently fetched updates" | `release-notes-mdx` skill; input is the fetched sources in `releases/<product>/` |
| "Add screenshots / a recording / a comparison to this release" | `release-notes-media` skill |
| Change site styles, components or scripts | Read `app/CLAUDE.md` and `app/README.md` first |
