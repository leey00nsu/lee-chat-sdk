# Changelog

## 0.2.0

Host integration release.

- Added `lee-chat-sdk/server` request guards, text/history adapters, turn collection, and response factories for reusing existing LLM/RAG backends.
- Added typed React message metadata across `LeeChatProvider`, `LeeChatWidget`, and `useLeeChat`, plus assistant content and message footer slots.
- Added Korean/English text presets, explicit feature controls, dynamic metadata updates, and `resetKey` conversation resets.
- Expanded `lee-chat-sdk/testing` with deterministic request, response, message, and provider config factories.
- Preserved existing script-tag and `message.created` behavior while keeping operator-console APIs experimental.
- Expanded bilingual integration/testing docs and packed-package consumer smoke coverage.

## 0.1.0

Initial SDK productization release.

- Added React `LeeChatProvider` and `LeeChatWidget` drop-in widget APIs.
- Added no-React Vanilla and script-tag entrypoints, including `dist/lee-chat.global.js`.
- Added shadow DOM isolation for Vanilla/script-tag installs.
- Added `initialMessage`, visitor persistence, read receipt sync, `message.created` realtime fan-out, realtime event transports, and request auth/retry options.
- Added text, image, and file message part rendering plus host-owned attachment upload contracts.
- Added `ConversationSyncClient`, experimental synced operator-console primitives, and console demo workflows.
- Added `lee-chat-sdk/testing` mock backend utilities.
- Added `lee-chat-sdk/server` helpers for local in-memory routes, production storage-backed route handlers, and SSE event streams.
- Added Playwright E2E checks for script-tag bundle loading, shadow DOM isolation, endpoint submission, and attachment parts.
- Added release readiness, packed-package consumer smoke, and GitHub Actions checks for publish preflight.
