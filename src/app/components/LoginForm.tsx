'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { saveSession } from '@/lib/session';
import ThemeSwitcher from './ThemeSwitcher';

export default function LoginForm() {
    const router = useRouter();
    const { t, language, setLanguage } = useLanguage();
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.success) {
                saveSession(data.user);
                router.push('/');
            } else {
                setError(data.message || (isRegistering ? t('reg.err_msg') : t('login.err_msg')));
            }
        } catch (err) {
            setError(t('login.err_generic'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = () => {
        saveSession({ username: 'guest', id: -1 });
        router.push('/');
    };

    const toggleLanguage = () => {
        setLanguage(language === 'zh' ? 'en' : 'zh');
    };

    return (
        <div className="shell-panel w-full max-w-md p-10 space-y-8 md:rounded-[32px] relative overflow-hidden border border-white/70">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(151,174,199,0.16),transparent_34%),radial-gradient(circle_at_bottom,rgba(95,146,132,0.12),transparent_30%)]" />
            <div className="absolute top-6 left-6 z-10">
                <ThemeSwitcher align="left" compact />
            </div>
            {/* Language Toggle */}
            <div className="absolute top-6 right-6 z-10">
                <button
                    onClick={toggleLanguage}
                    className="text-xs font-bold text-slate-500 hover:text-teal-800 transition-colors uppercase tracking-[0.24em] bg-transparent border-0 shadow-none"
                >
                    {language === 'zh' ? 'EN' : 'ZH'}
                </button>
            </div>

            <div className="space-y-4 text-center flex flex-col items-center relative z-10">
                <div className="relative w-20 h-20 mb-2 shadow-[0_22px_40px_-24px_rgba(47,96,93,0.65)] rounded-full overflow-hidden border-4 border-white/80">
                    <Image
                        src="/logo.jpg"
                        alt="Mniqlo"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <div>
                    <h2 className="text-[2.1rem] font-bold text-slate-800 tracking-tight font-outfit">
                        {isRegistering ? t('reg.title') : t('login.title')}
                    </h2>
                    <p className="text-sm text-slate-400 font-medium mt-1 tracking-[0.18em] uppercase">Inventory Management</p>
                </div>
            </div>

            {error && (
                <div className="relative z-10 p-4 text-xs font-semibold text-rose-500 bg-rose-50/80 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-top-2 duration-200 text-center">
                    {error}
                </div>
            )}

            <form className="space-y-5 relative z-10" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                    <label htmlFor="username" className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.24em] ml-1">{t('login.username')}</label>
                    <input
                        id="username"
                        type="text"
                        required
                        className="w-full h-12 px-4 bg-white/75 border border-white/70 rounded-[18px] text-sm outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-all font-medium"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-[11px] font-bold text-slate-400 uppercase tracking-[0.24em] ml-1">{t('login.password')}</label>
                    <input
                        id="password"
                        type="password"
                        required
                        className="w-full h-12 px-4 bg-white/75 border border-white/70 rounded-[18px] text-sm outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-all font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 mt-4 text-sm font-bold text-white bg-gradient-to-r from-teal-700 to-slate-900 rounded-[18px] hover:from-teal-800 hover:to-slate-950 active:scale-[0.98] transition-all shadow-[0_24px_42px_-24px_rgba(47,96,93,0.72)] disabled:opacity-50 border border-white/20"
                >
                    {isLoading ? (isRegistering ? t('reg.loading') : t('login.loading')) : (isRegistering ? t('reg.submit') : t('login.submit'))}
                </button>
            </form>

            <div className="text-center group relative z-10">
                <button
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-transparent border-0 shadow-none"
                >
                    {isRegistering ? t('login.to_login') : t('login.to_reg')}
                </button>
            </div>

            <div className="relative z-10 flex items-center gap-4">
                <div className="flex-1 border-t border-white/70"></div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.32em] leading-none">{t('login.or')}</span>
                <div className="flex-1 border-t border-white/70"></div>
            </div>

            <button
                onClick={handleGuestLogin}
                className="relative z-10 w-full h-12 text-sm font-bold text-slate-600 bg-white/75 border border-white/70 rounded-[18px] hover:bg-emerald-50/60 hover:border-emerald-100 hover:text-teal-800 active:scale-[0.98] transition-all"
            >
                {t('login.guest')}
            </button>
        </div>
    );
}
