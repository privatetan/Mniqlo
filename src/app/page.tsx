'use client';

import { Suspense, startTransition, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { useLanguage } from '@/context/LanguageContext';
import { getUser } from '@/lib/session';

type ActiveTab = 'search' | 'favorites' | 'super-selection' | 'limited-time' | 'admin';

function TabLoadingState({ labelKey, tone = 'teal' }: { labelKey: string; tone?: 'teal' | 'amber' }) {
  const { t } = useLanguage();
  const palette = tone === 'amber'
    ? {
        text: 'text-amber-600',
        border: 'border-amber-200 border-t-amber-600'
      }
    : {
        text: 'text-slate-500',
        border: 'border-slate-200 border-t-teal-700'
      };

  return (
    <div className={`h-full flex flex-col items-center justify-center p-8 ${palette.text}`}>
      <div className={`w-8 h-8 border-2 ${palette.border} rounded-full animate-spin mb-4`} />
      <span className="text-sm font-medium tracking-tight">{t(labelKey)}</span>
    </div>
  );
}

const SearchPage = dynamic(() => import('./components/SearchPage'), {
  loading: () => <TabLoadingState labelKey="search.searching" />
});

const FavoritePage = dynamic(() => import('./components/FavoritePage'), {
  loading: () => <TabLoadingState labelKey="fav.syncing" />
});

const SuperSelectionPage = dynamic(() => import('./components/SuperSelectionPage'), {
  loading: () => <TabLoadingState labelKey="sel.loading" />
});

const LimitedTimePage = dynamic(() => import('./components/LimitedTimePage'), {
  loading: () => <TabLoadingState labelKey="lim.loading" tone="amber" />
});

const AdminUsers = dynamic(() => import('./components/AdminUsers'), {
  loading: () => <TabLoadingState labelKey="sel.loading" />
});

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code');
  const { t } = useLanguage();
  const initialTab: ActiveTab = initialCode ? 'search' : 'super-selection';

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [visitedTabs, setVisitedTabs] = useState<ActiveTab[]>([initialTab]);
  const [searchQuery, setSearchQuery] = useState<string | null>(initialCode);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const canToggleFilters = activeTab === 'super-selection' || activeTab === 'limited-time';
  const isSuperSelectionFilterOpen = activeTab === 'super-selection' && isFilterPanelOpen;
  const isLimitedTimeFilterOpen = activeTab === 'limited-time' && isFilterPanelOpen;

  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setIsAdmin(user.role === 'ADMIN');
    setIsAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (!initialCode) {
      return;
    }

    setSearchQuery(initialCode);
    startTransition(() => {
      setActiveTab('search');
    });
    router.replace('/', { scroll: false });
  }, [initialCode, router]);

  useEffect(() => {
    setVisitedTabs((currentTabs) => {
      if (currentTabs.includes(activeTab)) {
        return currentTabs;
      }

      return [...currentTabs, activeTab];
    });
  }, [activeTab]);

  useEffect(() => {
    setIsFilterPanelOpen(false);
  }, [activeTab]);

  const handleTabChange = (nextTab: ActiveTab) => {
    startTransition(() => {
      setActiveTab(nextTab);
    });
  };

  if (!isAuthorized) {
    return null;
  }

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'search':
        return t('header.search_title');
      case 'favorites':
        return t('header.gallery_title');
      case 'super-selection':
        return t('header.selection_title');
      case 'limited-time':
        return t('header.limited_time_title');
      case 'admin':
        return t('header.admin') || 'User Management';
      default:
        return '';
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

      <Sidebar activeTab={activeTab} isAdmin={isAdmin} setActiveTab={handleTabChange} />

      <div className="shell-panel flex-1 flex flex-col min-w-0 md:my-4 md:mr-4 md:overflow-hidden md:rounded-[36px] relative z-10">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_24%,transparent_76%,rgba(255,255,255,0.08))]" />
        <Header
          title={getHeaderTitle()}
          showFilterToggle={canToggleFilters}
          isFilterPanelOpen={canToggleFilters && isFilterPanelOpen}
          onToggleFilterPanel={() => {
            if (!canToggleFilters) return;
            setIsFilterPanelOpen((open) => !open);
          }}
        />

        <main className="flex-1 bg-transparent flex flex-col relative md:overflow-hidden">
          {visitedTabs.includes('search') && (
            <div className={activeTab === 'search' ? 'h-full' : 'hidden'}>
              <SearchPage initialQuery={searchQuery} />
            </div>
          )}
          {visitedTabs.includes('favorites') && (
            <div className={activeTab === 'favorites' ? 'h-full' : 'hidden'}>
              <FavoritePage />
            </div>
          )}
          {visitedTabs.includes('super-selection') && (
            <div className={activeTab === 'super-selection' ? 'h-full' : 'hidden'}>
              <SuperSelectionPage
                isFilterPanelOpen={isSuperSelectionFilterOpen}
                onToggleFilterPanel={() => setIsFilterPanelOpen((open) => !open)}
                onCloseFilterPanel={() => setIsFilterPanelOpen(false)}
              />
            </div>
          )}
          {visitedTabs.includes('limited-time') && (
            <div className={activeTab === 'limited-time' ? 'h-full' : 'hidden'}>
              <LimitedTimePage
                isFilterPanelOpen={isLimitedTimeFilterOpen}
                onToggleFilterPanel={() => setIsFilterPanelOpen((open) => !open)}
                onCloseFilterPanel={() => setIsFilterPanelOpen(false)}
              />
            </div>
          )}
          {isAdmin && visitedTabs.includes('admin') && (
            <div className={activeTab === 'admin' ? 'h-full' : 'hidden'}>
              <AdminUsers />
            </div>
          )}
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-transparent pb-safe">
        <BottomNav activeTab={activeTab} isAdmin={isAdmin} setActiveTab={handleTabChange} />
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
