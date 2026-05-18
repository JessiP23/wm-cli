# WM Studio · cross-repo conventions

This file is the single source of truth for **how `wmstudio`, `director-cut`,
`mcp-director`, and `wm-cli` stay consistent** across runtimes (TS + Python).
Anything listed below is contract — change it here first, then propagate.

> Copy this file verbatim to the other three repos under `docs/CONVENTIONS.md`
> (or symlink it from a shared `wm-shared` repo once that exists). They MUST
> match.

---

## 1. Repo responsibilities

| Repo            | Runtime | Ships                                 | Owns                              |
| --------------- | ------- | ------------------------------------- | --------------------------------- |
| `wmstudio`      | TS/Next | Web app + REST API + dashboard        | Persistence, billing, IdP, UI     |
| `director-cut`  | Python  | Desktop backend, embedded MCP, queues | Job execution, local FS, fal proxy|
| `mcp-director`  | Python  | Hosted Streamable HTTP MCP            | OAuth, tool surface, asset gating |
| `wm-cli`        | TS/Node | `wm` CLI binary on npm                | Terminal UX over the REST API     |

Rule: **no repo reaches into another repo's database or filesystem**. Everything
flows through the public REST API exposed by `wmstudio`.

---

## 2. Environment variables (canonical names)

Every repo MUST use these exact names. Defaults live alongside in code.

| Name                       | Purpose                                          | Default                                |
| -------------------------- | ------------------------------------------------ | -------------------------------------- |
| `WMSTUDIO_API_URL`         | Base URL of the WM Studio REST API               | `https://wmstudio.io/api`              |
| `WM_API_KEY`               | Personal-access-token for the CLI / scripts      | _(none)_                               |
| `ASSET_UPLOAD_URL`         | Where users upload binaries for public URLs      | `https://director-cut.fly.dev/upload`  |
| `CREDITS_UPGRADE_URL`      | Top-up landing page                              | `https://wmstudio.io/dashboard/credits`|
| `CREDITS_LOW_THRESHOLD`    | Below this remaining-credit count → warning      | `50`                                   |
| `WM_LOG_LEVEL`             | `debug` \| `info` \| `warn` \| `error`           | `info`                                 |
| `WM_LOG_FORMAT`            | `pretty` (default) or `json`                     | `pretty`                               |
| `WM_CONFIG_DIR`            | Override `~/.wm` (mostly for tests)              | `~/.wm`                                |

**Never** introduce a new env var without adding it here first.

---

## 3. Error code vocabulary

Every error response surface (REST API, MCP tool, CLI) MUST emit the same
machine code in the `code` field. The free-text `message` is local; the `code`
is contract.

| Code                  | HTTP | CLI exit | Meaning                                              |
| --------------------- | ---- | -------- | ---------------------------------------------------- |
| `auth_required`       | —    | 10       | No credential supplied                               |
| `auth_invalid`        | 401  | 11       | Server rejected the token                            |
| `asset_url_required`  | 422  | 20       | Missing or unreachable user-provided URL             |
| `upgrade_required`    | 402  | 30       | Insufficient credits (`requiresTopUp: true`)         |
| `rate_limited`        | 429  | 31       | Throttled                                            |
| `network`             | —    | 40       | DNS / TLS / connect failure                          |
| `server`              | 5xx  | 50       | Server-side bug                                      |
| `timeout`             | 504  | 51       | Deadline exceeded (client or server)                 |
| `usage`               | 4xx  | 2        | Bad arguments / unknown command                      |
| `unexpected`          | —    | 99       | Crashed, uncategorised                               |

Response envelope (REST API):
```json
{
  "code": "upgrade_required",
  "message": "Not enough credits to run this tool.",
  "requiresTopUp": true,
  "upgradeUrl": "https://wmstudio.io/dashboard/credits"
}
```

---

## 4. Successful billed-call envelope

Every successful **billed** call (any image/video/3D generation) MUST include:

