# Which changes belong in the changelog

The step before rewriting: pick out the few items from the fetched output that are **worth saying publicly**. Pick wrong, and no amount of good copy afterwards fixes it.

Order of judgment: **confirm the source is complete → read the three tables → filter item by item → merge duplicates**.

## 0. First confirm whether the source is complete

**The fetched source is a starting point, not the full set.** For the `github` source, `bun run fetch` only captures tags that have a Release object,
and CI tags every deploy, so the vast majority of tags have no Release object.

Measured in September 2026:

```
release tags in the repo                 43
with a Release object, fetched            9
changes covered by the nine raw files    63
actual commits that month               374 (285 feat/fix/perf)
```

The cost is real: that month's biggest feature, "side-by-side reading on ultra-wide stock pages", consisted of 8 feat commits shipped in
`release-2026.09.18.5` — a tag with no Release object. It **doesn't appear at all** in the fetched source;
only one closing fix leaked through, and it nearly got written up as an isolated bug under 「问题修复」 (Fixed).

So count before you write:

```bash
git tag --list 'release-2026.09*' | wc -l              # how many the repo actually has
ls releases/<product>/ | grep '\.zh-CN\.md$' | wc -l      # how many were fetched
```

**If they don't match, fill the gap from git**, pulling the range between two written versions:

```bash
git -C <upstream-repo> log --format='%h %s' <previous-tag>..<this-tag>   | grep -E '^[0-9a-f]+ (feat|fix|perf)'
```

When compiling a month of content, **first run git log for the month to inventory the features, then go back to the fetched source for details**.
Doing it the other way — reading only the raw files — will inevitably miss what shipped on tags without a Release, and that is often exactly the big features:
big features have more changes and more release batches, so they're actually the most likely to land on tags without a Release object.

## 1. Then read the three tables in the fetched output

Besides the change list, the internal-voice fetched source `releases/<product>/<tag>.<locale>.md` has three structured blocks. **These three decide which items shouldn't be candidates at all**; skipping them and going straight to the change list is the most common mistake at this step.

### 🔙 Reverted

If this section appears, some change in the range was rolled back. **For each entry, check whether it re-landed afterwards**:

| Situation | What to do |
| --- | --- |
| Reverted and never re-landed | Treat it as nonexistent; don't write it |
| Reverted and re-landed (common: fixed then shipped again) | Write it per the **final** commit; don't mention the back-and-forth |

Real example, `release-2026.09.21`:

```
82ca320  perf(calendar): 财经日历五个列表 tab 接入虚拟滚动
4e6cce5  Revert "perf(calendar): ..."          ← the fetched output lists this under "Reverted"
e48c82f  perf(calendar): ...接入虚拟滚动，恢复日历点位点击切换列表，修复卡片重复渲染
```

The one in effect is `e48c82f`, so this release can say 「财经日历长列表滚动更顺」 (financial calendar long lists scroll more smoothly), and should also include what it fixed alongside:
「点日期切回对应列表」 (tapping a date switches back to the matching list). Without `e48c82f`, not a single word of this could be written.

If you can't tell the order, confirm with `git merge-base --is-ancestor <revert> <later-commit>`.

### Affected deployment units

This table lists which sites the change landed on (🇭🇰 HK / 🇸🇬 SG / 🌐 Longbridge.com / 📰 Discover / 📦 Shell).

**A change affecting only one site must not be written as global.** Before writing, confirm each item's audience:

- Only SG → 「新加坡站的…」 ("the Singapore site's…"), not 「网页版新增…」 ("the web version adds…")
- Only Longbridge.com → 「官网…」 ("the website…"); that's the marketing site, not the trading product
- Discover → only this is what most users understand as 「网页版」 ("the web version")

The table also marks "to ship / shipped" (「要发 / 已发」). **Items marked 「要发」 (to ship) are merged but not yet deployed** — they can't go into a published release.

### Shared package changes

`packages/blocks`, `packages/ui` and similar are depended on by multiple sites; the table header's note that "actual impact needs manual confirmation" means it.
A `blocks` change might affect both the news feed and the community, or show up in only one of them. **If unsure, read the code, or
write the smallest scope you can confirm** — don't overstate it.

## 2. Filter item by item

### Include

A change is worth writing if it affects any of the following:

- What users can do
- How users get something done
- How fast users get something done
- How reliably users get something done
- What information users can see
- Which external connections users can use
- What users can create
- What users can control
- Noticeable visual or interaction changes

### Exclude

These are not written by default:

