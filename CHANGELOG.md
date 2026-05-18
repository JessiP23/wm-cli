# @wmstudio/cli

## 0.1.0

Initial scaffold. Not yet published.

- Commands: `login`, `whoami`, `gen image`, `gen video`, `upscale`, `campaign`, `jobs`.
- Auth: API key stored in `~/.wm/config.json`, override via `WM_API_KEY` env.
- Transport: direct HTTPS to the WM Studio REST API via `undici`.
- Build: `tsup` → single ESM `dist/index.js` with shebang, runnable via `npx @wmstudio/cli` or `wm`.
