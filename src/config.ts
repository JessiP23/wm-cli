/**
 * On-disk config + env merge.
 *
 * Precedence (highest first):
 *   1. CLI flag (--api-url, --api-key)
 *   2. Environment variables (WMSTUDIO_API_URL, WM_API_KEY)
 *   3. ~/.wm/config.json
 *   4. Built-in defaults (constants.ts)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import { z } from "zod"
import { DEFAULTS, ENV } from "./constants.js"

const FileConfigSchema = z.object({
  apiUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  uploadUrl: z.string().url().optional(),
  upgradeUrl: z.string().url().optional(),
  lowCreditsThreshold: z.number().int().nonnegative().optional(),
})

export type FileConfig = z.infer<typeof FileConfigSchema>

export interface ResolvedConfig {
  apiUrl: string
  apiKey: string | undefined
  uploadUrl: string
  upgradeUrl: string
  lowCreditsThreshold: number
  configPath: string
}

export function configDir(): string {
  const override = process.env[ENV.ConfigDir]
  return override && override.length > 0 ? override : join(homedir(), ".wm")
}

export function configPath(): string {
  return join(configDir(), "config.json")
}

export function readFileConfig(): FileConfig {
  const path = configPath()
  if (!existsSync(path)) return {}
  try {
    const raw = readFileSync(path, "utf8")
    return FileConfigSchema.parse(JSON.parse(raw))
  } catch {
    // Corrupt config — return empty rather than crash the CLI on every command.
    return {}
  }
}

export function writeFileConfig(patch: FileConfig): void {
  const merged = { ...readFileConfig(), ...patch }
  const dir = configDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  const file = configPath()
  writeFileSync(file, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600 })
  // Defensive: enforce 0600 even if file pre-existed.
  try {
    chmodSync(file, 0o600)
  } catch {
    /* non-fatal */
  }
  // And 0700 on the dir.
  try {
    chmodSync(dirname(file), 0o700)
  } catch {
    /* non-fatal */
  }
}

export interface ConfigOverrides {
  apiUrl?: string
  apiKey?: string
}

export function resolveConfig(overrides: ConfigOverrides = {}): ResolvedConfig {
  const file = readFileConfig()
  return {
    apiUrl:
      overrides.apiUrl ?? process.env[ENV.ApiUrl] ?? file.apiUrl ?? DEFAULTS.apiUrl,
    apiKey: overrides.apiKey ?? process.env[ENV.ApiKey] ?? file.apiKey,
    uploadUrl: process.env[ENV.UploadUrl] ?? file.uploadUrl ?? DEFAULTS.uploadUrl,
    upgradeUrl: process.env[ENV.UpgradeUrl] ?? file.upgradeUrl ?? DEFAULTS.upgradeUrl,
    lowCreditsThreshold:
      numFromEnv(process.env[ENV.LowCreditsThreshold]) ??
      file.lowCreditsThreshold ??
      DEFAULTS.lowCreditsThreshold,
    configPath: configPath(),
  }
}

function numFromEnv(raw: string | undefined): number | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}
