import { create } from 'zustand';
import type { Message, ReadyStatus } from '@/types/chat';

interface ChatStore {
  // roomId → messages[]
  messages: Record<string, Message[]>;
  // roomId → userId[] (타이핑 중인 사용자)
  typingUsers: Record<string, string[]>;
  // roomId → ReadyStatus[]
  readyStatuses: Record<string, ReadyStatus[]>;

  addMessage: (roomId: string, message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void;
  setReadyStatuses: (roomId: string, statuses: ReadyStatus[]) => void;
  updateReadyStatus: (roomId: string, userId: string, isReady: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  typingUsers: {},
  readyStatuses: {},

  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] ?? []), message],
      },
    })),

  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
    })),

  setTyping: (roomId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[roomId] ?? [];
      const updated = isTyping
        ? [...new Set([...current, userId])]
        : current.filter((id) => id !== userId);
      return { typingUsers: { ...state.typingUsers, [roomId]: updated } };
    }),

  setReadyStatuses: (roomId, statuses) =>
    set((state) => ({
      readyStatuses: { ...state.readyStatuses, [roomId]: statuses },
    })),

  updateReadyStatus: (roomId, userId, isReady) =>
    set((state) => {
      const current = state.readyStatuses[roomId] ?? [];
      const updated = current.map((s) =>
        s.userId === userId ? { ...s, isReady, updatedAt: new Date().toISOString() } : s
      );
      return { readyStatuses: { ...state.readyStatuses, [roomId]: updated } };
    }),
}));
