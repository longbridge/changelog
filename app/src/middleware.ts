import { defineMiddleware } from 'astro:middleware'

// i18n 用 routing: 'manual'（见 astro.config.ts），Astro 要求项目自己提供中间件。
// 路由全在 src/pages 里手写，这里不做任何改写，原样放行
export const onRequest = defineMiddleware((_context, next) => next())
