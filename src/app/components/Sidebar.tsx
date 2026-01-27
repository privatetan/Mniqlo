'use client';

type SidebarProps = {
    activeTab: 'search' | 'favorites' | 'super-selection' | 'admin';
    setActiveTab: (tab: 'search' | 'favorites' | 'super-selection' | 'admin') => void;
};

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';

import Image from 'next/image';

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const { t } = useLanguage();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.role === 'ADMIN');
        }
    }, []);

    const navItems = [
        {
            id: 'super-selection',
            label: t('nav.selection'),
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
            )
        },
        {
            id: 'search',
            label: t('nav.search'),
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
            )
        },
        {
            id: 'favorites',
            label: t('nav.favorites'),
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
            )
        }
    ];

    if (isAdmin) {
        navItems.push({
            id: 'admin',
            label: t('header.admin'),
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
            )
        });
    }

    return (
        <aside className="hidden md:flex flex-col w-64 bg-transparent h-full shrink-0 z-20">
            <div className="p-8 flex items-center gap-3">
                <div className="relative w-10 h-10 shrink-0">
                    <Image
                        src="/logo.jpg"
                        alt="Mniqlo"
                        fill
                        className="object-contain rounded-full"
                        priority
                    />
                </div>
                <h2 className="text-2xl font-bold text-sky-900 tracking-tight font-outfit">Mniqlo</h2>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id
                            ? 'bg-sky-100 text-sky-600 shadow-sm shadow-sky-100'
                            : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                            }`}
                    >
                        <span className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                        <span className="font-semibold text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="p-6">
                <div className="text-[11px] text-sky-900/40 font-semibold tracking-wide">{t('nav.est')}</div>
            </div>
        </aside>
    );
}
