'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';

type ActiveTab = 'search' | 'favorites' | 'super-selection' | 'limited-time' | 'admin';

type SidebarProps = {
    activeTab: ActiveTab;
    isAdmin: boolean;
    setActiveTab: (tab: ActiveTab) => void;
};

type NavItem = {
    id: ActiveTab;
    label: string;
    icon: ReactNode;
};

export default function Sidebar({ activeTab, isAdmin, setActiveTab }: SidebarProps) {
    const { t } = useLanguage();

    const navItems: NavItem[] = [
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
            id: 'limited-time',
            label: t('nav.limited_time'),
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                    <path d="M8 2 6 5" />
                    <path d="M16 2 18 5" />
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
        <aside className="hidden md:flex flex-col w-72 bg-transparent h-full shrink-0 z-20 px-4 py-4">
            <div className="frost-panel rounded-[30px] px-5 py-5 flex items-center gap-3 mb-5">
                <div className="relative w-12 h-12 shrink-0 overflow-hidden rounded-full ring-1 ring-white/70 shadow-[0_18px_36px_-26px_rgba(47,96,93,0.6)]">
                    <Image
                        src="/logo.jpg"
                        alt="Mniqlo"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <div>
                    <h2 className="text-[2rem] leading-none text-slate-800 tracking-tight font-outfit">Mniqlo</h2>
                </div>
            </div>
            <nav className="flex-1 px-2 space-y-2.5">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-[22px] transition-all duration-300 group border ${activeTab === item.id
                            ? 'frost-panel text-teal-900 border-white/70 shadow-[0_24px_42px_-34px_rgba(47,96,93,0.58)]'
                            : 'bg-transparent text-slate-500 border-transparent hover:bg-white/55 hover:text-slate-700 hover:border-white/60'
                            }`}
                    >
                        <span className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110 text-teal-800' : 'group-hover:scale-110'}`}>{item.icon}</span>
                        <span className="font-semibold text-sm">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="px-4 pb-4 pt-6">
                <div className="text-[11px] text-slate-400 font-semibold tracking-[0.22em] uppercase">{t('nav.est')}</div>
            </div>
        </aside>
    );
}
