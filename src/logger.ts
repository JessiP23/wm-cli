/**
 * Tiny structured logger. Console output is colourised for humans (stderr);
 * when `WM_LOG_FORMAT=json` is set, emits JSON lines compatible with the same
 * shape used by `mcp-director` (`event`, `level`, `ts`, …extra).
 */
import kleur from "kleur"
import { ENV } from "./constants.js"

type Level = "debug" | "info" | "warn" | "error"

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

function currentLevel(): Level {
  const raw = process.env[ENV.LogLevel]?.toLowerCase() as Level | undefined
  return raw && raw in LEVEL_ORDER ? raw : "info"
}

function asJson(): boolean {
  return process.env.WM_LOG_FORMAT === "json"
}

function emit(level: Level, message: string, extra?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel()]) return

  if (asJson()) {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event: message,
      ...extra,
    })
    process.stderr.write(line + "\n")
    return
  }

  const tag =
    level === "error"
      ? kleur.red().bold("✖")
      : level === "warn"
        ? kleur.yellow().bold("!")
        : level === "info"
          ? kleur.cyan().bold("›")
          : kleur.gray("·")
  const detail = extra && Object.keys(extra).length ? " " + kleur.gray(JSON.stringify(extra)) : ""
  process.stderr.write(`${tag} ${message}${detail}\n`)
}

export const logger = {
  debug: (m: string, e?: Record<string, unknown>) => emit("debug", m, e),
  info: (m: string, e?: Record<string, unknown>) => emit("info", m, e),
  warn: (m: string, e?: Record<string, unknown>) => emit("warn", m, e),
  error: (m: string, e?: Record<string, unknown>) => emit("error", m, e),
}
