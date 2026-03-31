// Socket.io 이벤트 이름 상수 — 백엔드 websocket/chatHandler.ts와 동기화 유지

export const CHAT_EVENTS = {
  // 클라이언트 → 서버
  JOIN: 'chat:join',
  LEAVE: 'chat:leave',
  MESSAGE: 'chat:message',
  TYPING: 'chat:typing',
  STOP_TYPING: 'chat:stop_typing',
  READY: 'chat:ready',

  // 서버 → 클라이언트
  JOINED: 'chat:joined',
  USER_JOINED: 'chat:user_joined',
  USER_LEFT: 'chat:user_left',
  NEW_MESSAGE: 'chat:new_message',
  USER_TYPING: 'chat:user_typing',
  USER_STOP_TYPING: 'chat:user_stop_typing',
  READY_UPDATE: 'chat:ready_update',
  USER_DISCONNECTED: 'chat:user_disconnected',

  // 에러
  ERROR: 'error:chat',
} as const;
