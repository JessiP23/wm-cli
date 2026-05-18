/**
 * Shared command helpers: resolve config, build client, render output.
 */
import type { Command } from "commander"
import { confirm } from "@inquirer/prompts"
import kleur from "kleur"
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

/**
 * Estimate the credit cost of a generation, show it to the user, and
 * ask for confirmation. Returns true if the user accepted (or was
 * auto-skipped via --yes / --json), false if rejected.
 *
 * The pricing endpoint can fail (unknown model, network) — in that case
 * we surface a warning and let the user decide whether to proceed.
 *
 * @param ctx        command context (has client + json flag)
 * @param skipPrompt when true (e.g. --yes flag), skip interactive confirm
 * @param body       what gets POSTed to /creative-studio/pricing — at minimum { model }
 * @param summary    one-line label like "Image generation · nano-banana-pro"
 */
export async function confirmCost(
  ctx: CommandCtx,
  skipPrompt: boolean,
  body: { model: string; [key: string]: unknown },
  summary: string
): Promise<boolean> {
  // --json mode + --yes flag both skip the interactive prompt.
  // We ALWAYS still fetch the estimate so the JSON output can include it.
  let estimate: { credits: number; costUSD: number } | null = null
  try {
    const res = await ctx.client.estimatePricing(body)
    estimate = { credits: res.credits, costUSD: res.costUSD }
  } catch (err) {
    if (!ctx.json) {
      logger.warn(
        `Could not fetch cost estimate (${err instanceof Error ? err.message : String(err)}). ` +
          `You will be charged the actual amount on success.`
      )
    }
  }

  if (ctx.json || skipPrompt) {
    if (estimate && !ctx.json) {
      logger.info(
        `${summary} — estimated ${kleur.yellow(`${estimate.credits} credits`)} ` +
          `(~$${estimate.costUSD.toFixed(3)})`
      )
    }
    return true
  }

  if (!estimate) {
    // No estimate available — prompt without a number.
    return confirm({
      message: `${summary}. Cost unknown. Proceed anyway?`,
      default: false,
    })
  }

  const msg =
    `${summary}\n  Estimated cost: ${kleur.yellow(`${estimate.credits} credits`)} ` +
    `(~$${estimate.costUSD.toFixed(3)})\n  Proceed?`
  return confirm({ message: msg, default: true })
}

/** Render the post-generation credits-remaining footer. */
export function renderCreditsFooter(ctx: CommandCtx, payload: unknown): void {
  if (ctx.json) return
  const obj = payload as { creditsRemaining?: number; creditsCharged?: number } | null
  if (!obj || typeof obj !== "object") return
  const charged =
    typeof obj.creditsCharged === "number" ? `${obj.creditsCharged} credits charged · ` : ""
  if (typeof obj.creditsRemaining === "number") {
    logger.info(`${charged}${obj.creditsRemaining} credits remaining`)
  }
}
