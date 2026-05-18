# @wmstudio/cli

## 0.2.8

### Patch Changes

- add cost confirmation prompt

## 0.2.7

### Patch Changes

- fix wm --version always showing 0.0.0-dev

## 0.2.6

### Patch Changes

- Add wm search command

## 0.2.5

### Patch Changes

- Consolidate urls to wmstudio.io domain; show api key url in wm login

## 0.2.4

### Patch Changes

- Cleaned up README

## 0.2.3

### Patch Changes

- Rename

## 0.2.2

### Patch Changes

- Rename package to wmstudio-cli

## 0.2.1

### Patch Changes

- Cli Wstudi

## 0.2.0

### Minor Changes

- c72bec7: Initial scaffold. Not yet published.

  Commands: `login`, `whoami`, `gen image`, `gen video`, `upscale`, `campaign`,
  `jobs list`, `jobs get`. Auth via API key (file + env + flag). Hosted REST API
  transport via `undici`. Structured logging with `WM_LOG_FORMAT=json` parity
  with `mcp-director`.

### Patch Changes

- WmStudio CLI Tools - Image/video/image-to-image/image-to-video

## 0.1.0

Initial scaffold. Not yet published.

- Commands: `login`, `whoami`, `gen image`, `gen video`, `upscale`, `campaign`, `jobs`.
- Auth: API key stored in `~/.wm/config.json`, override via `WM_API_KEY` env.
- Transport: direct HTTPS to the WM Studio REST API via `undici`.
- Build: `tsup` → single ESM `dist/index.js` with shebang, runnable via `npx @wmstudio/cli` or `wm`.
