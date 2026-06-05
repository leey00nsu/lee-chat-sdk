# lee-chat-sdk console

SDK experimental 운영 콘솔 primitive 데모입니다. 이 앱은 SDK 검증과 prototype 용도이며 production-ready 콘솔이 아닙니다.

실제 운영 콘솔로 사용하려면 host app에서 상담원 답변 저장, 배정/종료 mutation, 내부 메모, 상담원 권한, 라우팅 정책, 영구 저장소, realtime backend 연결을 구현해야 합니다.

- 대화 목록 검색과 상태 필터
- 미배정 대화 배정
- 상담 응답 추가
- 상담 종료
- 고객 이벤트와 내부 메모 확인

```bash
pnpm --filter lee-chat-sdk-console dev
pnpm --filter lee-chat-sdk-console test:run
```
