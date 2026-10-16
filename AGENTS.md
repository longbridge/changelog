# AGENTS.md

This repository builds the public Longbridge changelog site (`longbridge.com/<locale>/changelog`).
Your user is usually a **product manager**: they drop a md file into `releases/` and ask you to turn it into a live page. They don't know code and shouldn't need to.

Always reply in the user's language (often Chinese). Everything committed to the repository (docs, commit messages, PR titles and descriptions, code comments) is in English, except the zh-CN / zh-HK release notes content itself.

## Repository layout

```
releases/<product>/               Source notes, one directory per product, nothing else
  <version>.md                    Handwritten by the product team (no frontmatter) ← main input
  <tag>.<locale>.md               Public source fetched by the scheduled job (frontmatter has fetchedAt)
app/                              All code; run commands here (cd app)
  src/content/releases/<locale>/<product>/<tag>.mdx   Release page section ← your output
  src/content/majors/<locale>/<product>/<major>.mdx    Major-version summary ← your output
  config/products.config.ts       Single source of truth for product IDs
  CLAUDE.md                       Code conventions; read before changing anything in app/ other than content
.claude/skills/                   Four skills with the detailed writing instructions
.github/workflows/                check (PR checks), deploy (canary/main), sync (scheduled fetch that opens a PR)
```

**md is input, mdx is output.** The md is the product manager's own words in one language; the mdx is your rewritten public copy in three locales, with components such as `<Video>` and `<Figure>`.
To change facts (add or remove items, change the version), edit the md and run again. For wording only, edit the mdx directly.

## Branches are environments

| Merged into | Result |
| --- | --- |
| `canary` | GitHub Actions deploys staging, `longbridge.xyz/<locale>/changelog` |
| `main` | GitHub Actions deploys production, `longbridge.com/<locale>/changelog` |

One branch per release: cut `release/<product>-<version>` from `main`, **open a PR to `canary` first, and after review open a PR from the same branch to `main`**.
Never merge `canary` into `main`: it may contain other releases that haven't been approved yet.

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
- Assets: MDX may only contain CDN links (`assets.lbkrs.com` etc.). If the user gives **local files**, replace them with links as described in [Uploading assets](#uploading-assets-until-the-cli-ships). If they give Feishu links, ask them to download the files locally and treat them as local files. **No assets means a text-only page.** Never make up a path.
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

Then **stop** and ask: "Does this look right? Once you confirm, I'll push it to staging." If they want changes, make them and go back to step 3.
Don't commit or push until you get an explicit "confirmed / yes / OK".

### 5. ⛔ Gate 2: staging

After the user confirms:

- Change `status` to `published` for the release and the major-version summary, in all three locales, then run the step 3 checks again.
  Staging and production use the same build and only show `published` entries; drafts won't appear.
- From the repository root:

  ```bash
  git switch -c release/<product>-<version> origin/main
  git add app/src/content releases
  git commit -m "feat(<product>): release notes for <version>"
  git push -u origin HEAD
  gh pr create --base canary --title "feat(<product>): release notes for <version>"
  ```

- Merge once the PR checks pass (or ask someone with permission to merge). A few minutes later, when deploy finishes, give the user `https://longbridge.xyz/<locale>/changelog/<product>/<major>/#<tag>` and **stop and wait for confirmation**.

### 6. ⛔ Gate 3: production

Only when the user explicitly says "go live / ship to production":

```bash
gh pr create --base main --head release/<product>-<version> --title "feat(<product>): release notes for <version>"
```

Merging deploys production automatically. If the `production` environment requires approval, tell the user to find the approver on the Actions page. Never bypass it.
After it's live, give the production URL. The task is done.

## Uploading assets (until the CLI ships)

When the user provides local images or videos, replace them with CDN links **before committing**, so the local preview shows them. Uploads go through the company's internal asset console, using the user's own browser session.

1. Read the **upload page URL** from the `RELEASE_NOTES_UPLOAD_URL` environment variable. If it isn't set, ask the user for it. It's an internal URL: **never write it into the repository**.
2. **Check the `my-chrome` tool** (`chrome-devtools-mcp --autoConnect` in `.mcp.json`, which attaches to the Chrome window the user already has open):
   - If it can list tabs: first tell the user which files you'll upload, then copy them to `app/.uploads/` (git-ignored; the tool can only upload files inside the project) → open the upload page (reuse the tab if it's already open) → click 「Asset 上传」 (Asset upload) → choose the files → submit → wait for 「所有文件上传成功」 (all files uploaded) → read the links from 「最新上传」 (latest uploads). They look like `https://assets.lbkrs.com/uploads/<uuid>/<filename>`.
   - If it doesn't work: run `open "$RELEASE_NOTES_UPLOAD_URL"` and ask the user to click 「Asset 上传」 themselves and paste the links back. Don't change browser or MCP settings to make it work.
3. For images, get the size with `sips -g pixelWidth -g pixelHeight <file>` and set `<Figure width height>`. Use `<Video>` for videos.
4. Delete the copies in `app/.uploads/` afterwards.

Note: uploaded files are **public immediately and cached permanently**. A wrong upload can't be taken back. The filename appears in the public URL, so use English and nothing internal. Only use the Asset upload feature, don't touch other pages in the console, and keep the default target folder.

## Hard rules

- Don't edit fetched sources (`releases/<product>/<tag>.<locale>.md`) or files of other products or versions.
- `product` `version` `tag` `releasedAt` `source` in the frontmatter must be identical in all three locales.
- Don't invent asset paths, feature names or numbers. Don't add anything the source doesn't say.
- Gates can't be skipped or combined: even if the user says "just ship it", show the preview once and publish only after they've seen it.
- Don't merge `canary` into `main`, and don't push to `main` directly.
- This is a public repository: no internal system names, internal links, people's names or unreleased features.
- If the new version doesn't show up in the preview, see the troubleshooting table in the `web-release` skill. Nine times out of ten the major-version summary is missing.
- Commit messages and PR titles follow [Conventional Commits](CONTRIBUTING.md#commit-messages) in English.

## Other tasks

| The user says | Go to |
| --- | --- |
| "There's a sync PR", "tidy up the recently fetched updates" | `release-notes-mdx` skill; input is the fetched sources in `releases/<product>/` |
| "Add screenshots / a recording / a comparison to this release" | `release-notes-media` skill |
| Change site styles, components or scripts | Read `app/CLAUDE.md` and `app/README.md` first |
