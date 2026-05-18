/**
 * `wm gen image|video` — image and video generation.
 *
 * Calls the same REST endpoints `mcp-director` already proxies to:
 *   POST /studio/generate-image
 *   POST /studio/generate-video
 */
import type { Command } from "commander"
import ora from "ora"
import { makeCtx, requireAuth, renderResult, confirmCost, renderCreditsFooter, promptAspectRatio } from "./_shared.js"
import { DEFAULT_MODELS } from "../constants.js"
import { downloadToFile } from "../util/download.js"
import { awaitJob } from "../util/await-job.js"
import { logger } from "../logger.js"

interface ImageOpts {
  model?: string
  imageUrl?: string
  aspectRatio?: string
  negativePrompt?: string
  numImages?: string
  seed?: string
  out?: string
  yes?: boolean
}

interface VideoOpts {
  model?: string
  image?: string
  duration?: string
  aspectRatio?: string
  out?: string
  yes?: boolean
}

export function registerGen(program: Command): void {
  const gen = program.command("gen").description("Generate creative assets (image, video).")

  gen
    .command("image <prompt>")
    .description("Text-to-image or image-to-image generation.")
    .option(
      "-m, --model <id>",
      "Provider/model id (auto-picks edit variant when --image-url is passed)"
    )
    .option("-i, --image-url <url>", "Reference image URL for img2img variants")
    .option("-a, --aspect-ratio <ratio>", "1:1 | 16:9 | 9:16 | 4:3 | 3:4")
    .option("-n, --negative-prompt <text>", "Negative prompt")
    .option("--num-images <n>", "Batch size", "1")
    .option("--seed <n>", "Deterministic seed")
    .option("-o, --out <file>", "Download the result to this path")
    .option("-y, --yes", "Skip the cost confirmation prompt", false)
    .action(async (prompt: string, opts: ImageOpts) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)

      // Prompt for aspect ratio when not passed via --aspect-ratio.
      const aspectRatio = await promptAspectRatio(opts.aspectRatio, ctx.json)

      // Pick edit variant for img2img when no explicit model was given.
      const model = opts.model ?? (opts.imageUrl ? DEFAULT_MODELS.imageEdit : DEFAULT_MODELS.image)
      const numImages = opts.numImages ? Number(opts.numImages) : undefined

      const ok = await confirmCost(
        ctx,
        Boolean(opts.yes),
        {
          model,
          aspect_ratio: aspectRatio,
          num_images: numImages,
        },
        `Image generation · ${model}`
      )
      if (!ok) {
        logger.info("Cancelled.")
        return
      }

      const spinner = ctx.json ? null : ora("Generating image…").start()
      try {
        const submit = await ctx.client.json<Record<string, unknown>>({
          method: "POST",
          path: "/studio/generate-image",
          body: {
            prompt,
            model,
            image_url: opts.imageUrl,
            aspect_ratio: aspectRatio,
            negative_prompt: opts.negativePrompt,
            num_images: numImages,
            seed: opts.seed ? Number(opts.seed) : undefined,
          },
        })
        if (spinner) spinner.text = "Rendering image…"
        const result = await awaitJob(ctx.client, submit, "image", (s) => {
          if (spinner) spinner.text = `Image · ${s.status}`
        })
        spinner?.succeed("Image ready.")
        if (opts.out && result.imageUrl) await downloadToFile(result.imageUrl, opts.out)
        renderResult(ctx, result, `→ ${result.imageUrl}`)
        renderCreditsFooter(ctx, result)
      } catch (e) {
        spinner?.fail("Image generation failed.")
        throw e
      }
    })

  gen
    .command("video <prompt>")
    .description("Text-to-video or image-to-video. Async; polls until done.")
    .option("-m, --model <id>", "Provider/model id (auto-picks i2v vs t2v based on --image).")
    .option("-i, --image <url>", "Starting frame for image-to-video")
    .option("-d, --duration <seconds>", "Clip length", "5")
    .option("-a, --aspect-ratio <ratio>", "16:9 | 9:16 | 1:1 | 4:3 | 3:4 | 21:9")
    .option("-o, --out <file>", "Download the final clip to this path")
    .option("-y, --yes", "Skip the cost confirmation prompt", false)
    .action(async (prompt: string, opts: VideoOpts) => {
      const ctx = makeCtx(program)
      requireAuth(ctx)

      const aspectRatio = await promptAspectRatio(opts.aspectRatio, ctx.json)

      const model =
        opts.model ?? (opts.image ? DEFAULT_MODELS.videoImage : DEFAULT_MODELS.videoText)
      const duration = Number(opts.duration)

      const ok = await confirmCost(
        ctx,
        Boolean(opts.yes),
        {
          model,
          duration,
          aspect_ratio: aspectRatio,
        },
        `Video generation · ${model} · ${duration}s`
      )
      if (!ok) {
        logger.info("Cancelled.")
        return
      }

      const spinner = ctx.json ? null : ora("Submitting video job…").start()
      try {
        const submit = await ctx.client.json<Record<string, unknown>>({
          method: "POST",
          path: "/studio/generate-video",
          body: {
            prompt,
            model,
            image_url: opts.image,
            duration,
            aspect_ratio: aspectRatio,
          },
        })
        if (spinner) spinner.text = "Rendering video…"
        const final = await awaitJob(ctx.client, submit, "video", (s) => {
          if (spinner) spinner.text = `Video · ${s.status}`
        })
        spinner?.succeed("Video ready.")
        if (opts.out && final.videoUrl) await downloadToFile(final.videoUrl, opts.out)
        renderResult(ctx, final, `→ ${final.videoUrl}`)
        renderCreditsFooter(ctx, final)
      } catch (e) {
        spinner?.fail("Video generation failed.")
        throw e
      }
    })
}
