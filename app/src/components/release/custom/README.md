# Experimental components

Interactions that a particular release needs but that aren't stable enough to become shared components live here.

```mdx
import Timeline from '@components/release/custom/Timeline.astro'

<Timeline ... />
```

This layer is not globally injected via the detail page's `mdxComponents`, so it must be imported explicitly — if you break something here, only the pages that use it are affected.

Once the same interaction has been used by three or more releases and its shape has stabilized, move it up one level to `src/components/release/`, and update the detail page's injection map, the `/[locale]/changelog/preview` preview page, the `release-notes-media` skill's component list and the README accordingly. See the `release-page-compose` skill for the conventions.
