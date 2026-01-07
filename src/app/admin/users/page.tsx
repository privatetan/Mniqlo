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

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ wxUserId: string; notifyFrequency: string }>({ wxUserId: '', notifyFrequency: '' });
    const [savingUserId, setSavingUserId] = useState<number | null>(null);

    // Task modal states
    const [selectedTasks, setSelectedTasks] = useState<MonitorTask[]>([]);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
                                        {selectedTasks.map(task => (
                                            <div key={task.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-[#0b5fff]/20 transition-all group">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-[#0b5fff] font-bold group-hover:scale-110 transition-transform shrink-0">
                                                            {task.productId.slice(0, 2)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-black text-gray-900 flex items-center gap-2">
                                                                <span className="font-mono text-[#0b5fff] shrink-0">{task.productCode || 'N/A'}</span>
                                                                <span className="truncate">{task.productName || '未知商品'}</span>
                                                            </p>
                                                            <p className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase mt-0.5">
                                                                ID: {task.productId} • {task.style || 'ANY COLOR'} • {task.size || 'ANY SIZE'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${task.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                                                        {task.isActive ? '正在运行' : '已停止'}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200/50">
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">目标价格</p>
                                                        <p className="text-xs font-bold text-gray-700">¥{task.targetPrice || '无限制'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">检查频率</p>
                                                        <p className="text-xs font-bold text-gray-700">{task.frequency} min</p>
                                                    </div>
                                                </div>
                                                {task.lastPushTime && (
                                                    <div className="mt-3 pt-2 border-t border-gray-200/50">
                                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest leading-none mb-1">最近推送</p>
                                                        <p className="text-[10px] text-gray-500 font-mono uppercase">{task.lastPushTime}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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
