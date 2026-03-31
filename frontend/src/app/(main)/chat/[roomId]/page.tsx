// TODO Phase 4: 실시간 채팅방 구현
// 참고: docs/frontend/plan.md — P06 채팅방
export default function ChatRoomPage({ params }: { params: { roomId: string } }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold">채팅방</h1>
        <p className="text-gray-400 text-xs">roomId: {params.roomId}</p>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Phase 4에서 WebSocket 채팅 구현 예정</p>
      </div>
    </div>
  );
}
