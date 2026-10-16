# Longbridge Release Notes

Longbridge 各产品对外的更新日志：<https://longbridge.com/zh-CN/changelog>

## 我是产品，要发一版更新日志

1. 按下面的模板写一份 md，放到 `releases/<产品 id>/<版本号>.md`（例：`releases/longbridge-pro/1.1.0.md`）。
2. 在仓库根目录打开 Claude Code，说一句：

   ```
   发布 releases/longbridge-pro/1.1.0.md
   ```

3. agent 会改写文案、出三语、生成本地预览，**然后停下来给你看**。
   你确认后它提 PR 到 `canary`，合并就上测试环境；测试环境你再确认一次，它才提 PR 到 `main`，合并就上生产。

| 产品 id | 产品 |
| --- | --- |
| `longbridge-pro` | Longbridge Pro（桌面端） |
| `longbridge-ai` | LongbridgeAI |
| `longbridge-web` | Longbridge Web |

新产品要先在 `app/config/products.config.ts` 加配置，让 agent 来做。

### 模板

```md
产品: longbridge-pro
版本: 1.1.0
发布日期: 2026-10-20
平台: macOS, Windows

## 这一版最想让用户知道的

一两句话，会变成页面顶部的摘要与亮点。

## 新增

- 

## 优化

- 

## 修复

- 

## 需要用户注意的

升级后要重新登录？某个入口挪了位置？没有就删掉这一节。

## 素材

每条变更对应的截图 / 录屏，写清楚是哪一条。写本地文件路径就行，agent 会帮你上传换成 CDN 链接；
已经有 CDN 链接（assets.lbkrs.com / assets.lbctrl.com / pub.lbkrs.com）就直接贴。素材不进仓库；没有就留空，页面先出纯文字版。
- 自选列表：改版前后各一张 ~/Desktop/watchlist-before.png ~/Desktop/watchlist-after.png
```

不确定的字段留空就行，agent 会来问。同一个版本要改内容，直接改原文件再让 agent 跑一遍。

## 目录

```
README.md      你正在看的这份
AGENTS.md      给 agent 的完整流程（拿到一份 md → 预览 → 测试环境 → 生产）
releases/      原数据，每个产品一个目录
  <产品 id>/<版本号>.md            产品手写的更新说明
  <产品 id>/<tag>.<语言>.md        定时任务从公开来源抓的原文，别手改
app/           站点与脚本，产品不用进去
```

开发者看 [`app/README.md`](app/README.md)。
