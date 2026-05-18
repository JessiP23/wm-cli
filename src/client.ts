/**
 * Thin HTTP client for the WM Studio REST API.
 *
 * Endpoints mirror what `mcp-director/src/wmstudio_client.py` already calls
 * — keeping the contract identical means the CLI is a drop-in alternative
 * to the MCP for the same underlying backend.
 */
import { request } from "undici"
import { z } from "zod"
import { DEFAULTS } from "./constants.js"
import { WmCliError } from "./errors.js"
import type { ResolvedConfig } from "./config.js"

const ApiErrorSchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  requiresTopUp: z.boolean().optional(),
  upgradeUrl: z.string().url().optional(),
  uploadUrl: z.string().url().optional(),
})

export interface JsonRequest {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  path: string
  body?: Record<string, unknown>
  query?: Record<string, string | number | boolean | undefined>
  timeoutMs?: number
}

export class WmApiClient {
  constructor(private readonly cfg: ResolvedConfig) {}

  /** GET /me — returns account + credit balance. */
  whoami(): Promise<{
    userId: string
    email: string
    creditsRemaining: number
    plan: string
  }> {
    return this.json({ method: "GET", path: "/me" })
  }

  /** Validate the current api key without side-effects. */
  async ping(): Promise<boolean> {
    try {
      await this.whoami()
      return true
    } catch (err) {
      if (err instanceof WmCliError && err.code === "auth_invalid") return false
      throw err
    }
  }

  /** Generic JSON helper. */
  async json<T = unknown>(req: JsonRequest): Promise<T> {
    if (!this.cfg.apiKey) throw WmCliError.authRequired()

    const url = new URL(req.path.replace(/^\//, ""), this.cfg.apiUrl.replace(/\/?$/, "/"))
    if (req.query) {
      for (const [k, v] of Object.entries(req.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v))
      }
    }

    const ac = new AbortController()
    const timeout = setTimeout(() => ac.abort(), req.timeoutMs ?? DEFAULTS.requestTimeoutMs)

    try {
      const res = await request(url, {
        method: req.method,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${this.cfg.apiKey}`,
          "user-agent": userAgent(),
        },
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: ac.signal,
      })

      const text = await res.body.text()
      const parsed: unknown = text ? safeJson(text) : undefined

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return parsed as T
      }
      throw classify(res.statusCode, parsed, this.cfg)
    } finally {
      clearTimeout(timeout)
    }
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function classify(status: number, payload: unknown, cfg: ResolvedConfig): WmCliError {
  const parsed = ApiErrorSchema.safeParse(payload)
  const data = parsed.success ? parsed.data : {}
  const msg = data.message ?? data.error ?? `HTTP ${status}`

  if (status === 401 || status === 403) return WmCliError.authInvalid(msg)
  if (status === 402 || data.requiresTopUp) {
    return WmCliError.upgradeRequired(data.upgradeUrl ?? cfg.upgradeUrl, msg)
  }
  if (status === 422 && data.code === "asset_url_required") {
    return WmCliError.assetUrlRequired(data.uploadUrl ?? cfg.uploadUrl, msg)
  }
  return new WmCliError({
    code: status >= 500 ? "server" : "usage",
    exitCode: status >= 500 ? 50 : 2,
    message: msg,
    details: { status, payload },
  })
}

function userAgent(): string {
  return `wm-cli/${process.env.npm_package_version ?? "dev"} (node ${process.version})`
}
