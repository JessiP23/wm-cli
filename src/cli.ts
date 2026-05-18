/**
 * Commander root. Each subcommand lives in its own file under ./commands.
 */
import { Command } from "commander"
import { registerLogin } from "./commands/login.js"
import { registerWhoami } from "./commands/whoami.js"
import { registerGen } from "./commands/gen.js"
import { registerUpscale } from "./commands/upscale.js"
import { registerCampaign } from "./commands/campaign.js"
import { registerJobs } from "./commands/jobs.js"

export async function run(argv: string[]): Promise<void> {
  const program = new Command()
    .name("wm")
    .description(
      "WM Studio command-line client. Generate images, videos, brand campaigns, and 3D assets."
    )
    .version(VERSION, "-v, --version")
    .option("--api-url <url>", "Override WM Studio API base URL")
    .option("--api-key <key>", "Override API key (otherwise WM_API_KEY or ~/.wm/config.json)")
    .option("--json", "Emit machine-readable JSON output", false)
    .showHelpAfterError("(run `wm <command> --help` for details)")

  registerLogin(program)
  registerWhoami(program)
  registerGen(program)
  registerUpscale(program)
  registerCampaign(program)
  registerJobs(program)

  await program.parseAsync(argv)
}

// Injected at build time by tsup via `define` — fallback for `tsx`/`vitest`.
declare const __VERSION__: string | undefined
const VERSION: string =
  (typeof __VERSION__ !== "undefined" && __VERSION__) || process.env.npm_package_version || "0.0.0-dev"
