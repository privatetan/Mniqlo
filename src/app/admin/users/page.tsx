'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';

interface User {
    id: number;
    username: string;
    wxUserId: string | null;
    notifyFrequency: number;
    _count: {
        favorites: number;
        tasks: number;
    };
}

interface MonitorTask {
    id: number;
    productId: string;
    productName: string | null;
    productCode: string | null;
    style: string | null;
    size: string | null;
    targetPrice: number | null;
    frequency: number;
    isActive: boolean;
    lastPushTime: string | null;
    createdAt: string;
}

interface CrawledItem {
    product_id: string;
    code: string;
    name: string;
    color: string;
    size: string;
    price: string;
    min_price: string;
    origin_price: string;
    stock: string;
    gender: string;
    sku_id: string;
}

interface PushSettings {
    user_id: number;
    is_enabled: boolean;
    channel: string;
    frequency: number;
    genders: string[];
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ wxUserId: string; notifyFrequency: string }>({ wxUserId: '', notifyFrequency: '' });
    const [savingUserId, setSavingUserId] = useState<number | null>(null);
    const [crawlLoading, setCrawlLoading] = useState<string | null>(null);

    // Crawl result modal states
    const [newItems, setNewItems] = useState<CrawledItem[]>([]);
    const [soldOutItems, setSoldOutItems] = useState<CrawledItem[]>([]);
    const [isNewItemsModalOpen, setIsNewItemsModalOpen] = useState(false);
    const [crawlSummary, setCrawlSummary] = useState<{ totalFound: number; newCount: number; soldOutCount: number; gender: string } | null>(null);
    const [activeResultTab, setActiveResultTab] = useState<'new' | 'soldout'>('new');

    // Task modal states
    const [selectedTasks, setSelectedTasks] = useState<MonitorTask[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [expandedSyncCode, setExpandedSyncCode] = useState<string | null>(null);
    const [expandedTaskProductId, setExpandedTaskProductId] = useState<string | null>(null);

    // Super Selection Push Settings states
    const [isPushSettingsModalOpen, setIsPushSettingsModalOpen] = useState(false);
    const [selectedPushSettings, setSelectedPushSettings] = useState<PushSettings | null>(null);
    const [savingPushSettings, setSavingPushSettings] = useState(false);
    const [loadingPushSettings, setLoadingPushSettings] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            router.push('/login');
            return;
        }

        const user = JSON.parse(userStr);
        if (user.role !== 'ADMIN') {
            router.push('/');
            return;
        }

        fetchUsers(user.username);
    }, [router]);

    const fetchUsers = async (username?: string) => {
        try {
            setLoading(true);
            const currentUser = username || JSON.parse(localStorage.getItem('user') || '{}').username;
            const response = await fetch('/api/admin/users', {
                headers: {
                    'X-Admin-User': currentUser
                }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                setError(data.message || 'Failed to fetch users');
            }
        } catch (err) {
            setError('An error occurred while fetching users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUserId(user.id);
        setEditForm({
            wxUserId: user.wxUserId || '',
            notifyFrequency: user.notifyFrequency.toString()
        });
    };

    const handleSave = async (username: string) => {
        try {
            setSavingUserId(editingUserId);
            const response = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    wxUserId: editForm.wxUserId,
                    notifyFrequency: editForm.notifyFrequency
                }),
            });
            const data = await response.json();
            if (data.success) {
                setEditingUserId(null);
                await fetchUsers();
            } else {
                alert(data.message || '更新失败');
            }
        } catch (err) {
            alert('更新时发生错误');
            console.error(err);
        } finally {
            setSavingUserId(null);
        }
    };

    const fetchUserTasks = async (user: User) => {
        try {
            setSelectedUser(user);
            setLoadingTasks(true);
            setIsTaskModalOpen(true);
            setExpandedTaskProductId(null);

            const currentUser = JSON.parse(localStorage.getItem('user') || '{}').username;
            const response = await fetch(`/api/admin/users/${user.id}/tasks`, {
                headers: {
                    'X-Admin-User': currentUser
                }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedTasks(data.tasks);
            } else {
                alert(data.message || '获取任务失败');
            }
        } catch (err) {
            console.error(err);
            alert('获取任务时发生错误');
        } finally {
            setLoadingTasks(false);
        }
    };

    const fetchPushSettings = async (user: User) => {
        try {
            setSelectedUser(user);
            setLoadingPushSettings(true);
            setIsPushSettingsModalOpen(true);

            const currentUser = JSON.parse(localStorage.getItem('user') || '{}').username;
            const response = await fetch(`/api/admin/users/${user.id}/push-settings`, {
                headers: {
                    'X-Admin-User': currentUser
                }
            });
            const data = await response.json();
            if (data.success) {
                setSelectedPushSettings(data.settings);
            } else {
                alert(data.message || '获取推送设置失败');
            }
        } catch (err) {
            console.error(err);
            alert('获取推送设置时发生错误');
        } finally {
            setLoadingPushSettings(false);
        }
    };

    const handleSavePushSettings = async () => {
        if (!selectedUser || !selectedPushSettings) return;

        try {
            setSavingPushSettings(true);
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}').username;
            const response = await fetch(`/api/admin/users/${selectedUser.id}/push-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-User': currentUser
                },
                body: JSON.stringify(selectedPushSettings)
            });
            const data = await response.json();
            if (data.success) {
                setIsPushSettingsModalOpen(false);
                alert('推送设置已更新');
            } else {
                alert(data.message || '更新推送设置失败');
            }
        } catch (err) {
            console.error(err);
            alert('更新设置时发生错误');
        } finally {
            setSavingPushSettings(false);
        }
    };

    const handleSyncCrawl = async (gender: string) => {
        if (crawlLoading) return;

        const confirmResult = confirm(`确定开始同步【${gender}】的数据吗？将对数据库进行去重校验，这可能需要几十秒时间。`);
        if (!confirmResult) return;

        try {
            setCrawlLoading(gender);
            const response = await fetch(`/api/crawl?gender=${encodeURIComponent(gender)}`, {
                method: 'POST'
            });
            const data = await response.json();

            if (data.success) {
                setNewItems(data.newItems || []);
                setSoldOutItems(data.soldOutItems || []);
                setCrawlSummary({
                    totalFound: data.totalFound,
                    newCount: data.newCount,
                    soldOutCount: data.soldOutCount,
                    gender: gender
                });

                // Reset tab to 'new' if there are new items, otherwise 'soldout'
                setActiveResultTab(data.newCount > 0 ? 'new' : 'soldout');

                if (data.newCount > 0 || data.soldOutCount > 0) {
                    setIsNewItemsModalOpen(true);
                    setExpandedSyncCode(null);
                } else {
                    alert(`同步完成！共发现 ${data.totalFound} 条数据，数据库中已存在，没有发现任何库存变动。`);
                }
            } else {
                alert(`同步失败: ${data.error || '未知错误'}`);
            }
        } catch (err) {
            console.error(err);
            alert('同步请求发生错误');
        } finally {
            setCrawlLoading(null);
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.wxUserId && user.wxUserId.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const totalUsers = users.length;
    const totalFavorites = users.reduce((acc, user) => acc + user._count.favorites, 0);
    const totalTasks = users.reduce((acc, user) => acc + user._count.tasks, 0);

    return (
        <div className="h-[100dvh] flex flex-col bg-[#f7f7fb] w-full max-w-[1000px] mx-auto overflow-hidden">
            <Header title="用户管理" />

            <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Summary Stats */}
                    {!loading && !error && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black text-[#0b5fff]">{totalUsers}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">总用户</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black text-emerald-500">{totalFavorites}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">总收藏</span>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
                                <span className="text-2xl font-black text-amber-500">{totalTasks}</span>
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mt-1">总任务</span>
                            </div>
                        </div>
                    )}

                    {/* Data Sync Section */}
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#0b5fff]/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0b5fff]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 leading-none">超值精选</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">实时抓取优衣库最新库存数据</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { name: '女装', color: 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100' },
                                { name: '男装', color: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100' },
                                { name: '童装', color: 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-100' },
                                { name: '婴幼儿装', color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100' }
                            ].map((cat) => (
                                <button
                                    key={cat.name}
                                    onClick={() => handleSyncCrawl(cat.name)}
                                    disabled={crawlLoading !== null}
                                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all active:scale-95 ${cat.color} ${crawlLoading === cat.name ? 'ring-2 ring-offset-2 ring-gray-200 opacity-80' : ''} ${crawlLoading && crawlLoading !== cat.name ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                                >
                                    {crawlLoading === cat.name ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent mb-1"></div>
                                    ) : (
                                        <span className="text-xl mb-1">📦</span>
                                    )}
                                    <span className="text-xs font-black tracking-tight">{crawlLoading === cat.name ? '正在同步...' : cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => router.push('/')}
                                className="flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-all rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                <span>返回</span>
                            </button>
                            <button
                                onClick={() => fetchUsers()}
                                className="flex items-center justify-center p-2.5 text-gray-400 hover:text-[#0b5fff] transition-all rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-blue-50"
                                title="刷新"
                            >
                                <svg className={loading ? 'animate-spin' : ''} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
                            </button>
                        </div>

                        <div className="relative w-full sm:max-w-xs">
                            <input
                                type="text"
                                placeholder="搜索用户名或微信ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0b5fff]/20 focus:border-[#0b5fff] transition-all bg-gray-50/50"
                            />
                            <svg
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            >
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>
                    </div>

                    {/* User List */}
                    {loading && users.length === 0 ? (
                        <div className="flex flex-col justify-center items-center py-20 gap-4 text-gray-400">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0b5fff] border-t-transparent"></div>
                            <span className="text-sm">正在加载用户数据...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-100 text-red-600 p-6 rounded-2xl text-center shadow-sm">
                            <p className="font-bold mb-1">加载失败</p>
                            <p className="text-sm opacity-80">{error}</p>
                            <button onClick={() => fetchUsers()} className="mt-4 text-xs font-bold uppercase tracking-wider bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">重试</button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                                <span>搜索结果 ({filteredUsers.length})</span>
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="text-[#0b5fff] hover:underline">清除搜索</button>
                                )}
                            </div>

                            {filteredUsers.length === 0 ? (
                                <div className="bg-white p-20 rounded-2xl text-center text-gray-400 border border-dashed border-gray-200">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    </div>
                                    <p className="text-lg font-medium text-gray-600 mb-1">未找到用户</p>
                                    <p className="text-sm">试试搜索其他关键词</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredUsers.map((user) => (
                                        <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-[#0b5fff]/50 hover:shadow-xl transition-all group relative overflow-hidden">
                                            {/* Accent blob */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0b5fff]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>

                                            <div className="flex justify-between items-start mb-4 relative">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-[#0b5fff] flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#0b5fff] transition-colors leading-tight">
                                                            {user.username}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-400 font-mono">UID # {user.id.toString().padStart(4, '0')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => fetchPushSettings(user)}
                                                        className="text-gray-400 hover:text-emerald-500 transition-colors p-1"
                                                        title="推送设置"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                                    </button>
                                                    {editingUserId === user.id ? (
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                onClick={() => handleSave(user.username)}
                                                                disabled={savingUserId === user.id}
                                                                className="bg-[#0b5fff] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50"
                                                            >
                                                                {savingUserId === user.id ? '保存中' : '保存'}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingUserId(null)}
                                                                className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider hover:bg-gray-200"
                                                            >
                                                                取消
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleEdit(user)}
                                                            className="text-gray-400 hover:text-[#0b5fff] transition-colors p-1"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3 relative">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-[#0b5fff] transition-colors shadow-sm shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" /><path d="M15 9V5" /><path d="M9 9V5" /><path d="M2 13h20" /><path d="M11 13v6" /><path d="M15 13v6" /><path d="M7 13v6" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest leading-none mb-1">推送微信ID</p>
                                                        {editingUserId === user.id ? (
                                                            <input
                                                                type="text"
                                                                value={editForm.wxUserId}
                                                                onChange={(e) => setEditForm(prev => ({ ...prev, wxUserId: e.target.value }))}
                                                                className="w-full text-xs font-mono text-gray-700 bg-gray-50 border-gray-100 rounded px-1.5 py-0.5 focus:border-[#0b5fff] outline-none"
                                                                placeholder="WeChat User ID"
                                                            />
                                                        ) : (
                                                            <p className="text-xs font-mono text-gray-700 truncate bg-gray-50/50 px-1.5 py-0.5 rounded tracking-tighter">
                                                                {user.wxUserId || 'PENDING BINDING'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors shadow-sm shrink-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest leading-none mb-1">微信推送频率</p>
                                                        {editingUserId === user.id ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <input
                                                                    type="number"
                                                                    value={editForm.notifyFrequency}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, notifyFrequency: e.target.value }))}
                                                                    className="w-16 text-xs font-bold text-gray-700 bg-gray-50 border-gray-100 rounded px-1.5 py-0.5 focus:border-[#0b5fff] outline-none"
                                                                />
                                                                <span className="text-[10px] text-gray-400 font-normal">分钟</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm font-bold text-gray-700">{user.notifyFrequency} <span className="text-[10px] text-gray-400 font-normal">分钟/次</span></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 pt-4 border-t border-gray-50 flex gap-4 relative">
                                                <div className="flex-1 text-center group/stat">
                                                    <p className="text-xl font-black text-gray-900 group-hover/stat:text-emerald-500 transition-colors">{user._count.favorites}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">收藏</p>
                                                </div>
                                                <div className="w-px bg-gray-100 my-1 font-black"></div>
                                                <span
                                                    onClick={() => user._count.tasks > 0 && fetchUserTasks(user)}
                                                    className={`flex-1 text-center group/stat transition-all ${user._count.tasks > 0 ? 'cursor-pointer hover:bg-gray-50 rounded-xl' : 'cursor-default'}`}
                                                >
                                                    <p className="text-xl font-black text-gray-900 group-hover/stat:text-amber-500 transition-colors">{user._count.tasks}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-tighter">任务</p>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Task Details Modal */}
                {isTaskModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 leading-tight">用户任务详情</h2>
                                    <p className="text-xs text-gray-400 mt-1">正在查看 <span className="font-bold text-[#0b5fff]">{selectedUser?.username}</span> 的监控任务</p>
                                </div>
                                <button
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto p-6">
                                {loadingTasks ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#0b5fff] border-t-transparent"></div>
                                        <p className="text-sm text-gray-400 font-medium">正在获取任务数据...</p>
                                    </div>
                                ) : selectedTasks.length === 0 ? (
                                    <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <svg className="text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                                        </div>
                                        <p className="text-gray-500 font-bold">该用户暂无任务</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(selectedTasks.reduce((acc, task) => {
                                            const pid = task.productId;
                                            if (!acc[pid]) acc[pid] = [];
                                            acc[pid].push(task);
                                            return acc;
                                        }, {} as Record<string, MonitorTask[]>)).map(([pid, tasks]) => {
                                            const representative = tasks[0];
                                            const isExpanded = expandedTaskProductId === pid;

                                            return (
                                                <div key={pid} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300">
                                                    <div
                                                        onClick={() => setExpandedTaskProductId(isExpanded ? null : pid)}
                                                        className="p-4 cursor-pointer hover:bg-white flex justify-between items-center group/card"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-[#0b5fff] font-bold group-hover/card:scale-110 transition-transform shrink-0">
                                                                {representative.productId.slice(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                                    <span className="font-mono text-[#0b5fff] shrink-0">{representative.productCode || 'N/A'}</span>
                                                                    <span className="truncate">{representative.productName || '未知商品'}</span>
                                                                </p>
                                                                <p className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase mt-0.5">
                                                                    ID: {representative.productId} • {tasks.length} 个规格
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className="border-t border-gray-200/50 bg-white/50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                                                            {tasks.map(task => (
                                                                <div key={task.id} className="bg-white p-3 rounded-xl border border-gray-100">
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className="flex gap-2">
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-700">{task.style || 'ANY COLOR'}</span>
                                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-700">{task.size || 'ANY SIZE'}</span>
                                                                        </div>
                                                                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${task.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                                                            {task.isActive ? '运行中' : '静默'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex justify-between items-end">
                                                                        <div className="flex gap-4">
                                                                            <div>
                                                                                <p className="text-[8px] text-gray-400 uppercase font-black leading-none mb-1">目标</p>
                                                                                <p className="text-[10px] font-bold text-gray-700">¥{task.targetPrice || '不限'}</p>
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-[8px] text-gray-400 uppercase font-black leading-none mb-1">频率</p>
                                                                                <p className="text-[10px] font-bold text-gray-700">{task.frequency}min</p>
                                                                            </div>
                                                                        </div>
                                                                        {task.lastPushTime && (
                                                                            <div className="text-right">
                                                                                <p className="text-[8px] text-gray-400 uppercase font-black leading-none mb-1">最后推送</p>
                                                                                <p className="text-[9px] text-gray-500 font-mono">{task.lastPushTime}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => setIsTaskModalOpen(false)}
                                    className="px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all"
                                >
                                    完成
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sync Results Modal */}
                {isNewItemsModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
                            {/* Modal Header */}
                            <div className="p-8 pb-6 border-b border-gray-100 flex justify-between items-start bg-gradient-to-br from-white to-[#0b5fff]/5">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-[#0b5fff] text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">同步成功</span>
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">抓取完成：库存变动详情</h2>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">
                                        【{crawlSummary?.gender}】共找到 <span className="text-gray-900 font-bold">{crawlSummary?.totalFound}</span> 条库存 |
                                        新增 <span className="text-[#0b5fff] font-black">{crawlSummary?.newCount}</span> 条 (共 <span className="text-[#0b5fff] font-black">{
                                            Object.keys((activeResultTab === 'new' ? newItems : soldOutItems).reduce((acc, item) => {
                                                if (!acc[item.code]) acc[item.code] = [];
                                                acc[item.code].push(item);
                                                return acc;
                                            }, {} as Record<string, CrawledItem[]>)).length
                                        }</span> 款) |
                                        已下架 <span className="text-rose-500 font-black">{crawlSummary?.soldOutCount}</span>
                                    </p>
                                </div>
                                <span
                                    onClick={() => setIsNewItemsModalOpen(false)}
                                    className="p-3 hover:bg-white hover:shadow-lg rounded-2xl transition-all text-gray-400 hover:text-gray-900 active:scale-90"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </span>
                            </div>

                            {/* Tab Switcher */}
                            <div className="px-8 flex gap-4 border-b border-gray-50 bg-white">
                                <span
                                    onClick={() => setActiveResultTab('new')}
                                    className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeResultTab === 'new' ? 'border-[#0b5fff] text-[#0b5fff]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    新增库存 ({crawlSummary?.newCount})
                                </span>
                                <span
                                    onClick={() => setActiveResultTab('soldout')}
                                    className={`py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeResultTab === 'soldout' ? 'border-rose-500 text-rose-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    已下架/售罄 ({crawlSummary?.soldOutCount})
                                </span>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-auto p-4 sm:p-8 bg-gray-50/50">
                                <div className="space-y-4">
                                    {Object.entries((activeResultTab === 'new' ? newItems : soldOutItems).reduce((acc, item) => {
                                        if (!acc[item.code]) acc[item.code] = [];
                                        acc[item.code].push(item);
                                        return acc;
                                    }, {} as Record<string, CrawledItem[]>)).map(([code, items]) => {
                                        const representative = items[0];
                                        const isExpanded = expandedSyncCode === code;

                                        return (
                                            <div key={code} className={`bg-white rounded-3xl border shadow-sm transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-[#0b5fff]/20' : ''} ${activeResultTab === 'new' ? 'border-gray-100' : 'border-rose-100'}`}>
                                                <div
                                                    onClick={() => setExpandedSyncCode(isExpanded ? null : code)}
                                                    className="p-5 cursor-pointer hover:bg-gray-50 flex items-center justify-between group/card"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner group-hover/card:scale-110 transition-transform overflow-hidden ${activeResultTab === 'new' ? 'bg-gray-50 text-[#0b5fff]' : 'bg-rose-50 text-rose-500'}`}>
                                                            {representative.code}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${activeResultTab === 'new' ? 'text-blue-400 bg-blue-50' : 'text-rose-400 bg-rose-50'}`}>
                                                                    {activeResultTab === 'new' ? `${items.length} 个新增` : `${items.length} 个售罄`}
                                                                </span>
                                                            </div>
                                                            <h4 className={`text-sm font-black text-gray-900 line-clamp-1 transition-colors ${activeResultTab === 'new' ? 'group-hover/card:text-[#0b5fff]' : 'group-hover/card:text-rose-500'}`}>
                                                                {representative.name}
                                                            </h4>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col items-end">
                                                            <div className="flex items-baseline gap-1">
                                                                {representative.origin_price && parseFloat(representative.origin_price as any) > parseFloat(representative.price as any) && (
                                                                    <span className="text-[10px] text-gray-400 line-through">¥{representative.origin_price}</span>
                                                                )}
                                                                <span className={`text-base font-black ${activeResultTab === 'new' ? 'text-rose-500' : 'text-gray-400 line-through'}`}>
                                                                    ¥{representative.price}
                                                                </span>
                                                            </div>
                                                            <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest mt-0.5">参考价</span>
                                                        </div>
                                                        <svg className={`w-6 h-6 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="bg-gray-50/50 p-4 border-t border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                        {items.map((item, idx) => (
                                                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                                                <div className="flex gap-3">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1 text-center">颜色</span>
                                                                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">{item.color}</span>
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1 text-center">尺寸</span>
                                                                        <span className="text-xs font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">{item.size}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-6">
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">价格</span>
                                                                        <div className="flex items-baseline gap-1">
                                                                            {item.origin_price && parseFloat(item.origin_price as any) > parseFloat(item.price as any) && (
                                                                                <span className="text-[10px] text-gray-400 line-through">¥{item.origin_price}</span>
                                                                            )}
                                                                            <span className={`text-sm font-black ${activeResultTab === 'new' ? 'text-rose-500' : 'text-gray-400 line-through'}`}>¥{item.price}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end w-12">
                                                                        <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">数量</span>
                                                                        <span className="text-xs font-bold text-gray-700">{item.stock}</span>
                                                                    </div>
                                                                    <div className="flex flex-col items-end w-16">
                                                                        <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">当前状态</span>
                                                                        <span className={`text-xs font-black ${activeResultTab === 'new' ? (parseFloat(item.stock as any) === 0 ? 'text-orange-500' : 'text-emerald-500') : 'text-rose-500'}`}>
                                                                            {activeResultTab === 'new' ? (parseFloat(item.stock as any) === 0 ? '暂无' : '有货') : '已售罄'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {(activeResultTab === 'new' ? newItems : soldOutItems).length === 0 && (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="text-4xl text-gray-200">🌑</div>
                                            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">此处没有变动记录</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 bg-white border-t border-gray-100 flex justify-between items-center sm:px-8">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Antigravity Crawler Engine • {new Date().toLocaleDateString()}
                                </p>
                                <button
                                    onClick={() => setIsNewItemsModalOpen(false)}
                                    className="px-10 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black shadow-xl shadow-gray-200 hover:shadow-[#0b5fff]/20 hover:bg-[#0b5fff] active:scale-95 transition-all"
                                >
                                    查看完毕
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Super Selection Push Settings Modal */}
                {isPushSettingsModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                            {/* Modal Header */}
                            <div className="p-8 pb-6 border-b border-gray-100 bg-gradient-to-br from-white to-emerald-50/30">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">Notification</span>
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">超值精选推送设置</h2>
                                        </div>
                                        <p className="text-xs text-gray-400 font-medium">设置 <span className="font-bold text-gray-900">{selectedUser?.username}</span> 的全局库存推送权限</p>
                                    </div>
                                    <button
                                        onClick={() => setIsPushSettingsModalOpen(false)}
                                        className="p-3 hover:bg-white hover:shadow-lg rounded-2xl transition-all text-gray-400 hover:text-gray-900 active:scale-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 space-y-8 flex-1 overflow-auto">
                                {loadingPushSettings ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent"></div>
                                        <p className="text-sm text-gray-400 font-medium">正在获取配置...</p>
                                    </div>
                                ) : selectedPushSettings && (
                                    <>
                                        {/* Status Toggle */}
                                        <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl border border-gray-100 group">
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">推送开关</h4>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">是否向该用户推送新增库存消息</p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedPushSettings({ ...selectedPushSettings, is_enabled: !selectedPushSettings.is_enabled })}
                                                className={`w-14 h-8 rounded-full transition-all relative ${selectedPushSettings.is_enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${selectedPushSettings.is_enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                            </button>
                                        </div>

                                        {/* Channel Info */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">推送配置详情</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
                                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">通知渠道</p>
                                                    <div className="flex items-center gap-2 text-[#07c160] font-black">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                        <span className="text-sm uppercase">{selectedPushSettings.channel}</span>
                                                    </div>
                                                </div>
                                                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-2">
                                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">推送频率 (分钟)</p>
                                                    <input
                                                        type="number"
                                                        value={selectedPushSettings.frequency}
                                                        onChange={(e) => setSelectedPushSettings({ ...selectedPushSettings, frequency: parseInt(e.target.value) || 60 })}
                                                        className="w-full text-sm font-black text-gray-900 border-none p-0 focus:ring-0 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gender Filter */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">订阅栏目权限</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {['女装', '男装', '童装', '婴幼儿装'].map((gender) => {
                                                    const isSelected = selectedPushSettings.genders.includes(gender);
                                                    return (
                                                        <button
                                                            key={gender}
                                                            onClick={() => {
                                                                const newGenders = isSelected
                                                                    ? selectedPushSettings.genders.filter(g => g !== gender)
                                                                    : [...selectedPushSettings.genders, gender];
                                                                setSelectedPushSettings({ ...selectedPushSettings, genders: newGenders });
                                                            }}
                                                            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${isSelected ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-500/10' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                                                        >
                                                            <span className={`text-xs font-black transition-colors ${isSelected ? 'text-emerald-700' : 'text-gray-600'}`}>{gender}</span>
                                                            {isSelected && (
                                                                <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* WeChat Binding Status */}
                                        {!selectedUser?.wxUserId && (
                                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-3">
                                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                                                </div>
                                                <p className="text-[10px] text-orange-700 font-bold leading-relaxed">
                                                    该用户尚未绑定微信 (X-Admin-User ID)，即使开启通知也无法成功接收微信消息。
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 bg-white border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => setIsPushSettingsModalOpen(false)}
                                    className="flex-1 py-4 text-xs font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSavePushSettings}
                                    disabled={savingPushSettings || !selectedPushSettings}
                                    className="flex-[2] py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:shadow-emerald-500/20 hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                >
                                    {savingPushSettings ? '正在保存...' : '保存配置'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style jsx global>{`
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                ::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
