/**
 * Shared command helpers: resolve config, build client, render output.
 */
import type { Command } from "commander"
import { confirm, select } from "@inquirer/prompts"
import kleur from "kleur"
import { resolveConfig, type ResolvedConfig } from "../config.js"
import { WmApiClient } from "../client.js"
import { logger } from "../logger.js"
import { WmCliError } from "../errors.js"
import { ASPECT_RATIOS } from "../constants.js"

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
  let credits: number | null = null
  try {
    const res = await ctx.client.estimatePricing(body)
    credits = res.credits
  } catch (err) {
    if (!ctx.json) {
      logger.warn(
        `Could not fetch cost estimate (${err instanceof Error ? err.message : String(err)}). ` +
          `You will be charged the actual amount on success.`
      )
    }
  }

  if (ctx.json || skipPrompt) {
    if (credits !== null && !ctx.json) {
      logger.info(`${summary} — estimated ${kleur.yellow(`${credits} credits`)}`)
    }
    return true
  }

  if (credits === null) {
    return confirm({
      message: `${summary}. Cost unknown. Proceed anyway?`,
      default: false,
    })
  }

  const msg = `${summary}\n  Estimated cost: ${kleur.yellow(`${credits} credits`)}\n  Proceed?`
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

/**
 * Prompt the user for an aspect ratio when none was provided via CLI flag.
 *
 * Extensible: when more image params are added in the future (e.g. style
 * presets, output format), add them as separate prompt functions following
 * the same pattern — each reads from a shared constant list and only fires
 * when the corresponding CLI flag is absent.
 *
 * @param cliValue  value from --aspect-ratio (may be undefined)
 * @param jsonMode  when true, skip interactive prompts entirely
 * @returns the resolved aspect ratio string (e.g. "16:9")
 */
export async function promptAspectRatio(
  cliValue: string | undefined,
  jsonMode: boolean
): Promise<string> {
  if (cliValue) return cliValue
  if (jsonMode) return "1:1" // non-interactive mode: pick the default
  return select({
    message: "Choose aspect ratio:",
    choices: ASPECT_RATIOS.map((r) => ({ name: r.label, value: r.value })),
    default: "1:1",
  })
}
