/**
 * Shared command helpers: resolve config, build client, render output.
 */
import type { Command } from "commander"
import { resolveConfig, type ResolvedConfig } from "../config.js"
import { WmApiClient } from "../client.js"
import { logger } from "../logger.js"
import { WmCliError } from "../errors.js"

export interface GlobalFlags {
  apiUrl?: string
  apiKey?: string
  json?: boolean
}

export interface CommandCtx {
  cfg: ResolvedConfig
  client: WmApiClient
  json: boolean
}

export function makeCtx(program: Command): CommandCtx {
  // Walk up to the root program so subcommands inherit global flags.
  const root = program.parent ?? program
  const opts = root.opts<GlobalFlags>()
  const cfg = resolveConfig({ apiUrl: opts.apiUrl, apiKey: opts.apiKey })
  return { cfg, client: new WmApiClient(cfg), json: Boolean(opts.json) }
}

export function requireAuth(
  ctx: CommandCtx
): asserts ctx is CommandCtx & { cfg: ResolvedConfig & { apiKey: string } } {
  if (!ctx.cfg.apiKey) throw WmCliError.authRequired()
}

export function renderResult(ctx: CommandCtx, payload: unknown, summary?: string): void {
  if (ctx.json) {
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n")
    return
  }
  if (summary) logger.info(summary)
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n")
}
