import { useRouter } from 'next/navigation';

interface HeaderProps {
    title: string;
    showFilterToggle?: boolean;
    isFilterPanelOpen?: boolean;
    onToggleFilterPanel?: () => void;
}

import { useLanguage } from '@/context/LanguageContext';
import ThemeSwitcher from './ThemeSwitcher';

export default function Header({ title, showFilterToggle = false, isFilterPanelOpen = false, onToggleFilterPanel }: HeaderProps) {
    const router = useRouter();
    const { t } = useLanguage();

    const handleLogout = () => {
        if (confirm(t('header.logout_confirm'))) {
            localStorage.removeItem('user');
            router.push('/login');
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-transparent px-4 py-3 md:px-6">
            <div className="flex items-center justify-between gap-2 md:gap-3">
                {showFilterToggle ? (
                    <button
                        type="button"
                        onClick={onToggleFilterPanel}
                        className={`filter-surface inline-flex h-10 min-w-[3.5rem] items-center justify-center rounded-full px-3 transition-colors ${isFilterPanelOpen ? 'text-teal-800 bg-emerald-50/80' : 'text-slate-500 hover:text-teal-800'}`}
                        aria-label={t('header.filters')}
                        title={t('header.filters')}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="7" x2="20" y2="7" />
                            <line x1="7" y1="12" x2="17" y2="12" />
                            <line x1="10" y1="17" x2="14" y2="17" />
                        </svg>
                    </button>
                ) : (
                    <div className="h-10 min-w-[3.5rem] shrink-0" />
                )}

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
