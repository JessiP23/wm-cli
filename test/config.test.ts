import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readFileConfig, writeFileConfig, resolveConfig, configPath } from "../src/config.js"
import { ENV } from "../src/constants.js"

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "wm-cli-cfg-"))
  process.env[ENV.ConfigDir] = dir
  delete process.env[ENV.ApiKey]
  delete process.env[ENV.ApiUrl]
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  delete process.env[ENV.ConfigDir]
})

describe("config", () => {
  it("returns empty config when no file exists", () => {
    expect(readFileConfig()).toEqual({})
  })

  it("round-trips a written config", () => {
    writeFileConfig({ apiKey: "sk-test-123" })
    expect(readFileConfig().apiKey).toBe("sk-test-123")
  })

  it("writes the config file with 0600 perms", () => {
    writeFileConfig({ apiKey: "sk-test-123" })
    const mode = statSync(configPath()).mode & 0o777
    expect(mode).toBe(0o600)
  })

  it("environment variable beats file", () => {
    writeFileConfig({ apiKey: "from-file" })
    process.env[ENV.ApiKey] = "from-env"
    expect(resolveConfig().apiKey).toBe("from-env")
  })

  it("explicit override beats env and file", () => {
    writeFileConfig({ apiKey: "from-file" })
    process.env[ENV.ApiKey] = "from-env"
    expect(resolveConfig({ apiKey: "from-flag" }).apiKey).toBe("from-flag")
  })

  it("ignores a corrupt config file gracefully", () => {
    writeFileConfig({ apiKey: "ok" })
    // Corrupt it
    const path = configPath()
    writeFileSync(path, "{not json", "utf8")
    expect(readFileConfig()).toEqual({})
  })
})
