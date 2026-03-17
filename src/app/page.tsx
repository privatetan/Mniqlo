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
      <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('search.searching')}</span>
      </div>
    );
  }
});
const FavoritePage = dynamic(() => import('./components/FavoritePage'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('fav.syncing')}</span>
      </div>
    );
  }
});
const SuperSelectionPage = dynamic(() => import('./components/SuperSelectionPage'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('sel.loading')}</span>
      </div>
    );
  }
});
const LimitedTimePage = dynamic(() => import('./components/LimitedTimePage'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-amber-600">
        <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4" />
        <span className="text-sm font-medium tracking-tight">{t('lim.loading')}</span>
      </div>
    );
  }
});

const AdminUsers = dynamic(() => import('./components/AdminUsers'), {
  loading: () => {
    const { t } = useLanguage();
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin mb-4" />
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

  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'super-selection' | 'limited-time' | 'admin'>('super-selection');
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
      case 'limited-time': return t('header.limited_time_title');
      case 'admin': return t('header.admin') || 'User Management';
      default: return '';
    }
  };

  return (
    <div className="relative min-h-screen flex bg-transparent md:h-[100dvh] md:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-[-7rem] top-[-6rem] h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--bg-radial-a) 0%, transparent 72%)' }}
        />
        <div
          className="absolute right-[-6rem] top-12 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--bg-radial-b) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--bg-overlay-b) 0%, transparent 72%)' }}
        />
      </div>

      {/* Sidebar for Desktop */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="shell-panel flex-1 flex flex-col min-w-0 md:my-4 md:mr-4 md:overflow-hidden md:rounded-[36px] relative z-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_24%,transparent_76%,rgba(255,255,255,0.08))]" />
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
          <div className={activeTab === 'limited-time' ? 'h-full' : 'hidden'}>
            <LimitedTimePage />
          </div>
          <div className={activeTab === 'admin' ? 'h-full' : 'hidden'}>
            <AdminUsers />
          </div>
        </main>

      </div>

      {/* Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-transparent pb-safe">
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-teal-700">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
