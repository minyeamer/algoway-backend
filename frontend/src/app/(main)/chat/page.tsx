import { MessageSquare } from 'lucide-react';

export default function ChatListPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">채팅</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <MessageSquare size={30} className="text-gray-400" />
        </div>
        <p className="font-medium text-gray-700">채팅방이 없어요</p>
        <p className="text-sm text-gray-400 mt-1">팟에 참여하면 채팅이 시작됩니다</p>
      </div>
    </div>
  );
}
