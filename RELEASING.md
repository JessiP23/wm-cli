# Releasing `@jessip2323/wm-cli`

Short reference for shipping a new version to npm.

## One-time setup (already done)

- npm account: `jessip2323`
- Granular access token saved to `~/.npmrc` with "bypass 2FA" enabled
- Published under scope `@jessip2323`

If you ever need a new token: <https://www.npmjs.com/settings/jessip2323/tokens>

## Release a new version (every time)

```bash
cd ~/wm/wm-cli

# 1. Make your changes, commit normally
git add -A
git commit -m "feat: whatever you changed"

# 2. Describe the change for the changelog
pnpm changeset
#   - Pick "patch" for bug fixes (0.2.1 → 0.2.2)
#   - Pick "minor" for new features (0.2.1 → 0.3.0)
#   - Pick "major" for breaking changes (0.2.1 → 1.0.0)
#   - Type a one-line summary

# 3. Bump version + write CHANGELOG.md (consumes the changeset file)
pnpm changeset version

# 4. Commit the version bump
git add -A
git commit -m "chore: release"

# 5. Publish to npm
pnpm publish --access public

# 6. Push tags + main
git push --follow-tags
```

The `prepublishOnly` hook automatically runs `typecheck → lint → format:check → test → build` before the upload, so a broken build can't ship.

## Common gotchas

- **`ERR_PNPM_GIT_UNCLEAN`** — commit (or stash) before publishing
- **`prettier --check` fails** — run `pnpm format` then commit and retry
- **`tests fail`** — fix them; never publish red
- **`E403`** — token expired or 2FA-bypass not enabled; regenerate
- **`E404 Not Found`** — wrong scope name in `package.json`

## How users install

```bash
# Latest
npm i -g @jessip2323/wm-cli

# Specific version
npm i -g @jessip2323/wm-cli@0.2.1

# Try without installing
npx -y @jessip2323/wm-cli@latest --help
```

## Verify after publishing

```bash
npm view @jessip2323/wm-cli version
npm view @jessip2323/wm-cli versions     # all versions ever published

# Clean install in a temp dir to make sure the published tarball actually works
mkdir -p /tmp/wm-test && cd /tmp/wm-test
npm i @jessip2323/wm-cli@latest
./node_modules/.bin/wm --version
```

## Unpublish a bad release (within 72h only)

```bash
npm unpublish @jessip2323/wm-cli@0.2.x --force
```

Or — preferred — just deprecate and ship a fixed version:

```bash
npm deprecate @jessip2323/wm-cli@0.2.1 "Use 0.2.2 instead — fixes <bug>"
```
