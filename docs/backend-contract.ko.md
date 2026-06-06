# Backend Contract

`lee-chat-sdk`는 client-side SDK입니다. 실제 메시지 저장, 인증, 권한, rate limit, tenant 분리, 첨부파일 저장, realtime publish는 host application의 backend가 담당합니다.

상세한 타입과 예제는 영어 원문 [backend-contract.md](./backend-contract.md)에 유지합니다. 이 문서는 한국어 요약입니다.

## 핵심 Endpoint

- `POST /api/chat`: 사용자가 보낸 메시지를 받고 `LeeChatResponse`를 반환합니다.
- `POST /api/chat/attachments`: host storage에 파일을 업로드하고 `UploadedChatAttachment`를 반환합니다.
- `GET /api/chat/conversations`: 저장된 conversation 목록을 반환합니다.
- `GET /api/chat/conversations/:conversationId/messages`: 저장된 message 목록을 반환합니다.
- `PUT /api/chat/conversations/:conversationId/read`: read receipt를 저장합니다.
- `GET /api/chat/events`: SSE realtime stream을 엽니다.

## Production Route

운영에서는 `createLeeChatRouteHandler()`에 storage adapter를 연결합니다.

```ts
import { createLeeChatRouteHandler } from 'lee-chat-sdk/server'

const handler = createLeeChatRouteHandler({
  storage,
  getResponse: async ({ request, storageContext }) => ({
    message: {
      content: await generateAssistantReply({
        tenantId: storageContext.tenantId,
        request,
      }),
    },
  }),
})
```

`storage.createContext(request)`에서 auth, tenant, permission, rate limit context를 만들고, 모든 storage method에서 같은 context를 사용해야 합니다.

## 기존 Backend/LLM Adapter

기존 질문/답변 API를 유지하려면 `lee-chat-sdk/server` 변환 helper를 사용합니다.

```ts
import {
  collectLeeChatTurnHistory,
  createLeeChatTextResponse,
  getLeeChatRequestMetadata,
  getLeeChatRequestText,
  isLeeChatRequest,
} from 'lee-chat-sdk/server'

export async function POST(request: Request) {
  const body: unknown = await request.json()

  if (!isLeeChatRequest(body)) {
    return legacyHandler(body)
  }

  const metadata = getLeeChatRequestMetadata<{
    locale?: string
    currentPostSlug?: string
  }>(body)
  const result = await answerQuestion({
    question: getLeeChatRequestText(body),
    locale: metadata?.locale ?? 'ko',
    currentPostSlug: metadata?.currentPostSlug,
    conversationHistory: collectLeeChatTurnHistory(body).map((turn) => ({
      question: turn.user.content,
      answer: turn.assistant?.content,
    })),
  })

  return Response.json(
    createLeeChatTextResponse({
      request: body,
      content: result.answer,
      metadata: {
        legacyResponse: result,
      },
    }),
  )
}
```

`isLeeChatRequest()`는 SDK contract의 필수 구조를 확인합니다. `getLeeChatRequestMetadata<T>()`의 generic은 TypeScript 편의를 위한 것이며 host metadata를 runtime schema로 검증하지는 않습니다. 신뢰할 수 없는 metadata는 host app의 schema validator로 추가 검증하세요.

## Realtime

`createLeeChatEventStream()`으로 SSE stream과 `publish(event)`를 구성할 수 있습니다. DB 저장이 끝난 뒤 `message.created` 또는 `message.read` 이벤트를 publish하세요.

멀티 인스턴스 운영에서는 module-scoped stream만으로는 부족합니다. Redis pub/sub, NATS, Postgres listen/notify 같은 broadcast layer를 함께 사용하세요.
