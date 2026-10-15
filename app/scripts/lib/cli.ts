/** 极简参数解析：支持 --key value、--key=value、--flag */
export function parseArgs(argv = process.argv.slice(2)) {
  const flags: Record<string, string | boolean> = {}
  const positionals: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      positionals.push(token)
      continue
    }
    const [key, inline] = token.slice(2).split('=')
    if (inline !== undefined) {
      flags[key] = inline
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      flags[key] = argv[++i]
    } else {
      flags[key] = true
    }
  }
  return { flags, positionals }
}

export const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
}
