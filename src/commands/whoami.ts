import type { Command } from "commander"
import { makeCtx, requireAuth, renderResult } from "./_shared.js"

export function registerWhoami(program: Command): void {
  program
    .command("whoami")
    .description("Show the logged-in account and remaining credits.")
    .action(async () => {
      const ctx = makeCtx(program)
      requireAuth(ctx)
      const me = await ctx.client.whoami()
      renderResult(ctx, me, `${me.email} · ${me.creditsRemaining} credits · plan ${me.plan}`)
    })
}
