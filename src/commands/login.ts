import type { Command } from "commander"
import { password } from "@inquirer/prompts"
import kleur from "kleur"
import { writeFileConfig } from "../config.js"
import { WmApiClient } from "../client.js"
import { resolveConfig } from "../config.js"
import { logger } from "../logger.js"
import { WmCliError } from "../errors.js"
import { DEFAULTS } from "../constants.js"

export function registerLogin(program: Command): void {
  program
    .command("login")
    .description("Save your WM Studio API key to ~/.wm/config.json (chmod 0600).")
    .option("--key <apiKey>", "Pass the API key non-interactively (useful in CI).")
    .action(async (opts: { key?: string }) => {
      if (!opts.key) {
        process.stderr.write(
          `\n${kleur.bold("Get an API key:")} ${kleur.cyan(DEFAULTS.apiKeysUrl)}\n` +
            kleur.dim("  Sign in → Dashboard → API keys → Create new key, then paste below.\n\n")
        )
      }
      const apiKey =
        opts.key ??
        (await password({
          message: "Paste your WM Studio API key:",
          mask: "*",
        }))
      if (!apiKey || apiKey.trim().length === 0) {
        throw WmCliError.usage("API key cannot be empty.")
      }

      const cfg = resolveConfig({ apiKey: apiKey.trim() })
      const client = new WmApiClient(cfg)
      const me = await client.whoami()

      writeFileConfig({ apiKey: apiKey.trim() })
      logger.info(`Logged in as ${me.email} (${me.creditsRemaining} credits remaining).`)
    })
}
