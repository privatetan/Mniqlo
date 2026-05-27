'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import AdminUsers from '../../components/AdminUsers';
import { getUser } from '@/lib/session';

export default function AdminUsersPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const verifyAdmin = async () => {
            const user = getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            if (user.id === -1) {
                router.push('/');
                return;
            }

            try {
                const response = await fetch('/api/auth/me');
                const data = await response.json();

                if (!response.ok || !data.success) {
                    localStorage.removeItem('user');
                    router.push('/login');
                    return;
                }

                if (data.user.role !== 'ADMIN') {
                    router.push('/');
                    return;
                }

                setIsAuthorized(true);
            } catch (error) {
                console.error('Admin verification failed:', error);
                localStorage.removeItem('user');
                router.push('/login');
            }
        };

        verifyAdmin();
    }, [router]);

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-transparent">
            <div className="max-w-[1600px] mx-auto p-4 md:p-6">
                <div className="admin-theme-scope shell-panel rounded-[32px] overflow-hidden">
                    <Header title="管理后台" />
                    <div className="h-[calc(100vh-120px)]">
                        <AdminUsers />
                    </div>
                </div>
            </div>
        </div>
    );
}
