import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface HeaderProps {
    title: string;
}

import { useLanguage } from '@/context/LanguageContext';

export default function Header({ title }: HeaderProps) {
    const router = useRouter();
    const { language, setLanguage, t } = useLanguage();

    const handleLogout = () => {
        if (confirm(language === 'zh' ? '确定要退出登录吗？' : 'Are you sure you want to logout?')) {
            localStorage.removeItem('user');
            router.push('/login');
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'zh' ? 'en' : 'zh');
    };

    return (
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-slate-200/50">
            <div className="w-10">
                <button
                    onClick={toggleLanguage}
                    className="text-xs font-bold text-slate-400 hover:text-sky-600 transition-colors uppercase tracking-wider"
                    style={{ background: 'transparent', padding: 0 }}
                >
                    {language === 'zh' ? 'EN' : 'ZH'}
                </button>
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight flex-1 text-center font-outfit">
                {title}
            </h1>
            <div className="flex items-center gap-3">
                <button
                    onClick={handleLogout}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-all"
                    style={{ background: 'transparent' }}
                >
                    {t('header.logout')}
                </button>
            </div>
        </header>
    );
}
