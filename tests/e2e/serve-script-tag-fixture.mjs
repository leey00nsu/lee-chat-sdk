import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

const port = Number(process.env.PORT ?? 4177)
const root = process.cwd()

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)

  if (request.method === 'GET' && url.pathname === '/') {
    response.writeHead(302, { Location: '/script-tag.html' })
    response.end()
    return
  }

  if (request.method === 'GET' && url.pathname === '/script-tag.html') {
    await sendFile(response, path.join(root, 'tests/e2e/script-tag.html'), 'text/html')
    return
  }

  if (request.method === 'GET' && url.pathname === '/lee-chat.global.js') {
    await sendFile(
      response,
      path.join(root, 'packages/sdk/dist/lee-chat.global.js'),
      'text/javascript',
    )
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/chat') {
    const body = await readJsonBody(request)
    const text = body?.message?.content ?? ''

    sendJson(response, {
      message: {
        id: 'assistant-e2e-response',
        content: `Echo: ${text}`,
        createdAt: new Date().toISOString(),
      },
    })
    return
  }

  response.writeHead(404)
  response.end('Not found')
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Lee Chat script tag E2E fixture listening on ${port}`)
})

async function sendFile(response, filePath, contentType) {
  try {
    await readFile(filePath)
  } catch {
    response.writeHead(404)
    response.end('Not found')
    return
  }

  response.writeHead(200, {
    'Content-Type': contentType,
  })
  createReadStream(filePath).pipe(response)
}

function sendJson(response, payload) {
  response.writeHead(200, {
    'Content-Type': 'application/json',
  })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