Refactors / code cleanup / unit tests / E2E tests / dependency upgrades / build changes / CI/CD /
internal logging / internal monitoring / internal API changes / renames / type improvements / internal architecture changes / dev tooling

Plus two kinds especially common in this repo:

- **Features not yet public** (flag still off, only internal accounts can access) — no one can use it even if announced
- **Lint / convention changes** (`stylelint` `lint` `docs` `ci` scopes) — completely invisible to users

### Three categories needing case-by-case judgment

**Performance** — write it only if users can feel it.

```
✗ 治理概览页一次刷新的重复请求
✓ 个股概览页打开更快
```

(✗ "eliminated duplicate requests on overview page refresh"; ✓ "stock overview page opens faster")

Conversely, a `perf` commit doesn't mean users can perceive it. It's worth writing if it changes first paint, long lists, or frequently used paths;
if it just drops one background request, don't.

**Security** — write it only if all three hold: it affects user trust, it changes a security capability users can see, and it's safe to disclose.
**Don't disclose implementation details.** Our positive examples are 「账户中心能看到登录设备」 (login devices visible in the account center) and 「美国站可以自己选 Cookie」 (choose your own cookies on the US site);
negative examples are internal secret scanning and incident records — not a word about those.

**Infrastructure** — not written by default. The exception is when it produces a clear user outcome; then **write only the outcome, not the migration**:

```
技术：图片处理迁到新的 worker 架构
产品：大图上传更不容易失败
```

(Technical: image processing moved to a new worker architecture. Product: large image uploads fail less often.)

### When unsure, ask these six questions

1. Is there a new capability?
2. Did an existing capability get noticeably better?
3. Is there a new usage path?
4. Did an existing path become less annoying?
5. Was a user-visible problem fixed?
6. Can you explain the benefit without mentioning implementation?

**If all six are no, exclude it.** Don't pad the count with engineering work.

### The fetched output's sections are only signals

`✨ 新功能` (new features) `🐛 修复` (fixes) `⚡ 性能` (performance) are split mechanically by commit prefix; they aren't conclusions. Something labeled `feat` may be internal
rework; something labeled `fix` may be the most worth-saying thing in the release. **Look at every item yourself.**

## 3. A lone fix may hide an entire feature

When a fix mentions **a term you haven't seen** — 「并列详情面板」 (side-by-side detail panel), 「流式缩放」 (fluid scaling), 「吸顶条」 (sticky bar) — don't just
write it up as an isolated bug. Search git for the term:

```bash
git -C <upstream-repo> log --since=<two-months-ago> --format='%h %s' | grep '并列详情'
```

Real example. The source for `release-2026.09.21` had only this line:

> **quote** 并列详情面板标题未滚动时完整展示 — `dcb2c1a`

(side-by-side detail panel title shown in full before scrolling)

Searching 「并列详情」 reveals 8 feat commits behind it:

```
99402794f  资讯与帖子在 2K 以上改为列表右侧并列展开详情
379af6cf5  并列详情改为不改地址栏，两栏固定高度独立滚动
ac701a375  并列详情限定 2K 以上，开合改为抽屉动画
1f0854227  并列详情改为独立卡片，生效范围下放到 1440 档
2e16b129c  并列详情吸顶条显示标题/作者
…
```

That was the month's biggest feature. Writing only that fix treats the feature's finishing touch as the feature itself.

**Signal**: the fix's wording carries a complete product concept (panel, mode, card, entry point), and that concept never appeared in
earlier releases — meaning it's new; go find where it came from.

## 4. Merge duplicates

A feature is often split across several commits, even across several tags. Readers see features, not the implementation process.

```
feat: 新增导出接口
feat: 新增导出按钮
fix: 导出超时
refactor: 导出 worker
test: 导出 worker

→ 一条：大批量数据可以一次导出，不用再拆成几份
```

(Add export API / add export button / fix export timeout / refactor export worker / test export worker → one item: "large datasets can be exported in one go, no more splitting them up".)

For the same feature across tags (page first, then filters, then fixes), write it in full under the version where the feature came together;
don't write it once per tag. For how that maps onto files, see "Not every tag deserves its own section" in `SKILL.md`.

## Before finalizing

- [ ] Compared the repo's tag count against the raw file count; filled gaps from git log
- [ ] Searched git for the origin of every unfamiliar product concept in the source
- [ ] Checked the final state of every entry under "Reverted"
- [ ] Each item's audience matches "Affected deployment units"
- [ ] Nothing marked 「要发」 (to ship) but not yet deployed was included
- [ ] Every item can be justified by at least one of the six questions
- [ ] No single feature was split into several items
