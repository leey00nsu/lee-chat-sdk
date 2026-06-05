# Release Guide

maintainer용 배포 절차입니다. 자세한 영어 문서는 [release.md](./release.md)를 참고하세요.

## Preflight

```bash
pnpm release:ready
pnpm release:check
```

`release:check`는 readiness, typecheck, SDK tests, build, npm pack dry-run, consumer smoke, Playwright E2E를 실행합니다.

## npm Publish

GitHub Actions `Publish SDK` workflow는 기본값이 dry-run입니다. 실제 publish에는 `NPM_TOKEN` secret이 필요합니다.

로컬에서 직접 publish할 때도 `packages/sdk`의 `prepublishOnly`가 root `release:check`를 다시 실행합니다.

```bash
cd packages/sdk
pnpm publish --access public
```

## CDN Bundle

SDK build는 다음 파일을 생성합니다.

- `packages/sdk/dist/lee-chat.global.js`
- `packages/sdk/dist/lee-chat.global.manifest.json`

GitHub Actions publish workflow는 두 파일을 `lee-chat-sdk-cdn-bundle` artifact로 업로드합니다.

