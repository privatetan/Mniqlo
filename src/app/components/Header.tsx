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
        <header className="sticky top-0 z-40 frost-panel px-6 py-4 flex justify-between items-center border-b border-white/60">
            <div className="w-10">
                <button
                    onClick={toggleLanguage}
                    className="text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors uppercase tracking-[0.24em]"
                    style={{ background: 'transparent', padding: 0 }}
                >
                    {language === 'zh' ? 'EN' : 'ZH'}
                </button>
            </div>
            <h1 className="text-[1.35rem] font-bold text-slate-800 tracking-tight flex-1 text-center font-outfit">
                {title}
            </h1>
            <div className="flex items-center gap-3">
                <ThemeSwitcher />
                <button
                    onClick={handleLogout}
                    className="text-xs font-medium text-slate-500 hover:text-rose-500 hover:bg-rose-50/80 hover:border-rose-100 px-3 py-1.5 rounded-full transition-all"
                    style={{ background: 'transparent' }}
                >
                    {t('header.logout')}
                </button>
            </div>
        </header>
    );
}
