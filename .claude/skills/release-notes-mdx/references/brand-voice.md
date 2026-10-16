# Copy voice

A changelog written for users. Three hard rules: **no jargon, no filler, no long sentences.**

Break any one of them and readers either can't understand it, or finish reading without knowing what happened.

## 1. No jargon

There are two kinds of jargon; delete both.

**Engineering jargon** — words leaking out of implementation details. Users don't have these concepts:

> 骨架　渲染　重绘　重排　表单　下拉　抽屉　弹层　吸顶　浮层　原生滚动　虚拟滚动
> 前缀　样式　脚本　字段　接口　缓存　埋点　直出　拆包　收敛　组件　容器　兜底　降级

(skeleton, render, repaint, reflow, form, dropdown, drawer, popup layer, sticky header, overlay, native scroll, virtual scroll,
prefix, style, script, field, API, cache, tracking, server-side output, bundle splitting, convergence, component, container, fallback, degradation)

**Corporate jargon** — words from internal meetings. In public copy they just sound hollow:

> 赋能　抓手　闭环　心智　链路　沉淀　对齐　打通　拉通　颗粒度　全链路　一站式　生态

(empower, lever, closed loop, mindshare, pipeline, accumulate, align, connect, pull through, granularity, end-to-end, one-stop, ecosystem)

The fix is not a synonym swap but **going back to what the user sees on screen**:

