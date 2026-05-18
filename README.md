# wmstudio-cli

Command-line client for [WM Studio](https://wmstudio.io). Generate images, videos, brand campaigns, and 3D assets — and inspect your jobs and credits — straight from your terminal.

```bash
npm i -g wmstudio-cli
wm login
wm gen image "studio portrait of a husky, cinematic lighting"
```

---

## Install

Requires Node.js **20.10+**.

```bash
# global (recommended)
npm i -g wmstudio-cli

# or per-project
npm i -D wmstudio-cli

# one-off, no install
npx wmstudio-cli --help
```

Verify:

```bash
wm --version
```

## Authenticate

**Step 1 — get an API key.** Sign in at <https://wmstudio.io>, then go to:

> **Dashboard → API keys → Create new key**
>
> Direct link: <https://wmstudio.io/dashboard/api-keys>

Copy the key once — it's shown only at creation. Keys start with `wm_live_…`.

**Step 2 — log in from your terminal.**

```bash
wm login                 # paste the key when prompted (input is masked)
wm whoami                # prints account email + credit balance
```

Credentials are stored in `~/.wm/config.json` (chmod `600`). To sign out:

```bash
wm logout
```

You can also pass a key per-call without saving it:

```bash
wm --api-key wm_live_xxx whoami
# or
WM_API_KEY=wm_live_xxx wm whoami
```

## Commands

| Command | What it does |
|---|---|
| `wm login` | Save an API key for this machine |
| `wm logout` | Remove saved credentials |
| `wm whoami` | Show account email + credits remaining |
| `wm gen image <prompt>` | Generate an image |
| `wm gen video <prompt>` | Generate a video |
| `wm upscale <image>` | Upscale an image (URL or local file) |
| `wm campaign <brief>` | Run a multi-asset brand campaign |
| `wm search <query>` | Web search (Tavily-powered) — 1 credit basic, 2 advanced |
| `wm jobs list` | List your recent generation jobs |
| `wm jobs get <id>` | Show details for a single job |

Run `wm <command> --help` for full flags.

## Cost confirmation

Every generation command (`gen image`, `gen video`, `upscale`) shows you the estimated credit cost and asks you to confirm before charging:

```
? Image generation · fal-ai/nano-banana-pro
  Estimated cost: 18 credits
  Proceed? (Y/n)
```

After the generation completes you also see how many credits you have left. Skip the prompt with `-y/--yes` for unattended/CI use:

```bash
wm gen image "red apple" --yes -o apple.png
wm --json gen image "red apple"           # --json also auto-skips the prompt
```

Defaults are tuned for current best-in-class quality:

| Tool | Default model |
|---|---|
| `gen image` (text-to-image) | `fal-ai/nano-banana-pro` |
| `gen image --image-url ...` | `fal-ai/nano-banana-pro/edit` (auto-picked) |
| `gen video` | `bytedance/seedance-2.0-fast` |

Override with `-m/--model` whenever you want.

## Examples

```bash
# Image — pick a model and aspect ratio, save the result locally
wm gen image "neon cyberpunk alley, rain, dramatic lighting" \
  --model flux-pro --aspect 16:9 --out ./out/

# Video — 5 second clip from a text prompt
wm gen video "drone shot flying over snowy mountain peaks at sunrise" \
  --duration 5 --out ./videos/

# Upscale a local file 4x
wm upscale ./photo.jpg --scale 4 --out ./upscaled/

# Brand campaign from a single brief
wm campaign "Launch teaser for an artisanal coffee brand called Brava" \
  --out ./campaigns/brava/

# Web search — quick lookup
wm search "next.js 16 release notes"

# Web search — advanced, last week, restricted sources
wm search "OpenAI o3 benchmarks" \
  --depth advanced \
  --time week \
  --max 10 \
  --include-domain wikipedia.org

# Pipe URLs into another tool
wm --json search "vector databases" | jq -r '.results[].url'

# Inspect jobs
wm jobs list --limit 10
wm jobs get gen_01HZX...

# Machine-readable output for scripting
wm --json jobs list --limit 5 | jq '.[] | .id'
```

## Global flags

| Flag | Env var | Notes |
|---|---|---|
| `--api-key <key>` | `WM_API_KEY` | Overrides saved credentials |
| `--api-url <url>` | `WMSTUDIO_API_URL` | Point at a different deployment (default `https://wmstudio.io/api`) |
| `--json` | — | Emit JSON instead of formatted text |
| `-v, --version` | — | Print CLI version |

## Where things live

- **Config:** `~/.wm/config.json` — API key + base URL. Per-OS-user, never shared.
- **Outputs:** wherever you point `--out`, default is the current directory.
- **Logs:** stderr. Use `--json` for parseable stdout in scripts.

To test as a fresh user without touching your real session:

```bash
HOME=/tmp/wm-fresh wm login
HOME=/tmp/wm-fresh wm whoami
rm -rf /tmp/wm-fresh
```

## Troubleshooting

- **`401 Unauthorized`** — key is missing, revoked, or expired. Run `wm login` again.
- **`402 Insufficient credits`** — top up at <https://wmstudio.io/dashboard/billing>.
- **Job stuck in `queued`** — the CLI polls automatically; if it times out, fetch later with `wm jobs get <id>`.
- **`command not found: wm`** — your global `node_modules/.bin` isn't in `$PATH`. Run `npm prefix -g` and add `<prefix>/bin` to `$PATH`.

## Links

- Website: <https://wmstudio.io>
- Docs: <https://wmstudio.io/docs/cli>
- Dashboard: <https://wmstudio.io/dashboard>
- API keys: <https://wmstudio.io/dashboard/api-keys>
- Support: <https://wmstudio.io/support>

## License

MIT © WM Studio
