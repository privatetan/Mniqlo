import React from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    title: string;
}

export default function Header({ title }: HeaderProps) {
    const router = useRouter();

    const handleLogout = () => {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('user');
            router.push('/login');
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-white px-4 py-3 pb-0 flex justify-between items-center">
            <h1 className="text-xl font-bold">{title}</h1>
            <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
            >
                退出
            </button>
        </header>
    );
}
