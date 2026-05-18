# @wmstudio/cli — `wm`

> The official command-line client for the WM Studio creative platform.
> Generate images, videos, brand campaigns, and 3D assets from your terminal.

```
npm i -g @wmstudio/cli
wm login
wm gen image "minimalist black ceramic mug, soft daylight" -o mug.png
wm gen video "slow dolly-in on the mug, golden hour" -i ./mug.png -o ad.mp4
wm campaign "premium oat milk launch, Scandinavian minimal" --variations 3
```

## Status

🚧 **0.1.0 — pre-publish scaffold.** This repo currently lives at
`~/wm/wm-cli/` and will be moved to its own GitHub repo (`PrincipeRosso/wm-cli`)
before the first npm release. No `pnpm install` has been run yet — that's the
first action a maintainer takes when they pick this up.

## Why a separate repo?

Same reason `mcp-director` and `director-cut` are their own repos:
**one responsibility, one runtime, one release pipeline**.

| Repo            | Runtime | What it does                          |
| --------------- | ------- | ------------------------------------- |
| `wmstudio`      | TS/Next | Web app + REST API                    |
| `director-cut`  | Python  | Desktop backend + embedded MCP        |
| `mcp-director`  | Python  | Hosted Streamable HTTP MCP            |
| **`wm-cli`**    | **TS**  | **`wm` CLI on npm**                   |

See [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) for the cross-repo contract
(env vars, error codes, default models, REST endpoints, logging shape).

## Architecture

```
┌──────────────┐         API key          ┌──────────────────┐
│   wm (CLI)   │ ───────────────────────▶ │ wmstudio REST API │
└──────────────┘   over HTTPS / undici    └──────────────────┘
                                                   ▲
                                                   │  same endpoints
                                                   │
                                          ┌──────────────────┐
                                          │   mcp-director   │
                                          └──────────────────┘
```

The CLI is a thin, dependency-light HTTP client. It does **not** speak the MCP
protocol — there's no reason for a short-lived terminal process to negotiate
Streamable HTTP + OAuth PKCE when an API key works fine.

## Tech stack

| Concern        | Pick                              | Why                                                |
| -------------- | --------------------------------- | -------------------------------------------------- |
| Language       | TypeScript 5.6, strict, ESM       | Reuse `wmstudio` types later via a published pkg  |
| CLI framework  | `commander`                       | Small, fast cold start, mature                     |
| Prompts        | `@inquirer/prompts`               | Modular, tree-shakeable, async/await native        |
| HTTP           | `undici`                          | Built-in to Node 20+, fastest, AbortController     |
| Schema         | `zod`                             | Same lib `wmstudio` already uses                   |
| Bundler        | `tsup`                            | Single ESM bundle, fast, zero config drift         |
| Lint           | ESLint v9 flat + `typescript-eslint` | Type-aware rules                                |
| Format         | Prettier                          | Matches `wmstudio` house style                     |
| Tests          | Vitest + `msw`                    | Same runner as `wmstudio`; MSW for HTTP fixtures   |
| Release        | Changesets + GitHub Actions       | One source of truth for versions + npm publish     |
| Node target    | 20 LTS                            | `.nvmrc` pinned                                    |

## Commands

| Command                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `wm login`             | Save your API key to `~/.wm/config.json` (chmod 0600)          |
| `wm whoami`            | Show account + remaining credits                               |
| `wm gen image <prompt>`| Text-to-image / image-to-image. `-o` to download.              |
| `wm gen video <prompt>`| Text-to-video / image-to-video. Polls until done.              |
| `wm upscale <url>`     | Topaz upscale 1–4×                                             |
| `wm campaign <brief>`  | Full director_* pipeline. `--variations N` for parallel runs.  |
| `wm jobs list`         | Recent generation jobs                                         |
| `wm jobs get <id>`     | Single job status                                              |

Global flags: `--api-url`, `--api-key`, `--json`, `-v / --version`, `--help`.

## Auth precedence

1. `--api-key` flag
2. `WM_API_KEY` env var
3. `~/.wm/config.json` (written by `wm login`)
4. _(none → exits with `auth_required`, code 10)_

