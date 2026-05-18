/**
 * `wm search` — programmatic web search powered by the WM Studio backend.
 *
 * Calls POST /api/me/tools/web-search. Auth + credit metering happen
 * server-side; the CLI is purely a presentation layer.
 *
 * Pretty output by default. Use `--json` (global flag) for piping:
 *   wm search "next.js 16 release" --json | jq '.results[].url'
 */
import type { Command } from "commander"
import ora from "ora"
import { makeCtx, requireAuth, renderResult } from "./_shared.js"
import { logger } from "../logger.js"

interface SearchOpts {
  max?: string
  depth?: string
  time?: string
  includeDomain?: string[]
  excludeDomain?: string[]
}

interface SearchResultItem {
  title: string
  url: string
  content: string
  score?: unknown
}

interface SearchResponse {
  v: 1
  answer: string | null
  results: SearchResultItem[]
  images: string[]
  followUpQuestions: string[]
  creditsCharged: number
  creditsRemaining: number
}

export function registerSearch(program: Command): void {
  program
    .command("search <query>")
    .description("Search the web (Tavily-powered). Costs 1 credit (basic) or 2 (advanced).")
    .option("-n, --max <n>", "Max results to return (1–10)", "5")
    .option("-d, --depth <level>", "Search depth: basic | advanced", "basic")
    .option(
      "-t, --time <range>",
      "Time filter: day | week | month | year (omit for all-time)"
    )
    .option(
      "--include-domain <domain>",
      "Restrict to this domain (repeatable)",
      collectArg,
      [] as string[]
    )
    .option(
      "--exclude-domain <domain>",
      "Exclude this domain (repeatable)",
      collectArg,
      [] as string[]
    )
    .action(async (query: string, opts: SearchOpts) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)

      const depth = opts.depth === "advanced" ? "advanced" : "basic"
      const max = clampInt(opts.max, 1, 10, 5)

      const spinner = ctx.json ? null : ora(`Searching · ${truncate(query, 50)}`).start()

      try {
        const body: Record<string, unknown> = {
          query,
          maxResults: max,
          searchDepth: depth,
        }
        if (opts.time) body.timeRange = opts.time
        if (opts.includeDomain && opts.includeDomain.length > 0)
          body.includeDomains = opts.includeDomain
        if (opts.excludeDomain && opts.excludeDomain.length > 0)
          body.excludeDomains = opts.excludeDomain

        const result = await ctx.client.json<SearchResponse>({
          method: "POST",
          path: "/me/tools/web-search",
          body,
          // Advanced search can take ~10s; allow generous headroom.
          timeoutMs: 35_000,
        })

        spinner?.succeed(
          `Found ${result.results.length} result(s) · ${result.creditsCharged} credit(s) · ${result.creditsRemaining} remaining`
        )

        if (ctx.json) {
          renderResult(ctx, result)
          return
        }

        renderPretty(result)
      } catch (e) {
        spinner?.fail("Search failed.")
        throw e
      }
    })
}

function collectArg(value: string, previous: string[]): string[] {
  return [...previous, value]
}

function clampInt(raw: string | undefined, min: number, max: number, fallback: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…"
}

function renderPretty(r: SearchResponse): void {
  const out = process.stdout

  if (r.answer) {
    logger.info("\nAnswer:")
    out.write(`  ${r.answer}\n`)
  }

  if (r.results.length > 0) {
    logger.info("\nResults:")
    r.results.forEach((item, i) => {
      out.write(`\n  ${i + 1}. ${item.title || "(untitled)"}\n`)
      out.write(`     ${item.url}\n`)
      const snippet = item.content?.trim().replace(/\s+/g, " ") ?? ""
      if (snippet) out.write(`     ${truncate(snippet, 200)}\n`)
    })
  }

  if (r.followUpQuestions.length > 0) {
    logger.info("\nFollow-up questions:")
    r.followUpQuestions.forEach((q) => out.write(`  · ${q}\n`))
  }

  if (r.images.length > 0) {
    logger.info("\nImages:")
    r.images.forEach((url) => out.write(`  ${url}\n`))
  }

  out.write("\n")
}
