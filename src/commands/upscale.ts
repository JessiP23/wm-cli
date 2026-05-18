import type { Command } from "commander"
import ora from "ora"
import { makeCtx, requireAuth, renderResult } from "./_shared.js"
import { downloadToFile } from "../util/download.js"
import { awaitJob } from "../util/await-job.js"

interface UpscaleOpts {
  factor?: string
  topazModel?: string
  faceEnhancement?: boolean
  out?: string
}

export function registerUpscale(program: Command): void {
  program
    .command("upscale <imageUrl>")
    .description("Topaz upscale of an image (factor 1–4).")
    .option("-f, --factor <n>", "Upscale factor (1|2|3|4)", "2")
    .option("--topaz-model <name>", "Topaz preset", "Standard V2")
    .option("--no-face-enhancement", "Disable Topaz face enhancement")
    .option("-o, --out <file>", "Download the result to this path")
    .action(async (imageUrl: string, opts: UpscaleOpts) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)
      const spinner = ctx.json ? null : ora("Upscaling…").start()
      try {
        const submit = await ctx.client.json<Record<string, unknown>>({
          method: "POST",
          path: "/studio/upscale-image",
          body: {
            image_url: imageUrl,
            upscale_factor: opts.factor ? Number(opts.factor) : 2,
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
      } catch (e) {
        spinner?.fail("Upscale failed.")
        throw e
      }
    })
}
