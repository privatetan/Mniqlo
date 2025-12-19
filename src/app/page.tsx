'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import SearchPage from './components/SearchPage';
import BottomNav from './components/BottomNav';
import FavoritePage from './components/FavoritePage';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'search' | 'favorites'>('search');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return null; // Or a loading spinner
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white w-full max-w-[1000px] mx-auto overflow-hidden">
      <Header title={activeTab === 'search' ? '搜索' : '我的收藏'} />
      <main className="flex-1 overflow-hidden bg-gray-50 flex flex-col">
        <div className={activeTab === 'search' ? 'h-full' : 'hidden h-full'}>
          <SearchPage />
        </div>
        <div className={activeTab === 'favorites' ? 'h-full' : 'hidden h-full'}>
          <FavoritePage />
        </div>
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
