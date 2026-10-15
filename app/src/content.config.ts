import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { majorSchema, releaseSchema } from '../config/content.schema'

/**
 * 一条 release = 一个语言 × 一个版本的 MDX。
 * 文件路径约定：src/content/releases/<locale>/<product>/<tag>.mdx
 * schema 在 config/content.schema.ts，与编辑后台共用。
 */
const releases = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/content/releases',
    // 默认实现会把 v1.19.0 slug 成 v1190，不同版本可能撞车。
    // 这里保留磁盘上的路径，URL 片段就等于文件名。
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: releaseSchema,
})

/**
 * 一条 major = 一个语言 × 一个大版本的总结，是列表页展示的粒度。
 * 文件路径约定：src/content/majors/<locale>/<product>/<major>.mdx
 * 正文写这个大版本整体带来了什么，小版本的细节留在 releases 里。
 */
const majors = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/content/majors',
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: majorSchema,
})

export const collections = { releases, majors }