```json
{
  "...": "tool-specific payload",
  "creditsCharged": 12,
  "creditsRemaining": 488,
  "lowCreditsWarning": false
}
```

`lowCreditsWarning` becomes `true` when `creditsRemaining < CREDITS_LOW_THRESHOLD`.
The CLI surfaces it as a yellow `!` line on stderr; the MCP appends it to the
tool result; the web app shows a banner.

---

## 5. Versioning + release flow

- **SemVer** everywhere. No exceptions.
- TypeScript repos use [Changesets](https://github.com/changesets/changesets).
  A PR that ships user-visible behaviour MUST include a `.changeset/*.md` file.
- Python repos use `hatch version` + `CHANGELOG.md` Keep-a-Changelog format.
- Release on merge to `main` via GitHub Actions. No manual publishes.
- Tag format: `v<MAJOR>.<MINOR>.<PATCH>`.

---

## 6. Commit message convention

Conventional Commits, strictly:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`.

Scopes for `wm-cli`: `cli`, `client`, `config`, `auth`, `gen`, `campaign`, `jobs`.

---

## 7. Logging shape

When `WM_LOG_FORMAT=json`, every log line is a single JSON object with at least:

```json
{ "ts": "ISO-8601", "level": "info", "event": "snake_case_event_name" }
```

`event` names match across runtimes. Examples already in use by `mcp-director`:

- `studio_tool_insufficient_credits`
- `studio_tool_asset_url_required`
- `oauth_callback_success`

The CLI MUST reuse the same event names for the same situations.

---

## 8. File-system layout for user state

| Path                       | Owner          | Contents                              | Permissions |
| -------------------------- | -------------- | ------------------------------------- | ----------- |
| `~/.wm/`                   | `wm-cli`       | Directory                             | `0700`      |
| `~/.wm/config.json`        | `wm-cli`       | `{ apiUrl, apiKey, … }`               | `0600`      |
| `~/.wm/director-cut/`      | `director-cut` | Local cache, queue state              | `0700`      |
| `~/.wm/mcp-director/`      | `mcp-director` | Dev-only token cache (prod uses Redis)| `0700`      |

Never put user state outside `~/.wm/` on the user's machine.

---

## 9. Default model ids

Hard-coded defaults MUST match across `mcp-director` (`src/tools/studio.py`)
and `wm-cli` (`src/constants.ts → DEFAULT_MODELS`). When you change one,
change the other in the same PR.

| Capability          | Default fal model id                                         |
| ------------------- | ------------------------------------------------------------ |
| Image (default)     | `fal-ai/flux/dev`                                            |
| Video (text→video)  | `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`            |
| Video (image→video) | `fal-ai/kling-video/v2.5-turbo/pro/image-to-video`           |
| Image upscale       | `fal-ai/topaz/upscale/image`                                 |
| Video upscale       | `fal-ai/topaz/upscale/video`                                 |
| Image → 3D          | `fal-ai/meshy/v6/image-to-3d`                                |
| Brandshot / UGC / Casting / Camera angles | `fal-ai/flux/dev`                      |

---

## 10. Public REST endpoints used by both MCP and CLI

The MCP and the CLI MUST hit the **same** endpoints. Adding a new tool means
adding one REST route in `wmstudio` plus one bind site in each consumer.

```
GET    /me
GET    /studio/jobs?limit=&status=
GET    /studio/jobs/:jobId
POST   /studio/generate-image
POST   /studio/generate-video
POST   /studio/upscale-image
POST   /studio/video-enhance
POST   /studio/brandshot
POST   /studio/camera-angles
POST   /studio/casting
POST   /studio/ugc-room
POST   /studio/convert-to-3d
POST   /studio/director/brief-to-run
POST   /studio/director/batch-variations
POST   /studio/director/remix
GET    /studio/runs/:runId
```

If you change a payload shape, version the route (`/v2/studio/...`) — never
break the existing one.
