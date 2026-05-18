import type { Command } from "commander"
import ora from "ora"
import { makeCtx, requireAuth, renderResult, confirmCost, renderCreditsFooter } from "./_shared.js"
import { DEFAULT_MODELS } from "../constants.js"
import { downloadToFile } from "../util/download.js"
import { awaitJob } from "../util/await-job.js"
import { logger } from "../logger.js"

interface UpscaleOpts {
  factor?: string
  topazModel?: string
  faceEnhancement?: boolean
  out?: string
  yes?: boolean
}

export function registerUpscale(program: Command): void {
  program
    .command("upscale <imageUrl>")
    .description("Topaz upscale of an image (factor 1–4).")
    .option("-f, --factor <n>", "Upscale factor (1|2|3|4)", "2")
    .option("--topaz-model <name>", "Topaz preset", "Standard V2")
    .option("--no-face-enhancement", "Disable Topaz face enhancement")
    .option("-o, --out <file>", "Download the result to this path")
    .option("-y, --yes", "Skip the cost confirmation prompt", false)
    .action(async (imageUrl: string, opts: UpscaleOpts) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)

      const factor = opts.factor ? Number(opts.factor) : 2
      const ok = await confirmCost(
        ctx,
        Boolean(opts.yes),
        {
          model: DEFAULT_MODELS.upscaleImage,
          upscale_factor: factor,
        },
        `Upscale ${factor}x · ${DEFAULT_MODELS.upscaleImage}`
      )
      if (!ok) {
        logger.info("Cancelled.")
        return
      }

      const spinner = ctx.json ? null : ora("Upscaling…").start()
      try {
        const submit = await ctx.client.json<Record<string, unknown>>({
          method: "POST",
          path: "/studio/upscale-image",
          body: {
            image_url: imageUrl,
            upscale_factor: factor,
            topaz_model: opts.topazModel,
            face_enhancement: opts.faceEnhancement,
          },
        })
        const result = await awaitJob(ctx.client, submit, "image", (s) => {
          if (spinner) spinner.text = `Upscale · ${s.status}`
        })
        spinner?.succeed("Upscaled.")
        if (opts.out && result.imageUrl) await downloadToFile(result.imageUrl, opts.out)
        renderResult(ctx, result, `→ ${result.imageUrl}`)
        renderCreditsFooter(ctx, result)
      } catch (e) {
        spinner?.fail("Upscale failed.")
        throw e
      }
    })
}
