import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sdkDir = join(rootDir, 'packages', 'sdk')
const tscBin = join(rootDir, 'node_modules', '.bin', 'tsc')
const tempDir = await mkdtemp(join(tmpdir(), 'lee-chat-sdk-consumer-'))

async function run(command, args, options = {}) {
  try {
    return await execFileAsync(command, args, {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 10,
      ...options,
      env: {
        ...process.env,
        npm_config_dry_run: 'false',
        ...options.env,
      },
    })
  } catch (error) {
    const output = [error.stdout, error.stderr].filter(Boolean).join('\n')
    throw new Error(
      [`${command} ${args.join(' ')} failed.`, output].filter(Boolean).join('\n'),
    )
  }
}

function parsePackOutput(stdout) {
  const jsonStart = stdout.indexOf('[\n')
  const jsonEnd = stdout.lastIndexOf(']')

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error(`npm pack did not print a JSON result.\n${stdout}`)
  }

  return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1))
}

try {
  const packDir = join(tempDir, 'pack')
  const consumerDir = join(tempDir, 'consumer')

  await mkdir(packDir, { recursive: true })
  await mkdir(consumerDir, { recursive: true })

  await run('npm', ['pack', sdkDir, '--json', '--ignore-scripts'], {
    cwd: packDir,
  })
    .then(({ stdout }) => parsePackOutput(stdout))
    .then((packResult) => {
      if (!Array.isArray(packResult) || !packResult[0]?.filename) {
        throw new Error('npm pack did not return a package filename.')
      }

      return packResult[0].filename
    })
    .then(async (filename) => {
      const tarballPath = join(packDir, filename)

      await writeFile(
        join(consumerDir, 'package.json'),
        JSON.stringify(
          {
            private: true,
            type: 'module',
            dependencies: {},
          },
          null,
          2,
        ),
      )

      await run(
        'npm',
        [
          'install',
          '--ignore-scripts',
          '--no-audit',
          '--no-fund',
          '--package-lock=false',
          'react@^19.1.0',
          'react-dom@^19.1.0',
          '@types/react@^19.1.12',
          '@types/react-dom@^19.1.9',
          tarballPath,
        ],
        { cwd: consumerDir },
      )

      await writeFile(
        join(consumerDir, 'smoke.mjs'),
        `
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import {
  LEE_CHAT_TEXT_PRESETS,
  LeeChatWidget,
  createChatMessagePartFromAttachment,
} from 'lee-chat-sdk'
import { initLeeChat as initVanillaLeeChat } from 'lee-chat-sdk/vanilla'
import { initLeeChat as initGlobalLeeChat } from 'lee-chat-sdk/global'
import {
  createLeeChatEventStream,
  createInMemoryLeeChatBackend,
  createLeeChatRouteHandler,
  createLeeChatTextResponse,
  isLeeChatRequest,
} from 'lee-chat-sdk/server'
import {
  createMockLeeChatRequest,
  createMockLeeChatServer,
} from 'lee-chat-sdk/testing'

const require = createRequire(import.meta.url)
const packageJson = require('lee-chat-sdk/package.json')
const stylePath = require.resolve('lee-chat-sdk/style.css')
const packagePath = require.resolve('lee-chat-sdk/package.json')
const changelogPath = join(dirname(packagePath), 'CHANGELOG.md')
const globalBundlePath = join(dirname(packagePath), 'dist', 'lee-chat.global.js')
const globalManifestPath = join(
  dirname(packagePath),
  'dist',
  'lee-chat.global.manifest.json',
)

assert.equal(packageJson.name, 'lee-chat-sdk')
assert.equal(typeof LeeChatWidget, 'function')
assert.equal(typeof initVanillaLeeChat, 'function')
assert.equal(typeof initGlobalLeeChat, 'function')
assert.equal(typeof createMockLeeChatServer, 'function')
assert.equal(typeof createInMemoryLeeChatBackend, 'function')
assert.equal(typeof createLeeChatEventStream, 'function')
assert.equal(typeof createLeeChatRouteHandler, 'function')
assert.equal(typeof createLeeChatTextResponse, 'function')
assert.equal(typeof isLeeChatRequest, 'function')
assert.equal(LEE_CHAT_TEXT_PRESETS.ko.send, '보내기')

const attachmentPart = createChatMessagePartFromAttachment({
  id: 'att_1',
  name: 'screenshot.png',
  url: 'https://example.com/screenshot.png',
  contentType: 'image/png',
  size: 1200,
})

assert.equal(attachmentPart.type, 'file')
assert.equal(attachmentPart.name, 'screenshot.png')

const mockServer = createMockLeeChatServer()
assert.equal(typeof mockServer.fetch, 'function')
const mockRequest = createMockLeeChatRequest()
assert.equal(isLeeChatRequest(mockRequest), true)

const backend = createInMemoryLeeChatBackend()
assert.equal(typeof backend.handleRequest, 'function')

await access(stylePath)
await access(changelogPath)
await access(globalBundlePath)
const globalBundle = await readFile(globalBundlePath)
const globalManifest = JSON.parse(await readFile(globalManifestPath, 'utf8'))
assert.equal(globalManifest.packageName, 'lee-chat-sdk')
assert.equal(globalManifest.version, packageJson.version)
assert.equal(globalManifest.file, 'lee-chat.global.js')
assert.equal(globalManifest.size, globalBundle.byteLength)
assert.equal(
  globalManifest.integrity,
  'sha384-' + createHash('sha384').update(globalBundle).digest('base64'),
)
`,
      )

      await run('node', ['smoke.mjs'], { cwd: consumerDir })

      await writeFile(
        join(consumerDir, 'smoke.cjs'),
        `
const assert = require('node:assert/strict')
const { accessSync } = require('node:fs')
const { dirname, join } = require('node:path')

const root = require('lee-chat-sdk')
const vanilla = require('lee-chat-sdk/vanilla')
const globalEntry = require('lee-chat-sdk/global')
const server = require('lee-chat-sdk/server')
const testing = require('lee-chat-sdk/testing')
const packageJson = require('lee-chat-sdk/package.json')
const stylePath = require.resolve('lee-chat-sdk/style.css')
const packagePath = require.resolve('lee-chat-sdk/package.json')
const changelogPath = join(dirname(packagePath), 'CHANGELOG.md')
const globalBundlePath = join(dirname(packagePath), 'dist', 'lee-chat.global.js')
const globalManifestPath = join(
  dirname(packagePath),
  'dist',
  'lee-chat.global.manifest.json',
)

assert.equal(packageJson.name, 'lee-chat-sdk')
assert.equal(typeof root.LeeChatWidget, 'function')
assert.equal(typeof root.createChatMessagePartFromAttachment, 'function')
assert.equal(typeof vanilla.initLeeChat, 'function')
assert.equal(typeof globalEntry.initLeeChat, 'function')
assert.equal(typeof testing.createMockLeeChatServer, 'function')
assert.equal(typeof server.createInMemoryLeeChatBackend, 'function')
assert.equal(typeof server.createLeeChatEventStream, 'function')
assert.equal(typeof server.createLeeChatRouteHandler, 'function')
assert.equal(typeof server.createLeeChatTextResponse, 'function')
assert.equal(typeof server.isLeeChatRequest, 'function')
assert.equal(typeof testing.createMockLeeChatRequest, 'function')
assert.equal(root.LEE_CHAT_TEXT_PRESETS.en.send, 'Send')

const attachmentPart = root.createChatMessagePartFromAttachment({
  kind: 'file',
  id: 'att_2',
  name: 'report.pdf',
  url: 'https://example.com/report.pdf',
  contentType: 'application/pdf',
  size: 2400,
})

assert.equal(attachmentPart.type, 'file')
assert.equal(attachmentPart.name, 'report.pdf')

accessSync(stylePath)
accessSync(changelogPath)
accessSync(globalBundlePath)
accessSync(globalManifestPath)
`,
      )

      await run('node', ['smoke.cjs'], { cwd: consumerDir })

      await writeFile(
        join(consumerDir, 'tsconfig.json'),
        JSON.stringify(
          {
            compilerOptions: {
              strict: true,
              target: 'ES2022',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              jsx: 'react-jsx',
              skipLibCheck: false,
              noEmit: true,
            },
            include: ['smoke.tsx'],
          },
          null,
          2,
        ),
      )

      await writeFile(
        join(consumerDir, 'smoke.tsx'),
        `
import type {
  ChatMessage,
  ChatMessagePart,
  ChatTransport,
  LeeChatConfig,
  UploadedChatAttachment,
} from 'lee-chat-sdk'
import {
  ConversationClient,
  HttpChatTransport,
  LeeChatProvider,
  LeeChatWidget,
  createChatMessagePartFromAttachment,
} from 'lee-chat-sdk'
import { initLeeChat } from 'lee-chat-sdk/vanilla'
import { initLeeChat as initGlobalLeeChat } from 'lee-chat-sdk/global'
import {
  createInMemoryLeeChatBackend,
  createLeeChatEventStream,
  createLeeChatRouteHandler,
  type LeeChatEventStream,
  type LeeChatRouteHandlerStorage,
} from 'lee-chat-sdk/server'
import { createMockLeeChatServer } from 'lee-chat-sdk/testing'

const config: LeeChatConfig = {
  appId: 'app_1',
  endpoint: '/api/chat',
}

const httpTransport = new HttpChatTransport({ endpoint: config.endpoint })
const transport: ChatTransport<{ content: string }, { answer: string }> = {
  sendMessage: async (request) => ({ answer: request.content }),
}
const client = new ConversationClient<{ content: string }, { answer: string }>({
  conversationId: 'conversation_1',
  senderId: 'visitor_1',
  assistantSenderId: 'assistant_1',
  transport,
  buildRequest: ({ content }) => ({ content }),
  buildAssistantMessage: ({ response }) => ({ content: response.answer }),
})
const uploadResult: UploadedChatAttachment = {
  kind: 'file',
  name: 'contract.pdf',
  url: 'https://example.com/contract.pdf',
  mediaType: 'application/pdf',
  size: 4096,
}
const part: ChatMessagePart = createChatMessagePartFromAttachment(uploadResult)
const message: ChatMessage = {
  id: 'msg_1',
  conversationId: 'conversation_1',
  senderId: 'visitor_1',
  role: 'user',
  content: '첨부 확인 부탁드립니다.',
  parts: [part],
  createdAt: '2026-06-01T00:00:00.000Z',
  status: 'sent',
}
const storage: LeeChatRouteHandlerStorage = {
  upsertConversation: () => undefined,
  appendMessages: () => undefined,
  listConversations: () => ({ conversations: [] }),
  listMessages: () => ({ messages: [] }),
  upsertReadReceipt: () => undefined,
}
const routeHandler = createLeeChatRouteHandler({
  storage,
  getResponse: ({ request }) => ({
    message: {
      content: request.message.content,
    },
  }),
})
const eventStream: LeeChatEventStream = createLeeChatEventStream()
const widgetElement = (
  <LeeChatProvider config={config}>
    <LeeChatWidget />
  </LeeChatProvider>
)

void LeeChatProvider
void LeeChatWidget
void initLeeChat
void initGlobalLeeChat
void createInMemoryLeeChatBackend
void createLeeChatEventStream
void createLeeChatRouteHandler
void createMockLeeChatServer
void client
void httpTransport
void message
void routeHandler
void eventStream
void widgetElement
`,
      )

      await run(tscBin, ['-p', 'tsconfig.json'], { cwd: consumerDir })
    })

  console.log('Package consumer smoke test passed.')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
