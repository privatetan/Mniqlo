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
    const buttonBaseClass = 'flex flex-col items-center gap-0.5 w-full appearance-none border-0 bg-transparent p-0 shadow-none outline-none ring-0 group transition-all duration-300 focus:outline-none focus-visible:outline-none focus-visible:ring-0';

    useEffect(() => {
        const userStr = getUserString();
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.role === 'ADMIN');
        }
    }, []);

    return (
        <nav className="mx-3 mb-2 z-50 pb-safe shrink-0">
            <div className="mobile-nav-glass h-[64px] flex items-center justify-around gap-0.5 rounded-[28px] px-2">
                <button
                    onClick={() => setActiveTab('super-selection')}
                    className={`${buttonBaseClass} ${activeTab === 'super-selection' ? 'text-slate-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-9 h-9 transition-all duration-300 ${activeTab === 'super-selection' ? 'scale-105 -translate-y-0.5' : 'opacity-80 group-hover:scale-105 group-hover:opacity-100'}`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'super-selection' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className={`text-[9px] font-semibold tracking-[0.02em] transition-opacity ${activeTab === 'super-selection' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.selection')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('limited-time')}
                    className={`${buttonBaseClass} ${activeTab === 'limited-time' ? 'text-amber-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-9 h-9 transition-all duration-300 ${activeTab === 'limited-time' ? 'scale-105 -translate-y-0.5' : 'opacity-80 group-hover:scale-105 group-hover:opacity-100'}`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'limited-time' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                            <path d="M8 2 6 5" />
                            <path d="M16 2 18 5" />
                        </svg>
                    </div>
                    <span className={`text-[9px] font-semibold tracking-[0.02em] transition-opacity ${activeTab === 'limited-time' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.limited_time')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`${buttonBaseClass} ${activeTab === 'search' ? 'text-slate-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-9 h-9 transition-all duration-300 ${activeTab === 'search' ? 'scale-105 -translate-y-0.5' : 'opacity-80 group-hover:scale-105 group-hover:opacity-100'}`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'search' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    <span className={`text-[9px] font-semibold tracking-[0.02em] transition-opacity ${activeTab === 'search' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.search')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`${buttonBaseClass} ${activeTab === 'favorites' ? 'text-slate-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-9 h-9 transition-all duration-300 ${activeTab === 'favorites' ? 'scale-105 -translate-y-0.5' : 'opacity-80 group-hover:scale-105 group-hover:opacity-100'}`}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'favorites' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </div>
                    <span className={`text-[9px] font-semibold tracking-[0.02em] transition-opacity ${activeTab === 'favorites' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.favorites')}</span>
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`${buttonBaseClass} ${activeTab === 'admin' ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                        <div className={`flex items-center justify-center w-9 h-9 transition-all duration-300 ${activeTab === 'admin' ? 'scale-105 -translate-y-0.5' : 'opacity-80 group-hover:scale-105 group-hover:opacity-100'}`}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'admin' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                        </div>
                        <span className={`text-[9px] font-semibold tracking-[0.02em] transition-opacity ${activeTab === 'admin' ? 'opacity-100' : 'opacity-70'}`}>{t('header.admin') || 'Admin'}</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
