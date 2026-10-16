import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { DEFAULT_LOCALE, LOCALES, SITE_SEGMENT, siteConfig } from './config/site.config'
import { satteri } from '@astrojs/markdown-satteri'
import { kbdPlugin } from './src/lib/kbd-plugin'

export default defineConfig({
  site: siteConfig.url,
  // 线上地址是 /<locale>/changelog/…，语言在前，路由本身就带 changelog 段（src/pages/[locale]/changelog），
  // 所以线上、本地 base 都是 /
  base: siteConfig.base,
  build: {
    // 资源收在 /changelog/_astro/ 下：主站占着根路径，nginx 只需为这一个前缀回源
    assets: `${SITE_SEGMENT}/_astro`,
  },
  // 对外地址不带尾斜杠：canonical、sitemap、站内链接都按这个生成
  trailingSlash: 'never',
  integrations: [
    mdx(),
    sitemap({
      // 与资源一样收在 /changelog/ 下，不和主站根路径的 sitemap 撞名
      filenameBase: `${SITE_SEGMENT}/sitemap`,
      // 只收各语言的页面：/ 与 /changelog 是跳转页（/ 在线上还是主站的地址），内部预览页也不进站点地图
      filter: (page) =>
        LOCALES.some((locale) => new URL(page).pathname.includes(`/${locale}/${SITE_SEGMENT}`)) &&
        !page.includes('/preview') &&
        // 不带 v 的旧大版本地址只是跳转页
        !new RegExp(`/${SITE_SEGMENT}/[^/]+/\\d[^/]*/?$`).test(new URL(page).pathname),
      // 地址统一成不带尾斜杠
      serialize: (item) => ({ ...item, url: item.url.replace(/\/$/, '') }),
      i18n: {
        defaultLocale: DEFAULT_LOCALE,
        locales: Object.fromEntries(LOCALES.map((locale) => [locale, locale])),
      },
    }),
  ],
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    // 只用它算 Astro.currentLocale，路由全在 src/pages 里手写：
    // 自动路由的中间件会把不带语言前缀的地址一律判 404，/changelog 跳转页（读主站的 locale cookie）
    // 与根路径在 dev 下都打不开；生产是静态产物，不受中间件影响
    routing: 'manual',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    // 行内代码里的快捷键（`Cmd + N`）渲染成键帽。Astro 7 默认处理器是 Sätteri，
    // 不跑 remark 插件，要用它自己的 hast 插件；MDX 默认继承这里的 processor
    processor: satteri({ hastPlugins: [kbdPlugin] }),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
})
