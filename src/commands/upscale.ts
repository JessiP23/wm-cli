import type { Command } from "commander"
import ora from "ora"
import { makeCtx, requireAuth, renderResult } from "./_shared.js"
import { downloadToFile } from "../util/download.js"

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
        const result = await ctx.client.json<{ imageUrl: string; creditsRemaining: number }>({
          method: "POST",
          path: "/studio/upscale-image",
          body: {
            image_url: imageUrl,
            upscale_factor: opts.factor ? Number(opts.factor) : 2,
            topaz_model: opts.topazModel,
            face_enhancement: opts.faceEnhancement,
          },
        })
        spinner?.succeed("Upscaled.")
        if (opts.out) await downloadToFile(result.imageUrl, opts.out)
        renderResult(ctx, result, `→ ${result.imageUrl}`)
      } catch (e) {
        spinner?.fail("Upscale failed.")
        throw e
      }
    })
}
