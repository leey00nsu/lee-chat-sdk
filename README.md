# lee-chat-sdk

React 기반 채팅 SDK 실험 프로젝트입니다.

이 프로젝트는 `leey00nsu-next-blog-v2`의 블로그 Q&A 챗봇에서 출발해, 여러 도메인의 채팅 위젯과 운영 콘솔을 같은 메시지 모델 위에서 구성하기 위한 SDK로 분리합니다.

## Workspace

- `packages/sdk`: 메시지 모델, transport, persistence, controller, UI primitives
- `apps/demo`: 고객상담형 채팅 데모
- `apps/console`: 내부 운영 콘솔
