import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const connectSocket = (accessToken: string) => {
  const s = getSocket();
  // Bearer 토큰을 auth 객체로 전달 (백엔드 Socket.io 미들웨어와 호환)
  s.auth = { token: accessToken };
  if (!s.connected) s.connect();
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
};
