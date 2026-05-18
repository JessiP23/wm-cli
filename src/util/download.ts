/**
 * Stream a remote asset to a local path. Used by `--out` flags.
 */
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { pipeline } from "node:stream/promises"
import { request } from "undici"

export async function downloadToFile(url: string, outPath: string): Promise<void> {
  await mkdir(dirname(outPath), { recursive: true })
  const res = await request(url, { method: "GET" })
  if (res.statusCode >= 400) throw new Error(`download failed: HTTP ${res.statusCode}`)
  // undici's res.body is already a Node Readable — pipe it straight.
  await pipeline(res.body, createWriteStream(outPath))
}
