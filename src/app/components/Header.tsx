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
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-gray-100 shadow-sm">
            <div className="w-10">
                <button
                    onClick={toggleLanguage}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-all uppercase tracking-tighter border border-gray-100 rounded px-1.5 py-0.5"
                >
                    {language === 'zh' ? 'EN' : 'ZH'}
                </button>
            </div>
            <h1 className="text-base font-semibold text-gray-900 tracking-tight flex-1 text-center">{title}</h1>
            <div className="flex items-center gap-3">
                <button
                    onClick={handleLogout}
                    className="text-xs font-medium text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-full transition-all"
                >
                    {t('header.logout')}
                </button>
            </div>
        </header>
    );
}
