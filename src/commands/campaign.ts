/**
 * `wm campaign` — submit a brief to `director_creative_brief_to_run` or
 * `director_creative_batch_variations`, then poll the resulting run(s).
 */
import type { Command } from "commander"
import ora from "ora"
import { makeCtx, requireAuth, renderResult } from "./_shared.js"
import { poll } from "../util/poll.js"

interface CampaignOpts {
  variations?: string
  duration?: string
  platform?: string
  style?: string
  projectId?: string
  follow?: boolean
}

interface RunStatus {
  runId: string
  status: string
  masterVideoUrl?: string
}

export function registerCampaign(program: Command): void {
  program
    .command("campaign <brief>")
    .description(
      "Turn a creative brief into a full video run (or N variations) via the director_* pipeline."
    )
    .option("-n, --variations <n>", "Generate N parallel variations (1 = single run)", "1")
    .option("-d, --duration <seconds>", "Target duration", "60")
    .option("-p, --platform <name>", "youtube | tiktok | instagram", "youtube")
    .option("-s, --style <name>", "cinematic | ugc | documentary | …", "cinematic")
    .option("--project-id <id>", "Existing wmstudio project id (required for variations)")
    .option("--no-follow", "Submit and return immediately without polling")
    .action(async (brief: string, opts: CampaignOpts) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)
      const variations = Math.max(1, Number(opts.variations ?? "1"))
      const spinner = ctx.json ? null : ora("Submitting brief…").start()

      try {
        const submission =
          variations > 1
            ? await ctx.client.json<{ runIds: string[] }>({
                method: "POST",
                path: "/studio/director/batch-variations",
                body: {
                  base_prompt: brief,
                  max_concurrent: variations,
                  project_id: opts.projectId,
                },
              })
            : await ctx.client.json<{ runIds: string[] }>({
                method: "POST",
                path: "/studio/director/brief-to-run",
                body: {
                  brief,
                  duration_target_seconds: Number(opts.duration),
                  platform: opts.platform,
                  style: opts.style,
                },
              })

        const runIds = submission.runIds ?? []
        if (!opts.follow || runIds.length === 0) {
          spinner?.succeed(`Submitted ${runIds.length} run(s).`)
          renderResult(ctx, submission)
          return
        }

        if (spinner) spinner.text = `Polling ${runIds.length} run(s)…`
        const finals = await Promise.all(
          runIds.map((id) =>
            poll<RunStatus>({
              fetch: () => ctx.client.json({ method: "GET", path: `/studio/runs/${id}` }),
              done: (s) => ["succeeded", "failed", "cancelled"].includes(s.status),
            })
          )
        )
        spinner?.succeed("Run(s) complete.")
        renderResult(ctx, { runs: finals })
      } catch (e) {
        spinner?.fail("Campaign failed.")
        throw e
      }
    })
}
