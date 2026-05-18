/**
 * Generic async-job poller. Used by `gen video` and `campaign` commands.
 */
import { DEFAULTS } from "../constants.js"
import { WmCliError, ExitCode } from "../errors.js"

export interface PollOptions<T> {
  /** Function that fetches the latest status. */
  fetch: () => Promise<T>
  /** Returns true when the job has reached a terminal state. */
  done: (state: T) => boolean
  /** Optional hook fired on each tick (for spinners / progress). */
  onTick?: (state: T) => void
  intervalMs?: number
  timeoutMs?: number
}

export async function poll<T>(opts: PollOptions<T>): Promise<T> {
  const interval = opts.intervalMs ?? DEFAULTS.jobPollIntervalMs
  const deadline = Date.now() + (opts.timeoutMs ?? DEFAULTS.jobPollTimeoutMs)

  for (;;) {
    const state = await opts.fetch()
    opts.onTick?.(state)
    if (opts.done(state)) return state
    if (Date.now() > deadline) {
      throw new WmCliError({
        code: "timeout",
        exitCode: ExitCode.TIMEOUT,
        message: "Job polling timed out.",
      })
    }
    await sleep(interval)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
