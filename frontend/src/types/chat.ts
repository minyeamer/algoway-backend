export type MessageType = 'text' | 'location' | 'status' | 'system';

export interface Message {
  messageId: string;
  chatRoomId: string;
  sender: {
    userId: string;
    nickname: string;
    profileImage: string | null;
  };
  messageType: MessageType;
  content: string;
  createdAt: string;
}

export interface ReadyStatus {
  userId: string;
  isReady: boolean;
  updatedAt: string;
}

export interface ChatRoom {
  chatRoomId: string;
  podId: string;
  createdAt: string;
}

// WebSocket 이벤트 페이로드
export interface ChatJoinPayload {
  roomId: string;
}

export interface ChatMessagePayload {
  roomId: string;
  content: string;
  type: 'text' | 'location';
}

export interface ChatTypingPayload {
  roomId: string;
}

export interface ChatReadyPayload {
  roomId: string;
  isReady: boolean;
}
