# Longbridge Changelog

[![check](https://github.com/longbridge/changelog/actions/workflows/check.yml/badge.svg)](https://github.com/longbridge/changelog/actions/workflows/check.yml)
[![deploy](https://github.com/longbridge/changelog/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/longbridge/changelog/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](README.md) | **简体中文**

Longbridge 各产品对外更新日志的源码仓库，线上地址 **[longbridge.com/zh-CN/changelog](https://longbridge.com/zh-CN/changelog)**。

站点用 [Astro](https://astro.build) 构建成静态页面，提供英文、繁体中文、简体中文三种语言。更新日志的原文来自公开渠道的定时抓取或产品团队手写，改写成 MDX 后先在测试环境验收，合并后自动部署。

- **线上站点：** [English](https://longbridge.com/en/changelog) · [繁體中文](https://longbridge.com/zh-HK/changelog) · [简体中文](https://longbridge.com/zh-CN/changelog)
- **RSS：** `https://longbridge.com/<locale>/changelog/rss.xml`

## 目录

- [产品](#产品)
- [快速开始](#快速开始)
- [发布更新日志](#发布更新日志)
- [仓库结构](#仓库结构)
- [部署](#部署)
- [参与贡献](#参与贡献)
- [许可证](#许可证)

## 产品

| ID | 产品 |
| --- | --- |
| `longbridge-pro` | Longbridge Pro（桌面端） |
| `longbridge-ai` | LongbridgeAI |
| `longbridge-web` | Longbridge Web |

产品配置在 [`app/config/products.config.ts`](app/config/products.config.ts)。

## 快速开始

前置要求：[Bun](https://bun.sh) 1.3 及以上。只有从 GitHub Releases 抓取时才需要 [GitHub CLI](https://cli.github.com)。

```bash
git clone https://github.com/longbridge/changelog.git
cd changelog/app
bun install
bun run dev            # 本地预览（含草稿）：http://localhost:4321/zh-CN/changelog
```

其他常用命令，都在 `app/` 下执行：

```bash
bun run check          # 类型与 schema 检查
bun run check:assets   # 素材引用、alt 描述、三语对齐
bun run build          # 生产构建到 dist/（只含已发布条目）
bun run preview:build  # 带草稿构建，并生成验收报告 dist/preview/index.html
```

内容流水线、配置、MDX 组件和全部命令见 [`app/README.md`](app/README.md)（英文）。

## 发布更新日志

> [!NOTE]
> 本节面向 Longbridge 团队。外部用户欢迎提 Issue，见[参与贡献](#参与贡献)。

1. 按[模板](CONTRIBUTING.md#release-notes-template)写好更新说明，存为 `releases/<产品 id>/<版本号>.md`。正文用中文写就行。
2. 在仓库根目录打开 [Claude Code](https://claude.com/claude-code)（或其他 coding agent），说一句：`发布 releases/longbridge-pro/1.1.0.md`。
3. agent 会改写文案、出三语、生成本地预览，然后**停下来等你确认**。你确认后它提 PR 到 `canary`（测试环境）；测试环境你再确认一次，它才提 PR 到 `main`（生产）。

agent 的完整流程和每一道确认闸口写在 [`AGENTS.md`](AGENTS.md)。

## 仓库结构

```
.
├── releases/<产品 id>/          原数据，每个产品一个目录
│   ├── <版本号>.md              产品手写的更新说明（输入）
│   └── <tag>.<语言>.md          从公开渠道抓取的原文（不要手改）
├── app/                         Astro 站点与命令行脚本
│   ├── config/                  产品、语言、frontmatter schema
│   ├── scripts/                 抓取、转换、检查、预览报告、部署
│   └── src/content/             对外的 MDX（小版本与大版本总结）
├── .claude/skills/              编写、改写更新日志用的 agent skill
├── .github/workflows/           CI：check、deploy、sync
└── AGENTS.md                    给 coding agent 的说明
```

## 部署

分支即环境，合并即部署：

| 分支 | 环境 |
| --- | --- |
| `canary` | 测试环境 |
| `main` | 生产，[longbridge.com/zh-CN/changelog](https://longbridge.com/zh-CN/changelog) |

每个版本从 `main` 单独切一个分支，先合进 `canary` 验收，验收通过后再合进 `main`。永远不要把 `canary` 合进 `main`。详见 [`app/README.md`](app/README.md#deployment)。

## 参与贡献

发现错别字、坏链或信息有误？请[提 Issue](https://github.com/longbridge/changelog/issues/new/choose)。更新日志由 Longbridge 团队发布，不接受外部 PR。详情与提交规范见 [CONTRIBUTING.md](CONTRIBUTING.md)（英文）。

## 许可证

源代码以 [MIT License](LICENSE) 发布。

更新日志内容（`releases/`、`app/src/content/`）以及 Longbridge 名称、标志和其他品牌素材 © Longbridge，保留所有权利，不在 MIT License 授权范围内。
