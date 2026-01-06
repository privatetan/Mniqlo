import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            setIsAdmin(user.role === 'ADMIN');
        }
    }, []);

    const handleLogout = () => {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('user');
            router.push('/login');
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-4 py-3 flex justify-between items-center border-b border-gray-100 shadow-sm">
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">{title}</h1>
            <div className="flex items-center gap-4">
                {pathname !== '/admin/users' && isAdmin && (
                    <span
                        onClick={() => router.push('/admin/users')}
                        className="text-sm font-medium text-[#0b5fff] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        管理
                    </span>
                )}
                <span
                    onClick={handleLogout}
                    className="text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                    退出
                </span>
            </div>
        </header>
    );
}
