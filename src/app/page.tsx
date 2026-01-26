'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import { useLanguage } from '@/context/LanguageContext';

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

  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'super-selection' | 'admin'>('search');
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
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
    <div className="h-[100dvh] flex bg-gray-50/50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 bg-white md:m-5 lg:m-6 shadow-xl shadow-gray-200/50 overflow-hidden md:rounded-3xl border border-gray-100">
        <Header title={getHeaderTitle()} />

        <main className="flex-1 overflow-hidden bg-transparent flex flex-col">
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

        {/* Bottom Nav for Mobile */}
        <div className="md:hidden">
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
