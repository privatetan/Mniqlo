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

    return (
        <nav className="shell-panel mx-4 mb-4 rounded-[30px] z-50 pb-safe shrink-0">
            <div className="h-[74px] flex items-center justify-around px-4">
                <button
                    onClick={() => setActiveTab('super-selection')}
                    className={`flex flex-col items-center gap-1.5 w-full bg-transparent group transition-all duration-300 ${activeTab === 'super-selection' ? 'text-slate-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300 ${activeTab === 'super-selection' ? 'soft-pill-active scale-110 -translate-y-1' : 'soft-pill group-hover:scale-105 group-hover:bg-white/80'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'super-selection' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${activeTab === 'super-selection' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.selection')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('limited-time')}
                    className={`flex flex-col items-center gap-1.5 w-full bg-transparent group transition-all duration-300 ${activeTab === 'limited-time' ? 'text-amber-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300 ${activeTab === 'limited-time' ? 'bg-amber-50 text-amber-700 border border-amber-100 shadow-[0_18px_34px_-26px_rgba(180,83,9,0.42)] scale-110 -translate-y-1' : 'soft-pill group-hover:scale-105 group-hover:bg-white/80'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'limited-time' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                            <path d="M8 2 6 5" />
                            <path d="M16 2 18 5" />
                        </svg>
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${activeTab === 'limited-time' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.limited_time')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex flex-col items-center gap-1.5 w-full bg-transparent group transition-all duration-300 ${activeTab === 'search' ? 'text-slate-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300 ${activeTab === 'search' ? 'soft-pill-active scale-110 -translate-y-1' : 'soft-pill group-hover:scale-105 group-hover:bg-white/80'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'search' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${activeTab === 'search' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.search')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`flex flex-col items-center gap-1.5 w-full bg-transparent group transition-all duration-300 ${activeTab === 'favorites' ? 'text-slate-700' : 'text-slate-400'}`}
                >
                    <div className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300 ${activeTab === 'favorites' ? 'soft-pill-active scale-110 -translate-y-1' : 'soft-pill group-hover:scale-105 group-hover:bg-white/80'}`}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'favorites' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </div>
                    <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${activeTab === 'favorites' ? 'opacity-100' : 'opacity-70'}`}>{t('nav.favorites')}</span>
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex flex-col items-center gap-1.5 w-full bg-transparent group transition-all duration-300 ${activeTab === 'admin' ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                        <div className={`flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300 ${activeTab === 'admin' ? 'soft-pill-active scale-110 -translate-y-1' : 'soft-pill group-hover:scale-105 group-hover:bg-white/80'}`}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === 'admin' ? '2.5' : '2'} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="8.5" cy="7" r="4" />
                                <line x1="20" y1="8" x2="20" y2="14" />
                                <line x1="23" y1="11" x2="17" y2="11" />
                            </svg>
                        </div>
                        <span className={`text-[10px] font-semibold tracking-wide transition-opacity ${activeTab === 'admin' ? 'opacity-100' : 'opacity-70'}`}>{t('header.admin') || 'Admin'}</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
