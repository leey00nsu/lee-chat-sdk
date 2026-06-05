# Changelog

## 0.1.0

Initial SDK productization release.

- Added React `LeeChatProvider` and `LeeChatWidget` drop-in widget APIs.
- Added no-React Vanilla and script-tag entrypoints, including `dist/lee-chat.global.js`.
- Added shadow DOM isolation for Vanilla/script-tag installs.
- Added `initialMessage`, visitor persistence, read receipt sync, realtime event transports, and request auth/retry options.
- Added text, image, and file message part rendering plus host-owned attachment upload contracts.
- Added `ConversationSyncClient`, synced operator-console hook, and console demo workflows.
- Added `lee-chat-sdk/testing` mock backend utilities.
- Added `lee-chat-sdk/server` helpers for local in-memory routes, production storage-backed route handlers, and SSE event streams.
- Added Playwright E2E checks for script-tag bundle loading, shadow DOM isolation, endpoint submission, and attachment parts.
- Added release readiness, packed-package consumer smoke, and GitHub Actions checks for publish preflight.
