import { MapPin, Search } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">팟 검색</h1>
        <div className="mt-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 h-12">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-400">출발지 또는 도착지 검색</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <MapPin size={30} className="text-gray-400" />
        </div>
        <p className="font-medium text-gray-700">경로를 검색해 보세요</p>
        <p className="text-sm text-gray-400 mt-1">출발지와 도착지를 입력하면 팟을 찾아드려요</p>
      </div>
    </div>
  );
}
