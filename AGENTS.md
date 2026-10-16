# AGENTS.md

这个仓库产出 Longbridge 对外更新日志站点（`longbridge.com/<locale>/changelog`）。
使用者通常是**产品**：他们只会往 `releases/` 放一份 md，然后让你把它变成线上页面。他们不懂、也不需要懂代码。

## 仓库结构

```
releases/<product>/               原数据，每个产品线一个目录，下面没有别的东西
  <version>.md                    产品手写的更新说明（无 frontmatter）← 主要输入
  <tag>.<locale>.md               定时任务抓的公开原文（frontmatter 带 fetchedAt）
app/                              全部代码，命令都在这里执行（cd app）
  src/content/releases/<locale>/<product>/<tag>.mdx   小版本页面 ← 你的产出
  src/content/majors/<locale>/<product>/<major>.mdx    大版本总结 ← 你的产出
  config/products.config.ts       产品 id 的唯一来源
  CLAUDE.md                       代码约定，改 app/ 下除内容以外的任何东西前先读
.claude/skills/                   四个 skill，具体怎么写都在里面
.github/workflows/                check（PR 检查）、deploy（canary/main 部署）、sync（定时抓取开 PR）
```

**md 是输入，mdx 是成品。** md 是产品的原话、单语言；mdx 是你改写后的三语对外稿，带 `<Video>` `<Figure>` 等组件。
产品要改事实（加减功能、版本号）就改 md 再重跑；只改措辞直接改 mdx。

## 分支即环境

| 合并到 | 结果 |
| --- | --- |
| `canary` | GitHub Actions 部署测试环境 `longbridge.xyz/<locale>/changelog` |
| `main` | GitHub Actions 部署生产 `longbridge.com/<locale>/changelog` |

一个版本只用一个分支：从 `main` 切 `release/<product>-<version>`，**先 PR 到 `canary`，验收后用同一个分支再 PR 到 `main`**。
永远不要把 `canary` 合进 `main`：那上面可能有别人还没验收的版本。

## 产品说「发布 releases/xxx/yyy.md」时

按顺序走，**带 ⛔ 的是闸口：停下来等产品明确回复，不要自己往下走。**

### 1. 读稿、定位

- 读那份 md。产品 id 不在 `app/config/products.config.ts` 里就停下来问，不要编。
- 版本号、发布日期、平台缺了，先看同目录下有没有同版本的抓取原文（`<tag>.<locale>.md`），没有再问。
- 看不懂的条目攒起来**一次性**问，不要一条一条问。

### 2. 装配成页面

- 加载 `web-release` skill（入口，讲清要动哪六个文件），再按它的指引用 `release-page-compose` 选版式、写 zh-CN。
- 文案规则看 `.claude/skills/release-notes-mdx/references/brand-voice.md`：不造词、不喊口号，标题、摘要、亮点只用原文里的说法。
- 出 zh-HK 和 en，三语结构一致。
- 素材：MDX 里只能写 CDN 链接（`assets.lbkrs.com` 等）。产品给的是**本地文件**，按下面「上传素材」换成链接；给的是飞书链接，请产品下载到本地再按本地文件处理。**没有素材就保持纯文字**，绝不编路径。
- `source` 填 `provider: manual`、`repo: releases/<product>/<version>.md`、`url: https://longbridge.com`。
- 这一步所有文件都是 `status: draft`。

### 3. 自检

```bash
cd app
bun run check            # schema 与类型
bun run check:assets     # 素材、alt、三语是否对齐
bun run preview:build    # 带草稿构建，并生成预览索引
```

报错就修到全绿，修不了的如实告诉产品，不要跳过。

### 4. ⛔ 闸口一：本地预览

启动 `bun run dev`（守护进程，结束用 `bunx astro dev stop`），把这些交给产品：

- 预览索引：`app/dist/preview/index.html`（本次改了哪些版本、三语是否齐、缺什么）
- 这一版的直达地址：`http://localhost:4321/<locale>/changelog/<product>/<major>/#<tag>`，三个语言各一个
- 一段话说明：选了哪个版式、改写了哪些原文措辞及原因、哪些条目配图会更清楚但目前没素材

