'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

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
                localStorage.setItem('user', JSON.stringify(data.user));
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
        localStorage.setItem('user', JSON.stringify({ username: 'guest', id: -1 }));
        router.push('/');
    };

    const toggleLanguage = () => {
        setLanguage(language === 'zh' ? 'en' : 'zh');
    };

    return (
        <div className="w-full max-w-md p-10 space-y-8 bg-white md:rounded-3xl shadow-2xl shadow-gray-200/50 relative overflow-hidden border border-gray-100">
            {/* Language Toggle */}
            <div className="absolute top-6 right-6">
                <button
                    onClick={toggleLanguage}
                    className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-tight"
                >
                    {language === 'zh' ? 'EN' : 'ZH'}
                </button>
            </div>

            <div className="space-y-4 text-center flex flex-col items-center">
                <div className="relative w-20 h-20 mb-2 shadow-lg shadow-sky-100 rounded-full overflow-hidden border-4 border-white">
                    <Image
                        src="/logo.jpg"
                        alt="Mniqlo"
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight font-outfit">
                        {isRegistering ? t('reg.title') : t('login.title')}
                    </h2>
                    <p className="text-sm text-gray-400 font-medium mt-1">Inventory Management</p>
                </div>
            </div>

            {error && (
                <div className="p-4 text-xs font-semibold text-red-500 bg-red-50 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-2 duration-200 text-center">
                    {error}
                </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                    <label htmlFor="username" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('login.username')}</label>
                    <input
                        id="username"
                        type="text"
                        required
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-400 transition-all font-medium"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('login.password')}</label>
                    <input
                        id="password"
                        type="password"
                        required
                        className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-400 transition-all font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 mt-4 text-sm font-bold text-white bg-gray-900 rounded-2xl hover:bg-black active:scale-[0.98] transition-all shadow-lg shadow-gray-900/10 disabled:opacity-50"
                >
                    {isLoading ? (isRegistering ? t('reg.loading') : t('login.loading')) : (isRegistering ? t('reg.submit') : t('login.submit'))}
                </button>
            </form>

            <div className="text-center group">
                <button
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                    className="text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors"
                >
                    {isRegistering ? t('login.to_login') : t('login.to_reg')}
                </button>
            </div>

            <div className="relative flex items-center gap-4">
                <div className="flex-1 border-t border-gray-100"></div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none">{t('login.or')}</span>
                <div className="flex-1 border-t border-gray-100"></div>
            </div>

            <button
                onClick={handleGuestLogin}
                className="w-full h-12 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-2xl hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
            >
                {t('login.guest')}
            </button>
        </div>
    );
}
