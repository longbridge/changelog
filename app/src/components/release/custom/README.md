# 试验组件

某一版需要、但还没稳定到进公共组件的交互放这里。

```mdx
import Timeline from '@components/release/custom/Timeline.astro'

<Timeline ... />
```

这一层不进详情页的 `mdxComponents` 全局注入，所以必须显式 import——改坏了只影响用到它的那几篇。

同一个交互被三个以上版本用过、形态稳定了，就移到上一层 `src/components/release/`，并同步更新详情页的注入映射、`/[locale]/preview` 预览页、`release-notes-media` skill 清单和 README。规范见 `release-page-compose` skill。