然后**停下来**，问「确认没问题吗？确认后我提到测试环境」。产品要改就改完回到第 3 步。
没有拿到明确的「确认 / 可以 / OK」之前，不 commit、不 push。

### 5. ⛔ 闸口二：测试环境

产品确认后：

- 小版本和大版本总结，三语一起把 `status` 改成 `published`，再跑一次第 3 步的检查。
  测试环境和生产是同一份构建，只展示 `published`，不转就看不到。
- 在仓库根执行：

  ```bash
  git switch -c release/<product>-<version> origin/main
  git add app/src/content releases
  git commit -m "feat(<product>): <version> 更新日志"
  git push -u origin HEAD
  gh pr create --base canary --title "feat(<product>): <version> 更新日志"
  ```

- PR 的 check 通过后合并（或请有权限的人合）。几分钟后 deploy 跑完，把 `https://longbridge.xyz/<locale>/changelog/<product>/<major>/#<tag>` 给产品，**停下来等确认**。

### 6. ⛔ 闸口三：上生产

只有产品明确说「上线 / 发生产」才做：

```bash
gh pr create --base main --head release/<product>-<version> --title "feat(<product>): <version> 更新日志"
```

合并后 deploy 自动上生产；如果仓库给 production 环境配了审批，告诉产品去 Actions 页面找谁批。不要用任何方式绕过。
上线后给出线上地址，任务结束。

## 上传素材（CLI 出来之前）

产品给了本地图片 / 视频时，在**提交之前**换成 CDN 链接，这样本地预览就能看到图。上传走公司内部的素材后台，用产品自己浏览器里的登录态。

1. **上传页面地址**读环境变量 `RELEASE_NOTES_UPLOAD_URL`。没有就问产品要（内部地址，**不要写进仓库**）。
2. **检查 `my-chrome` 工具**（`.mcp.json` 里的 `chrome-devtools-mcp --autoConnect`，连产品已经打开的 Chrome）：
   - 能列出标签页：先告诉产品要传哪几个文件，然后把文件复制到 `app/.uploads/`（git 忽略；工具只能上传项目目录里的文件）→ 打开上传页面（已有就复用那个标签）→ 点「Asset 上传」→ 选文件 → 提交 → 等到「所有文件上传成功」→ 从「最新上传」里读出链接，形如 `https://assets.lbkrs.com/uploads/<uuid>/<文件名>`。
   - 用不了：`open "$RELEASE_NOTES_UPLOAD_URL"` 打开页面，请产品自己点「Asset 上传」，传完把链接贴回来。不要为此去改浏览器或 MCP 配置。
3. 图片用 `sips -g pixelWidth -g pixelHeight <文件>` 取宽高写进 `<Figure width height>`，视频用 `<Video>`。
4. 传完删掉 `app/.uploads/` 里的副本。

注意：上传后的文件**立即公开且永久缓存**，传错了无法撤回。文件名会出现在公开 URL 里，用英文、不带内部信息。只用「Asset 上传」这一个功能，不碰后台其他页面，目标文件夹保持默认。

## 红线

- 不改抓取原文（`releases/<product>/<tag>.<locale>.md`），不改别的产品、别的版本的文件。
- frontmatter 的 `product` `version` `tag` `releasedAt` `source` 三语完全一致。
- 不编造素材路径、功能名、数据。原文没写的不要补。
- 闸口不能合并跳过：产品说「直接上线」也要先给一次预览，对方看过再发。
- 不把 `canary` 合进 `main`，不往 `main` 直接 push。
- 这是公开仓库：不写内部系统名、内部链接、人名、未发布的功能。
- 预览里看不到刚写的版本，先看 `web-release` skill 的排查表，九成是大版本总结没建。

## 其他任务

| 产品 / 开发者说 | 去哪 |
| --- | --- |
| 「有个同步 PR」「把最近抓到的更新整理一下」 | `release-notes-mdx` skill，输入是 `releases/<product>/` 里的抓取原文 |
| 「给这版加截图 / 录屏 / 对比图」 | `release-notes-media` skill |
| 改站点样式、组件、脚本 | 先读 `app/CLAUDE.md` 与 `app/README.md` |
