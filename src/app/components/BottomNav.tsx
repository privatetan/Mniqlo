'use client';

type BottomNavProps = {
    activeTab: 'search' | 'favorites' | 'super-selection' | 'admin';
    setActiveTab: (tab: 'search' | 'favorites' | 'super-selection' | 'admin') => void;
};

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
    const { t } = useLanguage();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.role === 'ADMIN');
        }
    }, []);

    return (
        <nav className="w-full bg-white/80 backdrop-blur-md border-t border-gray-100 z-50 pb-safe shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="h-[65px] flex items-center justify-around px-4">
                <button
                    onClick={() => setActiveTab('super-selection')}
                    className={`flex flex-col items-center gap-1 w-full bg-transparent group transition-all ${activeTab === 'super-selection' ? 'text-gray-900' : 'text-gray-400'}`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span className="text-[10px] font-semibold tracking-tight">{t('nav.selection')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex flex-col items-center gap-1 w-full bg-transparent group transition-all ${activeTab === 'search' ? 'text-gray-900' : 'text-gray-400'}`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                    <span className="text-[10px] font-semibold tracking-tight">{t('nav.search')}</span>
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`flex flex-col items-center gap-1 w-full bg-transparent group transition-all ${activeTab === 'favorites' ? 'text-gray-900' : 'text-gray-400'}`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <span className="text-[10px] font-semibold tracking-tight">{t('nav.favorites')}</span>
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex flex-col items-center gap-1 w-full bg-transparent group transition-all ${activeTab === 'admin' ? 'text-gray-900' : 'text-gray-400'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                        <span className="text-[10px] font-semibold tracking-tight">{t('header.admin') || 'Admin'}</span>
                    </button>
                )}
            </div>
        </nav>
    );
}