| ✗ Jargon | ✓ What the user sees |
| --- | --- |
| 加载时的骨架补齐了形态 (loading skeleton now matches the final layout) | 页面加载时不会再跳一下 (the page no longer jumps while loading) |
| 改成滚多少渲染多少 (render only what's scrolled into view) | 长列表往下滚不卡了 (long lists scroll without stutter) |
| 修复 AI 抽屉挤到顶栏 (fixed AI drawer squeezing the top bar) | 打开 AI 问答不会再把顶部菜单挤变形 (opening AI Q&A no longer squashes the top menu) |
| 吸顶栏里的交易按钮会收起 (trade button in the sticky bar collapses) | 往下滚时顶部不会出现两个一样的交易按钮 (scrolling down no longer shows two identical trade buttons at the top) |
| 恢复原生滚动 (restored native scrolling) | 滚动条和键盘翻页都正常了 (the scrollbar and keyboard paging work again) |
| 在你同意之前不再加载统计脚本 (analytics scripts no longer load before consent) | 你同意之前，我们不开始统计 (we don't start tracking until you agree) |

The test is simple: **can you point to this word in the product UI for the user?** If not, it's jargon.

## 2. No filler

Filler is words that take up space without carrying information. If deleting it leaves the meaning unchanged, it's filler.

**Information-free verbs**:

> 优化　提升　完善　增强　改进　升级　调整　治理

(optimize, improve, refine, enhance, better, upgrade, adjust, govern)

「体验优化」 ("experience optimization") says nothing. Either say **where** it got better, or delete the whole item.

**Marketing hype** — adjectives with no concrete fact behind them:

> 全新　焕新　重磅　强势　极致　丝滑　无缝　领先　深度赋能　全面升级

(brand-new, refreshed, major, powerful, ultimate, silky-smooth, seamless, leading, deeply empowering, comprehensive upgrade)

**Publisher-perspective words** — users don't care what action we took, only what they can do now:

| ✗ Our action | ✓ The user's outcome |
| --- | --- |
| 个股详情页上线 (stock detail page launched) | 浏览器里就能看个股 (view stocks right in the browser) |
| 选股器筛选重做 (screener filters rebuilt) | 挑筛选条件更顺手 (picking filters is easier) |
| 资讯支持 RSS 订阅 (news supports RSS) | 资讯可以用 RSS 订阅 (you can subscribe to news via RSS) |
| 新增交易时段说明 (added trading-hours info) | 官网能查各市场的交易时段 (look up each market's trading hours on the website) |

「上线」 (launch), 「重做」 (rebuild), 「支持」 (support), and 「新增」 (add) are the worst offenders — **never use them in titles or highlights**. In the body, if you really are stating a fact (「机构有了自己的主页」, "institutions now have their own home page"), switch to a user-perspective phrasing.

**But don't escape one kind of spin by falling into another.** A real failure:

```
原稿  个股详情页上线网页版        ← publisher perspective, needs changing
改成  不用再在几个入口之间跳      ← became negative-framing PR speak, still not natural
正解  个股页全新改版              ← it's a redesign, so say redesign
```

(Original: "stock detail page launched on web". Rewrite: "no more jumping between entry points". Correct: "stock page redesigned".)

That release really was a **redesign**, not something new. Dodging 「上线」 ("launch") made the title read as if something new had been added — more misleading than the original.
**Get the facts right first, then worry about wording.** Likewise, don't hide behind an internal-migration perspective —

```
✗ 期权链从客户端搬到网页版      ← "moved from where to where" is our business
✓ Web 支持美股期权链            ← users only care whether the web version has it now
```

(✗ "option chain moved from the client app to web"; ✓ "US option chains on Web")

## 3. No long sentences

One sentence, one thing. **Over 30 characters (Chinese), split it or cut it.**

Don't stitch several things into one sentence with 「，并」「，同时」「，另外」「，以及」 (", and", ", while", ", also", ", as well as") — that's how commit messages are written, not copy for people.

```
✗ 财经日历五个列表改成滚多少渲染多少，长列表滚动明显更顺，日历上点日期也能切回对应列表
✓ 财经日历的长列表往下滚不卡了。点日历上的日期，下面的列表会跟着跳过去。

✗ 筛选表单的下拉整个重做，挑条件更顺手，加载时的骨架也补齐了形态，不会再跳一下
✓ 筛选条件挑起来更顺手，页面加载时也不会再跳一下。
```

(First pair: the financial calendar's long lists now scroll smoothly; tapping a date makes the list below jump to it. Second pair: filters are easier to pick, and the page no longer jumps while loading.)

Also avoid nested modifiers. 「加载时的骨架也补齐了形态」 nests three layers; you reach the full stop and still don't know what it means.

## Say only 3–4 things per release

Write everything you could, and the point disappears. This is more damaging than word choice — bad wording just reads awkwardly,
but spreading too wide means readers can't find what this release actually did.

| Level | How many things |
| --- | --- |
| Minor version (one section) | 1–3 |
| Major-version summary | 3–4 |

There's only one selection criterion: **what readers will still remember a month later**. Everything else gets folded into another item or left out.

A real counter-example: `release-2026.07.24` listed 5 things:

```
期权链
财务、估值页带上 AI 摘要
业绩电话会直达直播
深度页的股票筛选标签多了也能横着划，不会被挤掉      ← this one shouldn't take up space
选股器可以自己定制 AI 面板                          ← neither should this
```

(Option chains; AI summaries on financials and valuation pages; earnings calls link straight to the live stream; stock filter tags on the deep-dive page scroll horizontally instead of getting squeezed; customizable AI panel in the screener.)

What that release was really worth saying was 「Web 支持美股期权链」 (US option chains on Web). The rest is too fine-grained for users to specifically remember;
putting them up front makes readers guess which of five things matters.

To decide whether an item stays, ask: **if this item were deleted, would the release still be complete?** If yes, delete it.

## How to write titles

The title is the only thing scanned on the list page, and the site adds version and date automatically, so the title should answer **one user question**:

- What can I do now?
- What got easier?
- Which annoying problem is gone?

One sentence, at most 16 characters in Chinese or 60 characters in English, no trailing period.

```
✓ 浏览器里就能看个股
✓ 长图不再被裁掉一半
✓ 划一段话就能问 AI
✓ 修好交易密码下打不开账户设置的问题     ← for a fix-only release, say what was fixed

✗ Longbridge Web 2026.09.21              ← script placeholder
✗ 选股器重做，发帖能带我的持仓            ← 「重做」 ("rebuilt") is our action
✗ 资讯图片按原始比例显示                  ← states a phenomenon without saying why it's better
✗ 体验优化与问题修复                      ← filler
```

(✓: view stocks right in the browser; long images no longer cropped in half; highlight a passage to ask AI; fixed account settings not opening under a trading password.
✗: screener rebuilt, posts can include my positions; news images shown at original aspect ratio; experience optimizations and bug fixes.)

If a release touches several areas, pick the one or two most worth saying and leave the rest to `summary`.

## Numbers only with facts

Never invent performance numbers, user counts, accuracy rates, or time saved. If there's a measurement, use it; if not, use a vague phrasing like 「更快」 ("faster"). **Don't compute a multiplier yourself.**

```
有证据：首屏从 850ms 降到 210ms    → may write 「打开快了大约 4 倍」
没证据                            → may only write 「打开更快」
```

(With evidence — first paint from 850ms to 210ms → "opens about 4x faster". Without evidence → only "opens faster".)

Likewise, 「更快」 itself needs a basis — seeing a perf commit doesn't mean users can perceive it. If unsure, don't write it.

## Pre-submission self-check

- [ ] How many things does this release say? Cut if a minor has more than 3 or a major more than 4
- [ ] Are the facts right — is it new or a redesign? Which site is the audience?
- [ ] Read it through: any words you can't point to in the UI (jargon)?
- [ ] Does deleting each sentence's adjectives change the meaning? If not, they're filler
- [ ] Any sentence over 30 characters?
- [ ] Does the title answer "what can the user do now"?
- [ ] Can every number be traced to evidence?
