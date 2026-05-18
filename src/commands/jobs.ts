/**
 * `wm jobs list|get` — inspect async generation jobs and runs.
 */
import type { Command } from "commander"
import { makeCtx, requireAuth, renderResult } from "./_shared.js"

export function registerJobs(program: Command): void {
  const jobs = program.command("jobs").description("List and inspect generation jobs.")

  jobs
    .command("list")
    .description("List recent jobs (default: 20 most recent).")
    .option("-l, --limit <n>", "Number of jobs", "20")
    .option("-s, --status <s>", "Filter by status (running|succeeded|failed|cancelled)")
    .action(async (opts: { limit?: string; status?: string }) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)
      const data = await ctx.client.json({
        method: "GET",
        path: "/studio/jobs",
        query: { limit: opts.limit, status: opts.status },
      })
      renderResult(ctx, data)
    })

  jobs
    .command("get <jobId>")
    .description("Fetch a single job by id.")
    .action(async (jobId: string) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)
      const data = await ctx.client.json({ method: "GET", path: `/studio/jobs/${jobId}` })
      renderResult(ctx, data)
    })
}
