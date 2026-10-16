# Worked examples

Each pair below comes from a real `longbridge-web` release: on the left, the fetched source; on the right, what was finally published on the site.
When you can't remember the rules, flipping through this page is faster than rereading them.

The matching rules are in [`classification.md`](classification.md) (what to write) and
[`brand-voice.md`](brand-voice.md) (how to write it).

**The two most costly lessons are §8 and §9** — both are about omissions and skewed framing, not word choice. Read those two first.

## 1 · Split one commit into two items, dropping the jargon on the way

`release-2026.09.21` source:

> **calendar** 财经日历五个列表 tab 接入虚拟滚动，恢复日历点位点击切换列表，修复列表一滚动的时候右侧的股票类的小卡片重新多次 render 的问题 — `e48c82f`

(financial calendar's five list tabs use virtual scrolling; restored tapping calendar dots to switch lists; fixed the small stock cards on the right re-rendering repeatedly while scrolling)

Published:

```markdown
- 财经日历的长列表往下滚不卡了
- 点日历上的日期，下面的列表会跟着跳过去
```

(long lists in the financial calendar scroll without stutter; tap a date on the calendar and the list below jumps to it)

Three things: **「虚拟滚动」 (virtual scrolling) and 「render」 are jargon**, replaced with what the user sees on screen; the source crammed three things into one sentence,
so it was **split into two items**; 「卡片重复渲染」 (cards re-rendering) is something users can't perceive at all, so it was **deleted**.

This item had another trap: within the same range it had been `Revert`ed once first. We only wrote it after checking the final state;
see "Reverted" in `classification.md`.

## 2 · Stating a phenomenon → saying why it's better

`release-2026.09.15` source:

> **blocks** feed 图片按原始比例布局，不再统一裁成 16:9 — `9bd1669`
> **blocks** feed 单图改为宽度铺满，长图补角标提示 — `c6d3d32`

(feed images laid out at original aspect ratio instead of all cropped to 16:9; single images now full width, long images get a corner badge)

Published:

```yaml
title: 长图不再被裁掉一半
summary: 资讯里的图片按原来的比例显示，不再统一裁成 16:9。
```

```markdown
- 只有一张图时宽度铺满，长图会在右下角标出来
```

(title: long images no longer cropped in half; summary: images in news show at their original ratio instead of all being cropped to 16:9; item: a single image fills the width, and long images are marked in the bottom-right corner)

The title was first written as 「资讯图片按原始比例显示」 (news images shown at original ratio) — that **states a phenomenon without saying why it's better**.
What readers care about is "my long images won't get chopped". The word `feed` was also dropped; on the site that section is called 「资讯」 (News).

## 3 · Determine the audience; don't overstate it

`release-2026.09.14` source:

> **sg** US/HK 产品页时间改 24 小时制，三页 section 按新流程重排 — `739d58b`

(US/HK product pages switch to 24-hour time; sections on three pages reordered per the new flow)

Published:

```markdown
### 新加坡产品页改用 24 小时制

美股和港股产品页都跟着改了。三个页面的板块顺序也重新排过。
```

(Singapore product pages switch to 24-hour time. Both the US and HK stock product pages changed. The section order on the three pages was also rearranged.)

The scope is `sg`, and the "Affected deployment units" table only lists 🇸🇬 SG. So it's **the Singapore site's product pages**,
not "the web version's product pages". The "US/HK" in the source means the US-stock and HK-stock pages under that site, not the Hong Kong site.
Misread something like this once, and the whole item is wrong.

## 4 · Same batch of commits: half included, half excluded

The fixes section of `release-2026.09.14` had 8 items; 4 were finally published:

| Source | Included | Why |
| --- | --- | --- |
| **ui** 对齐 hover-card 的 dismissable-layer 版本，修弹窗内「更多」菜单点不着 (align hover-card's dismissable-layer version; fix "More" menu in dialogs not clickable) | ✅ 弹窗里的「更多」菜单点不动 ("More" menu in dialogs couldn't be clicked) | Whether users can click it or not |
| **cookie-consent** gate tracking scripts until consent | ✅ 你同意之前，我们不会开始统计 (we won't start tracking until you agree) | Something users control |
| **quote** 治理概览页一次刷新的重复请求 (eliminate duplicate requests on overview page refresh) | ✅ 个股概览页打开更快 (stock overview page opens faster) | Write only the user-perceptible result |
| 修改词牌站点文案的书写错误 (fix typos in site copy) | ✅ 站点文案里的错字 (typos in site copy) | Visible |
| **lint** 多语言检查规则不再误报空文案 (i18n lint rule no longer flags empty strings falsely) | ✗ | Dev tooling |
| **ci** 调整自动修复机器人的提交身份 (change the auto-fix bot's commit identity) | ✗ | CI |
| **engine,ci** 调整构建产物的上传方式 (change how build artifacts are uploaded) | ✗ | Build |
| **news,blocks** 修复付费墙 JSON-LD cssSelector 失配并补充 inLanguage (fix paywall JSON-LD cssSelector mismatch and add inLanguage) | ✗ | Read by search engines; invisible to users |

Note how the third one was rewritten: the source says "duplicate requests", the published copy says "opens faster". **Don't write the technical cause; write the result.**

## 5 · Security: in the same release, one included and one not

`release-2026.08.31` included:

```markdown
### 美国站的 Cookie 选择

进站会先问你是否同意，非必要的默认不启用；页脚提供 CCPA「Do Not Sell」入口。
```

(Cookie choices on the US site. You're asked for consent on arrival, non-essential cookies are off by default, and the footer has a CCPA "Do Not Sell" link.)

`release-2026.09.15` excluded:

> 补充代码仓库的密钥扫描检查 — `9d3a7c4`

(added secret scanning checks to the code repository)

The difference is **whether users can use it, and whether it's safe to disclose**. The former gives users control; the latter is an internal protection detail,
and writing it up would only hand people hints.

## 6 · A whole release not worth its own section

All changes in `release-2026.09.18`:

> 修復导航头多语言问题 — `af2a67a`
> *（内部改动 2 项：格式化、把 .dark 选择器临时改名）*

(fixed nav header i18n issue; *2 internal changes: formatting, temporarily renaming the .dark selector*)

Only one public item remained, not enough for a title. All three locales were marked `status: skipped` together, and the item was folded into
`release-2026.09.21`'s 「问题修复」 (Fixed):

```markdown
- 顶部导航在部分语言下的文字显示不全
```

(top navigation text cut off in some languages)

Same for `release-2026.09.16`: its two fixes were folded into `09.17`. This brought September down from 9 sections to 7, each with something worth saying.

## 7 · A major summary is not a stitch-up of minors

2026.09 had 7 sections in total; the summary is just three lines:

```yaml
title: 读文章随手就能问 AI
summary: 读文章随手划一段就能追问 LongbridgeAI，选股器的筛选条件也更好挑了。
highlights:
  - 划词追问 LongbridgeAI
  - 筛选条件更好挑
  - 滚动和翻页恢复正常
```

(title: ask AI right while reading; summary: highlight a passage while reading to ask LongbridgeAI, and screener filters are easier to pick; highlights: highlight to ask LongbridgeAI / easier filter picking / scrolling and paging back to normal)

Pick the **one or two things most worth saying** this month, and leave the rest to the sections below. Also, the summary title must not collide with the title of
the first minor version under it — two nearly identical lines on the same screen stand out.

## 8 · Missing the biggest feature of the month

In the source for `release-2026.09.21`, there was only one related item, and it was under 「问题修复」 (Fixed):

> **quote** 并列详情面板标题未滚动时完整展示 — `dcb2c1a`

(side-by-side detail panel title shown in full before scrolling)

The first draft wrote it up as a fix, and misunderstood it too:

```markdown
✗ 并排看两只股票时，标题一开始就完整显示
```

(✗ "when viewing two stocks side by side, the title shows in full from the start")

「并列详情」 actually means **news and posts expanding side by side on the right of the stock page**, not two stocks side by side. Searching git for the term
revealed 8 feat commits behind it, making up the month's biggest feature: fluid scaling on wide screens + side-by-side reading at 2K and above.

Not one of them made it into the fetched source, because they shipped in `release-2026.09.18.5` — a tag with no Release object.

**Two lessons**: the fetched source is not the full set, so count tags before writing (see section 0 of `classification.md`);
when the source mentions an unfamiliar product concept, search git for its origin (section 3).

## 9 · Five things in one release, and the point got lost

The body of the first draft of `release-2026.07.24`:

```
期权链
财务、估值页带上 AI 摘要
业绩电话会直达直播
深度页的股票筛选标签多了也能横着划，不会被挤掉
选股器可以自己定制 AI 面板
```

(Option chains; AI summaries on financials and valuation pages; earnings calls link straight to the live stream; stock filter tags on the deep-dive page scroll horizontally instead of getting squeezed; customizable AI panel in the screener.)

Five things laid out flat, and readers don't know which to remember. The one thing really worth saying in that release: **「Web 支持美股期权链」 (US option chains on Web)**.

The problem with the rest isn't that they were badly written; it's that they're **too fine-grained to deserve space** — something like "filter tags scroll horizontally"
feels handy when users run into it, but nobody reads a changelog because of it.

The title for that same release also went wrong once:

```
✗ 期权链从客户端搬到网页版     ← "moved from where to where" is our internal perspective
✓ Web 支持美股期权链           ← users only care whether the web version has it now
```
