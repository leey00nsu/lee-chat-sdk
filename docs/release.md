# Release Guide

This project publishes `packages/sdk` as `lee-chat-sdk`.

## Preflight

Run the full release gate from the workspace root:

```bash
pnpm release:check
```

The gate verifies package metadata, changelog coverage for the current package version, TypeScript, unit tests, build output, npm pack dry-run, a packed-package consumer smoke test, and script-tag E2E.

To run only the packed-package consumer smoke test after a build:

```bash
pnpm release:smoke
```

That smoke test creates a real npm tarball, installs it into a temporary consumer project with React peers, and verifies the public root, vanilla, global, testing, server, package JSON, style, and IIFE bundle exports through ESM import, CommonJS require, and TypeScript consumer compilation.

## Versioning

Update these together:

- `packages/sdk/package.json` `version`
- `CHANGELOG.md` section `## <version>`
- `packages/sdk/CHANGELOG.md` section `## <version>`

The workspace root version can remain independent because the root package is private.

## Publish

Manual local publish:

```bash
pnpm release:check
cd packages/sdk
pnpm publish --access public
```

`prepublishOnly` runs the root release gate again if `pnpm publish` is invoked directly from `packages/sdk`.

GitHub Actions publish:

1. Add an npm automation token as the repository secret `NPM_TOKEN`.
2. Run the `Publish SDK` workflow manually.
3. Keep `dry_run` enabled for a registry dry run, or disable it to publish with npm provenance.
4. Download the `lee-chat-sdk-cdn-bundle` workflow artifact if you also need the script-tag CDN files.

## CDN Bundle

The script-tag bundle is produced by the package build:

```bash
packages/sdk/dist/lee-chat.global.js
packages/sdk/dist/lee-chat.global.manifest.json
```

Upload both files to the target CDN. The manifest contains the package version, byte size, SHA-256 digest, and SHA-384 SRI string for the script bundle.
The `Publish SDK` GitHub Actions workflow uploads these two files as the `lee-chat-sdk-cdn-bundle` artifact after the release gate passes.

Reference the bundle with the manifest `integrity` value when the CDN URL is immutable:

```html
<script
  src="https://cdn.example.com/lee-chat.global.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>
```

Keep the CDN URL versioned or immutable so host sites do not receive breaking changes unexpectedly.
