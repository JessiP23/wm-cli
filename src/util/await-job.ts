/**
 * Handle the queued-job response shape returned by /studio/generate-image,
 * /studio/generate-video and /studio/upscale-image.
 *
 * If the response carries `queued: true`, poll `/studio/jobs/:id` until it
 * reports `status: "succeeded"` (and the requested URL field is present)
 * or `status: "failed"`. Otherwise, return the response as-is so old/sync
 * code paths keep working.
 */
import type { WmApiClient } from "../client.js"
import { poll } from "./poll.js"
import { WmCliError, ExitCode } from "../errors.js"

export type Asset = "image" | "video"

interface SubmitResponse {
  queued?: boolean
  generationId?: string
  id?: string
  jobId?: string
  imageUrl?: string
  videoUrl?: string
  creditsRemaining?: number
}

interface JobStatus {
  jobId: string
  status: "succeeded" | "running" | "failed"
  imageUrl?: string | null
  videoUrl?: string | null
  creditsCharged?: number | null
}

export interface AwaitedJob {
  imageUrl?: string
  videoUrl?: string
  creditsRemaining?: number
  jobId?: string
}

export async function awaitJob(
  client: WmApiClient,
  submit: SubmitResponse,
  asset: Asset,
  onTick?: (s: JobStatus) => void
): Promise<AwaitedJob> {
  // Sync response: URL already present.
  if (!submit.queued) {
    const url = asset === "image" ? submit.imageUrl : submit.videoUrl
    if (url) {
      return {
        [asset === "image" ? "imageUrl" : "videoUrl"]: url,
        creditsRemaining: submit.creditsRemaining,
      }
    }
  }

  const id = submit.generationId ?? submit.id
  if (!id) {
    throw new WmCliError({
      code: "server",
      exitCode: ExitCode.SERVER,
      message: "Server did not return a generationId to poll.",
    })
  }

  const final = await poll<JobStatus>({
    fetch: () => client.json<JobStatus>({ method: "GET", path: `/studio/jobs/${id}` }),
    done: (s) => s.status === "succeeded" || s.status === "failed",
    onTick,
  })

  if (final.status !== "succeeded") {
    throw new WmCliError({
      code: "server",
      exitCode: ExitCode.SERVER,
      message: `Job ${id} finished with status ${final.status}.`,
    })
  }

  const url = asset === "image" ? final.imageUrl : final.videoUrl
  if (!url) {
    throw new WmCliError({
      code: "server",
      exitCode: ExitCode.SERVER,
      message: `Job ${id} succeeded but no ${asset} URL was returned.`,
    })
  }

  return {
    [asset === "image" ? "imageUrl" : "videoUrl"]: url,
    jobId: id,
  }
}
