import { z } from 'zod'
import { LOCALES } from './site.config'

/**
 * 内容集合的 frontmatter schema。
 * 站点（src/content.config.ts）与脚本共用同一份。
 */

export const STATUSES = ['draft', 'published', 'skipped'] as const
export type Status = (typeof STATUSES)[number]

export const translationSchema = z.object({
  from: z.enum(LOCALES),
  status: z.enum(['pending', 'done']),
})

/** 一条 release = 一个语言 × 一个版本 */
export const releaseSchema = z.object({
  product: z.string(),
  version: z.string(),
  tag: z.string(),
  locale: z.enum(LOCALES),
  title: z.string(),
  summary: z.string().default(''),
  /** 人/AI 写的亮点短语，用要点展示；没写就不显示亮点块 */
  highlights: z.array(z.string()).default([]),
  /** 本次涉及的模块标签，可从原文机械提取，用小标签展示 */
  topics: z.array(z.string()).default([]),
  releasedAt: z.coerce.date(),
  platforms: z.array(z.string()).default([]),
  /** draft 仅本地可见；skipped 永不展示（原文无对外价值） */
  status: z.enum(STATUSES).default('draft'),
  /** 这份内容是从别的语言占位来的，pending 表示还没翻译 */
  translation: translationSchema.optional(),
  source: z.object({
    provider: z.string(),
    repo: z.string(),
    url: z.string().url(),
  }),
})

/** 一条 major = 一个语言 × 一个大版本的总结，列表页展示的粒度 */
export const majorSchema = z.object({
  product: z.string(),
  major: z.string(),
  locale: z.enum(LOCALES),
  title: z.string(),
  summary: z.string().default(''),
  highlights: z.array(z.string()).default([]),
  /** 列表页头条位的配图，自家 CDN 完整 URL；没有就只排文字 */
  cover: z.string().url().optional(),
  /** 配了 cover 就必须写，读屏用户靠它理解这张图 */
  coverAlt: z.string().optional(),
  /** draft 仅本地可见；skipped 永不展示 */
  status: z.enum(STATUSES).default('draft'),
  translation: translationSchema.optional(),
})

export type ReleaseFrontmatter = z.input<typeof releaseSchema>
export type MajorFrontmatter = z.input<typeof majorSchema>
