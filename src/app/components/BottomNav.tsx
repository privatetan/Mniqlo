'use client';

type BottomNavProps = {
    activeTab: 'search' | 'favorites' | 'super-selection' | 'limited-time' | 'admin';
    setActiveTab: (tab: 'search' | 'favorites' | 'super-selection' | 'limited-time' | 'admin') => void;
};

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getUserString } from '@/lib/session';

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
    const { t } = useLanguage();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userStr = getUserString();
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.role === 'ADMIN');
        }
    }, []);

    const primaryItems: Array<{
        id: BottomNavProps['activeTab'];
        label: string;
        icon: React.ReactNode;
        activeClass: string;
        inactiveClass: string;
    }> = [
        {
            id: 'super-selection',
            label: t('nav.selection'),
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            ),
            activeClass: 'text-teal-300',
            inactiveClass: 'text-white/78'
        },
        {
            id: 'limited-time',
            label: t('nav.limited_time'),
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                    <path d="M8 2 6 5" />
                    <path d="M16 2 18 5" />
                </svg>
            ),
            activeClass: 'text-amber-300',
            inactiveClass: 'text-white/78'
        },
        {
            id: 'favorites',
            label: t('nav.favorites'),
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            ),
            activeClass: 'text-rose-300',
            inactiveClass: 'text-white/78'
        }
    ];

    if (isAdmin) {
        primaryItems.push({
            id: 'admin',
            label: t('header.admin') || 'Admin',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
            ),
            activeClass: 'text-sky-300',
            inactiveClass: 'text-white/78'
        });
    }

    const hasFourPrimaryItems = primaryItems.length >= 4;
    const dockClass = hasFourPrimaryItems
        ? 'w-[calc(100%-5.5rem)]'
        : 'w-[calc(100%-6.5rem)]';
    const primaryButtonSizeClass = hasFourPrimaryItems
        ? 'h-[58px] w-full max-w-[56px]'
        : 'h-[60px] w-full max-w-[60px]';
    const primaryIndicatorWidth = hasFourPrimaryItems ? 56 : 60;
    const primaryIndicatorHeight = hasFourPrimaryItems ? 58 : 60;
    const activePrimaryIndex = primaryItems.findIndex((item) => item.id === activeTab);

    return (
        <nav className="mx-3 mb-3 z-50 pb-safe shrink-0">
            <div className="flex items-end justify-center gap-2.5">
                <div className={`mobile-nav-glass ${dockClass} shrink-0 rounded-[999px] bg-[rgba(24,24,25,0.32)] px-1 py-1`}>
                    <div className="relative flex items-center">
                        {activePrimaryIndex >= 0 && (
                            <div
                                className="pointer-events-none absolute top-0 rounded-[999px] border border-white/22 bg-white/[0.03] transition-all duration-300 ease-out"
                                style={{
                                    width: `${primaryIndicatorWidth}px`,
                                    height: `${primaryIndicatorHeight}px`,
                                    left: `calc((100% / ${primaryItems.length}) * ${activePrimaryIndex} + ((100% / ${primaryItems.length} - ${primaryIndicatorWidth}px) / 2))`
                                }}
                            />
                        )}

                        {primaryItems.map((item) => {
                            const isActive = activeTab === item.id;

                            return (
                                <div key={item.id} className="relative z-10 flex flex-1 justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab(item.id)}
                                        className={`group flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[999px] border px-1 appearance-none bg-transparent shadow-none outline-none ring-0 transition-all duration-200 ${primaryButtonSizeClass} ${isActive
                                            ? 'border-transparent scale-[1.01]'
                                            : 'border-white/5'
                                            }`}
                                    >
                                        <div className={`flex items-center justify-center rounded-full transition-all duration-200 ${hasFourPrimaryItems ? 'h-6 w-6' : 'h-7 w-7'} ${isActive ? 'scale-100' : 'scale-95'}`}>
                                            <div className={isActive ? item.activeClass : item.inactiveClass}>
                                                {item.icon}
                                            </div>
                                        </div>
                                        <span className={`max-w-full truncate text-[8px] font-semibold tracking-[0.01em] leading-none transition-colors duration-200 ${isActive ? item.activeClass : 'text-white/78'}`}>
                                            {item.label}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setActiveTab('search')}
                    className={`mobile-nav-glass flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full appearance-none outline-none ring-0 transition-all duration-200 ${activeTab === 'search'
                        ? 'border-white/22 bg-[rgba(24,24,25,0.32)] text-white shadow-[0_24px_44px_-30px_rgba(0,0,0,0.55)] scale-[1.01]'
                        : 'border-white/14 bg-[rgba(24,24,25,0.32)] text-[color:var(--accent-strong)] shadow-[0_24px_44px_-30px_rgba(0,0,0,0.55)]'
                        }`}
                    aria-label={t('nav.search')}
                    title={t('nav.search')}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'search' ? '2.3' : '2.15'} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="7.5" />
                        <path d="m20 20-4.3-4.3" />
                    </svg>
                </button>
            </div>
        </nav>
    );
}
