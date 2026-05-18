// Entrypoint. tsup prepends the `#!/usr/bin/env node` shebang in the build banner.
import { run } from "./cli.js"
import { WmCliError, ExitCode } from "./errors.js"
import { logger } from "./logger.js"

run(process.argv).catch((err: unknown) => {
  if (err instanceof WmCliError) {
    logger.error(err.message, err.details)
    process.exit(err.exitCode)
  }
  const message = err instanceof Error ? err.message : String(err)
  logger.error(`unexpected error: ${message}`)
  process.exit(ExitCode.UNEXPECTED)
})