## Exit codes

Stable contract, mirrored across `wm-cli` and `mcp-director`. See
[`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) §3.

| Code | Meaning             |
| ---- | ------------------- |
| 0    | OK                  |
| 2    | Usage error         |
| 10   | Not logged in       |
| 11   | Invalid API key     |
| 20   | Asset URL required  |
| 30   | Upgrade required    |
| 31   | Rate limited        |
| 40   | Network error       |
| 50   | Server error        |
| 51   | Timeout             |
| 99   | Unexpected crash    |

## First-time setup (when you pick this up)

```bash
cd ~/wm/wm-cli      # or wherever you moved it
nvm use              # honours .nvmrc → Node 20
corepack enable      # ensures pnpm 9 is available
pnpm install         # this is what resolves all the "Cannot find module" lints
pnpm typecheck
pnpm test
pnpm build
node dist/index.js --help
```

To run the dev binary against a local `wmstudio`:

```bash
WMSTUDIO_API_URL=http://localhost:3000/api WM_API_KEY=dev-key node dist/index.js whoami
```

## Project layout

```
wm-cli/
├── src/
│   ├── index.ts            Entrypoint (shebang banner via tsup)
│   ├── cli.ts              commander root, registers subcommands
│   ├── client.ts           WmApiClient — thin undici-based HTTP layer
│   ├── config.ts           ~/.wm/config.json + env merge
│   ├── constants.ts        Defaults, env var names, model ids
│   ├── errors.ts           WmCliError + exit code map
│   ├── logger.ts           Pretty + JSON structured logger
│   ├── util/
│   │   ├── download.ts     Stream URL → file
│   │   └── poll.ts         Generic async-job poller
│   └── commands/
│       ├── _shared.ts      Ctx, requireAuth, renderResult
│       ├── login.ts
│       ├── whoami.ts
│       ├── gen.ts          image + video subcommands
│       ├── upscale.ts
│       ├── campaign.ts     director_* pipeline
│       └── jobs.ts
├── test/                   Vitest + MSW
├── docs/
│   └── CONVENTIONS.md      ← cross-repo contract (sync to other repos)
├── .changeset/             Changesets config + per-PR notes
├── .github/workflows/      CI + release pipelines
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.js
├── tsconfig.json
├── package.json
├── .env.example
├── .editorconfig           ← shared across all wm-* repos
├── .nvmrc                  20.18.0
├── LICENSE                 MIT
└── CHANGELOG.md
```

## Moving this repo

```bash
mv ~/wm/wm-cli /path/to/new/parent/wm-cli
cd /path/to/new/parent/wm-cli
git init -b main
git add .
git commit -m "chore: import initial scaffold"
git remote add origin git@github.com:PrincipeRosso/wm-cli.git
git push -u origin main
```

Nothing in this scaffold references its on-disk parent directory, so the move
is purely a `mv` + `git init`.


## Commands
```bash
cd ~/wm/wm-cli
nvm use && corepack enable
pnpm install
pnpm typecheck   # ❶ resolves every "Cannot find module" lint
pnpm lint        # ❷ rules pass
pnpm test        # ❸ vitest: config + client (msw) unit tests go green
pnpm build       # ❹ single ESM bundle in dist/index.js
node dist/index.js --help   # ❺ commander prints the usage
node dist/index.js --version
```



## Commands to run for pushing. anew version
```bash
cd ~/wm/wm-cli
git commit -am "feat: <whatever>"   # your code change
pnpm changeset                       # pick patch/minor/major + summary
pnpm changeset version               # bumps version + CHANGELOG
git commit -am "chore: release"
pnpm publish --access public
```


## Commands for testing on my machine the deployed
```bash
# Install once, anywhere on macOS / Linux / Windows
npm i -g @jessip2323/wm-cli

# Confirm
wm --version

# Get an API key from your dashboard
open https://wmstudio.io/en/dashboard/api-keys
# (or http://localhost:3000/en/dashboard/api-keys for local)

# Log in
wm login                # paste the sk_live_... token

# First call
wm whoami
wm gen image "a single red apple" -o apple.png
file apple.png          # → PNG image data
```