import { useRouter } from 'next/navigation';

interface HeaderProps {
    title: string;
}

import { useLanguage } from '@/context/LanguageContext';
import ThemeSwitcher from './ThemeSwitcher';

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
        <header className="sticky top-0 z-40 bg-transparent px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-2 md:gap-3">
                <button
                    onClick={toggleLanguage}
                    className="frost-panel inline-flex h-10 min-w-[3.5rem] items-center justify-center rounded-full px-3 text-xs font-bold text-slate-500 transition-colors uppercase tracking-[0.24em] hover:text-teal-800"
                >
                    {language === 'zh' ? 'EN' : 'ZH'}
                </button>

                <div className="frost-panel min-w-0 flex-1 rounded-full px-4 py-2.5 text-center">
                    <h1 className="truncate text-[1.2rem] font-bold text-slate-800 tracking-tight font-outfit md:text-[1.35rem]">
                        {title}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeSwitcher />
                
                <button
                    onClick={handleLogout}
                    className="frost-panel inline-flex h-10 items-center justify-center rounded-full px-3 text-xs font-medium text-slate-500 transition-all hover:text-rose-500 hover:bg-rose-50/80"
                >
                    {t('header.logout')}
                </button>
                </div>
            </div>
        </header>
    );
}
