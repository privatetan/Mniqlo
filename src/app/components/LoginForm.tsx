'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
    const router = useRouter();
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
                setError(data.message || (isRegistering ? '注册失败' : '登录失败'));
            }
        } catch (err) {
            setError('发生错误，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestLogin = () => {
        localStorage.setItem('user', JSON.stringify({ username: 'guest', id: -1 }));
        router.push('/');
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-center text-gray-900">
                {isRegistering ? '注册 Mniqlo 账号' : '欢迎使用 Mniqlo'}
            </h2>

            {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                    {error}
                </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">用户名</label>
                    <input
                        id="username"
                        type="text"
                        required
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">密码</label>
                    <input
                        id="password"
                        type="password"
                        required
                        className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 text-white bg-black rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
                >
                    {isLoading ? (isRegistering ? '注册中...' : '登录中...') : (isRegistering ? '注册' : '登录')}
                </button>
            </form>

            <div className="text-center">
                <span
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                    className="text-sm text-gray-600 hover:underline hover:text-black"
                >
                    {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
                </span>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">或者</span>
                </div>
            </div>

            <button
                onClick={handleGuestLogin}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
            >
                游客登录
            </button>
        </div>
    );
}
