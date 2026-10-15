/**
 * 把「看起来是快捷键」的行内代码渲染成键帽（Sätteri hast 插件），样式与 <Kbd> 组件一致（global.css 的 .kbd）。
 *
 *   `Cmd + N`        → [Cmd] + [N]
 *   `Ctrl + [1-9]`   → [Ctrl] + [[1-9]]
 *   `` Cmd + ` ``    → [Cmd] + [`]
 *   `ESC`            → [ESC]
 *
 * 为什么在渲染层做：快捷键大多来自官网仓库的 curated 原文，约定不改写；
 * 以后同步来的新版本也照样写成行内代码，在这里统一处理一次就够。
 *
 * 只认两种：用 + 连起来且至少含一个修饰键；或者本身就是一个按键名。
 * `packages/ui`、提交 hash、命令行这些普通代码不受影响。
 */

import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri'

const MODIFIERS = new Set(
  ['cmd', 'command', 'ctrl', 'control', 'alt', 'option', 'opt', 'shift', 'meta', 'win', 'fn', '⌘', '⌥', '⇧', '⌃'].map(
    (key) => key.toLowerCase(),
  ),
)

const NAMED_KEYS = new Set(
  [
    'esc', 'escape', 'enter', 'return', 'tab', 'space', 'backspace', 'delete', 'del', 'home', 'end',
    'pageup', 'pagedown', 'insert', '↑', '↓', '←', '→',
    ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
  ].map((key) => key.toLowerCase()),
)

/** 一个键最多这么长，避免把一句话或路径当成键 */
const MAX_KEY_LENGTH = 9

/** 能当键帽就返回各个键，否则返回 null */
export function parseShortcut(text: string): string[] | null {
  const value = text.trim()
  if (!value) return null

  if (NAMED_KEYS.has(value.toLowerCase())) return [value]

  // 「+」本身也可能是键（Cmd + +），按「空格可选的 + 分隔」切，再处理末尾的空键
  const parts = value.split(/\s*\+\s*/)
  if (parts.length < 2) return null
  if (parts.at(-1) === '' && parts.at(-2) === '') parts.splice(-2, 2, '+')
  if (parts.some((part) => part === '' || part.length > MAX_KEY_LENGTH || /\s/.test(part))) return null
  if (!parts.some((part) => MODIFIERS.has(part.toLowerCase()))) return null
  return parts
}

type Hast = { type: 'element'; tagName: string; properties: Record<string, unknown>; children: unknown[] }

const element = (tagName: string, className: string, children: unknown[]): Hast => ({
  type: 'element',
  tagName,
  properties: { className: [className] },
  children,
})

/** 与 <Kbd> 组件输出同样的结构，样式都在 global.css 的 .kbd */
export function kbdHast(keys: string[]): Hast {
  return element(
    'span',
    'kbd',
    keys.flatMap((key, index) => [
      ...(index > 0 ? [element('span', 'kbd__plus', [{ type: 'text', value: '+' }])] : []),
      element('kbd', 'kbd__key', [{ type: 'text', value: key }]),
    ]),
  )
}

type HastPlugin = NonNullable<SatteriProcessorOptions['hastPlugins']>[number]

/**
 * Sätteri 的 hast 插件（Astro 7 默认的 Markdown / MDX 处理器，不再跑 remark 插件）。
 * 只处理行内代码：父节点是 <pre> 的是代码块，原样保留。
 */
export const kbdPlugin: HastPlugin = {
  name: 'inline-code-kbd',
  element: {
    filter: ['code'],
    visit(node, ctx) {
      const parent = ctx.parent(node)
      if (parent?.type === 'element' && parent.tagName === 'pre') return
      const keys = parseShortcut(ctx.textContent(node))
      if (keys) ctx.replaceNode(node, kbdHast(keys) as Parameters<typeof ctx.replaceNode>[1])
    },
  },
}
