/**
 * Error model + exit codes for `wm`.
 *
 * Exit codes are stable contract — kept in sync with `mcp-director` error codes
 * (see ../docs/CONVENTIONS.md). Used by CI, shell scripts, and humans.
 */

export const ExitCode = {
  OK: 0,
  USAGE: 2, // bad arguments / unknown command
  AUTH_REQUIRED: 10, // not logged in / missing api key
  AUTH_INVALID: 11, // server rejected token (401/403)
  ASSET_URL_REQUIRED: 20, // missing or unreachable user-provided URL
  UPGRADE_REQUIRED: 30, // 402 insufficient credits
  RATE_LIMITED: 31, // 429
  NETWORK: 40, // transport / DNS / TLS
  SERVER: 50, // 5xx
  TIMEOUT: 51, // server-side or client-side deadline exceeded
  UNEXPECTED: 99, // crashed / not classifiable
} as const

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode]

/**
 * The canonical error codes returned by the WM Studio API and `mcp-director`.
 * Keeping the same vocabulary across CLI / MCP / SDK is the whole point.
 */
export const ErrorCode = {
  AuthRequired: "auth_required",
  AuthInvalid: "auth_invalid",
  AssetUrlRequired: "asset_url_required",
  UpgradeRequired: "upgrade_required",
  RateLimited: "rate_limited",
  Network: "network",
  Server: "server",
  Timeout: "timeout",
  Usage: "usage",
  Unexpected: "unexpected",
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

export class WmCliError extends Error {
  readonly code: ErrorCodeValue
  readonly exitCode: ExitCodeValue
  readonly details?: Record<string, unknown>

  constructor(opts: {
    code: ErrorCodeValue
    exitCode: ExitCodeValue
    message: string
    details?: Record<string, unknown>
  }) {
    super(opts.message)
    this.name = "WmCliError"
    this.code = opts.code
    this.exitCode = opts.exitCode
    this.details = opts.details
  }

  static authRequired(message = "Not logged in. Run `wm login` first."): WmCliError {
    return new WmCliError({
      code: ErrorCode.AuthRequired,
      exitCode: ExitCode.AUTH_REQUIRED,
      message,
    })
  }

  static authInvalid(message = "Invalid or expired API key."): WmCliError {
    return new WmCliError({
      code: ErrorCode.AuthInvalid,
      exitCode: ExitCode.AUTH_INVALID,
      message,
    })
  }

  static assetUrlRequired(uploadUrl: string, message?: string): WmCliError {
    return new WmCliError({
      code: ErrorCode.AssetUrlRequired,
      exitCode: ExitCode.ASSET_URL_REQUIRED,
      message: message ?? `A real public asset URL is required. Upload at ${uploadUrl}.`,
      details: { uploadUrl },
    })
  }

  static upgradeRequired(upgradeUrl: string, message?: string): WmCliError {
    return new WmCliError({
      code: ErrorCode.UpgradeRequired,
      exitCode: ExitCode.UPGRADE_REQUIRED,
      message: message ?? `Insufficient credits. Top up at ${upgradeUrl} and re-run.`,
      details: { upgradeUrl },
    })
  }

  static usage(message: string): WmCliError {
    return new WmCliError({
      code: ErrorCode.Usage,
      exitCode: ExitCode.USAGE,
      message,
    })
  }
}
