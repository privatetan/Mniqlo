'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import { useLanguage } from '@/context/LanguageContext';
import { isAuthenticated } from '@/lib/session';

// Dynamic imports for better performance
const SearchPage = dynamic(() => import('./components/SearchPage'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('search.searching')}</span>
      </div>
    );
  }
});
const FavoritePage = dynamic(() => import('./components/FavoritePage'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('fav.syncing')}</span>
      </div>
    );
  }
});
const SuperSelectionPage = dynamic(() => import('./components/SuperSelectionPage'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('sel.loading')}</span>
      </div>
    );
  }
});

const AdminUsers = dynamic(() => import('./components/AdminUsers'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('sel.loading')}</span>
      </div>
    );
  }
});

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code');
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'super-selection' | 'admin'>('super-selection');
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    if (initialCode) {
      setActiveTab('search');
      setSearchQuery(initialCode);
      // Clean up the URL to prevent re-triggering and for cleaner UX
      router.replace('/');
    }
  }, [initialCode, router]);

  if (!isAuthorized) {
    return null;
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'search': return t('header.search_title');
      case 'favorites': return t('header.gallery_title');
      case 'super-selection': return t('header.selection_title');
      case 'admin': return t('header.admin') || 'User Management';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex bg-transparent md:h-[100dvh] md:overflow-hidden">
      {/* Sidebar for Desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 bg-white/80 backdrop-blur-md md:my-4 md:mr-4 shadow-xl shadow-sky-100/50 md:overflow-hidden md:rounded-[32px] border border-white/50 relative z-10">
        <Header title={getHeaderTitle()} />

        <main className="flex-1 bg-transparent flex flex-col relative md:overflow-hidden">
          <div className={activeTab === 'search' ? 'h-full' : 'hidden'}>
            <SearchPage initialQuery={searchQuery} />
          </div>
          <div className={activeTab === 'favorites' ? 'h-full' : 'hidden'}>
            <FavoritePage />
          </div>
          <div className={activeTab === 'super-selection' ? 'h-full' : 'hidden'}>
            <SuperSelectionPage />
          </div>
          <div className={activeTab === 'admin' ? 'h-full' : 'hidden'}>
            <AdminUsers />
          </div>
        </main>

      </div>

      {/* Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-100 pb-safe">
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-sky-500">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
