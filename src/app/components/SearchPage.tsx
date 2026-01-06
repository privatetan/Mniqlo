'use client';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';

import { FavoriteItem, StockItem } from '@/types';
import { parseLocalTime } from '@/lib/date-utils';

type GroupedData = {
    key: string;
    totalStock: number;
    subItems: {
        key: string;
        stock: number;
        breakdown: StockItem[];
    }[];
};

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'color' | 'size'>('color');
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);

    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

    useEffect(() => {
        const fetchFavorites = async () => {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);

                // Guest handling
                if (user.id === -1) {
                    const savedFavs = localStorage.getItem('favorites');
                    if (savedFavs) {
                        try {
                            setFavorites(JSON.parse(savedFavs));
                        } catch (e) {
                            console.error(e);
                        }
                    }
                    return;
                }

                try {
                    const res = await fetch(`/api/favorites?userId=${user.id}`);
                    const data = await res.json();
                    if (data.success) {
                        const mapped = data.favorites.map((f: any) => ({
                            id: f.id,
                            key: f.id ? f.id.toString() : `${f.style}-${f.size}`,
                            productId: f.product_id || f.productId,
                            code: f.code,
                            name: f.name,
                            color: f.style || f.color || '',
                            size: f.size || '',
                            price: f.price,
                            timestamp: parseLocalTime(f.created_at || f.createdAt || f.timestamp).getTime(),
                            imageUrl: f.image_url || f.imageUrl
                        }));
                        setFavorites(mapped);
                    }
                } catch (e) {
                    console.error(e);
                }
            }
        };

        fetchFavorites();

        const handleFavoritesUpdated = () => {
            fetchFavorites();
        };

        window.addEventListener('favorites-updated', handleFavoritesUpdated);
        return () => {
            window.removeEventListener('favorites-updated', handleFavoritesUpdated);
        };
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    if (user.id !== -1) {
                        const res = await fetch(`/api/search/history?userId=${user.id}`);
                        const data = await res.json();
                        if (data.success) {
                            // Merge with local history or just set it?
                            // Let's prefer server history but keep local if unique?
                            // Simple approach: Server history takes precedence
                            const serverKeywords = data.history.map((h: any) => h.keyword);
                            // Combine with local unique
                            const localHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
                            const combined = Array.from(new Set([...serverKeywords, ...localHistory])).slice(0, 10);
                            setHistory(combined);
                            localStorage.setItem('searchHistory', JSON.stringify(combined));
                        }
                    } else {
                        // Guest: Load from local
                        const saved = localStorage.getItem('searchHistory');
                        if (saved) setHistory(JSON.parse(saved));
                    }
                } catch (e) {
                    console.error('Failed to load history', e);
                    const saved = localStorage.getItem('searchHistory');
                    if (saved) setHistory(JSON.parse(saved));
                }
            } else {
                const saved = localStorage.getItem('searchHistory');
                if (saved) setHistory(JSON.parse(saved));
            }
        };

        fetchHistory();
    }, []);

    const toggleFavorite = async (style: string, size: string) => {
        if (!result) return;

        const key = `${style}-${size}`;
        const isFav = favorites.some(f => f.productId === result.productId && f.color === style && f.size === size);

        const userStr = localStorage.getItem('user');
        if (!userStr) {
            alert('Please login to use favorites'); // Should be covered by route protection but just in case
            return;
        }
        const user = JSON.parse(userStr);

        // Guest handling
        if (user.id === -1) {
            let newFavs;
            if (isFav) {
                newFavs = favorites.filter(f => !(f.productId === result.productId && f.color === style && f.size === size));
            } else {
                const newItem: FavoriteItem = {
                    key: `${result.productId}-${style}-${size}`, // Temp key for guest
                    productId: result.productId,
                    code: result.code,
                    name: result.productName,
                    color: style,
                    size: size,
                    price: result.minPrice,
                    timestamp: Date.now()
                };
                newFavs = [...favorites, newItem];
            }
            setFavorites(newFavs);
            localStorage.setItem('favorites', JSON.stringify(newFavs));
            window.dispatchEvent(new Event('favorites-updated'));
            return;
        }

        try {
            if (isFav) {
                const itemToRemove = favorites.find(f => f.productId === result.productId && f.color === style && f.size === size);
                if (itemToRemove) {
                    const query = itemToRemove.id
                        ? `/api/favorites?id=${itemToRemove.id}`
                        : `/api/favorites?userId=${user.id}&productId=${itemToRemove.productId}&style=${style}&size=${size}`;
                    await fetch(query, {
                        method: 'DELETE'
                    });
                }
                setFavorites(favorites.filter(f => !(f.productId === result.productId && f.color === style && f.size === size)));
            } else {
                const newItem = {
                    userId: user.id,
                    productId: result.productId,
                    code: result.code,
                    name: result.productName,
                    price: result.minPrice,
                    style,
                    size,
                    imageUrl: null // TODO?
                };

                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem)
                });

                if (res.ok) {
                    // Optimistic add or refetch?
                    // Let's refetch to get the correct object or just construct one
                    const addedFav: FavoriteItem = {
                        key: `${result.productId}-${style}-${size}`,
                        productId: result.productId,
                        code: result.code,
                        name: result.productName,
                        color: style,
                        size: size,
                        price: result.minPrice,
                        timestamp: Date.now()
                    };
                    setFavorites([...favorites, addedFav]);
                }
            }
            window.dispatchEvent(new Event('favorites-updated'));
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    };

    const updateHistory = (newQuery: string) => {
        let newHistory = [newQuery, ...history.filter(h => h !== newQuery)].slice(0, 3);
        setHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    };

    const removeFromHistory = (e: React.MouseEvent, item: string) => {
        e.stopPropagation();
        const newHistory = history.filter(h => h !== item);
        setHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    };

    const handleSearch = async (overrideQuery?: string) => {
        const searchText = overrideQuery || query;
        if (!searchText.trim()) return;

        // Update query state if triggered via history click
        if (overrideQuery) setQuery(overrideQuery);

        updateHistory(searchText);

        // Save to DB
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.id !== -1) {
                    fetch('/api/search/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, keyword: searchText })
                    }); // Fire and forget
                }
            } catch (e) {
                console.error('Failed to save search history', e);
            }
        }

        setLoading(true);
        setResult(null);
        setExpandedGroup(null);
        try {
            const res = await fetch(`/api/search?code=${searchText}`);
            const data = await res.json();
            setResult(data);
            console.log('Search Result:', data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupedData = useMemo(() => {
        if (!result?.items) return [];

        const groups = new Map<string, Map<string, StockItem[]>>();

        result.items.forEach((item: StockItem) => {
            const primaryKey = viewMode === 'color' ? item.style : item.size;
            const secondaryKey = viewMode === 'color' ? item.size : item.style;

            if (!groups.has(primaryKey)) {
                groups.set(primaryKey, new Map());
            }
            const subGroup = groups.get(primaryKey)!;
            if (!subGroup.has(secondaryKey)) {
                subGroup.set(secondaryKey, []);
            }
            subGroup.get(secondaryKey)!.push(item);
        });

        const list: GroupedData[] = [];
        groups.forEach((subMap, primaryKey) => {
            const subItemsList: GroupedData['subItems'] = [];
            let groupTotal = 0;

            subMap.forEach((items, secondaryKey) => {
                const subTotal = items.reduce((sum, i) => sum + i.stock, 0);
                groupTotal += subTotal;
                subItemsList.push({
                    key: secondaryKey,
                    stock: subTotal,
                    breakdown: items
                });
            });

            list.push({
                key: primaryKey,
                totalStock: groupTotal,
                subItems: subItemsList
            });
        });

        return list;
    }, [result, viewMode]);

    return (
        <div className="h-full flex flex-col text-[#0f172a] font-sans w-full overflow-hidden">
            {/* Header Section */}
            <header className="bg-white border-b border-gray-100 shrink-0">
                <div className="px-4 py-3">

                    <div className="flex items-center gap-4">
                        <div className="p-1 w-8 h-8"></div>

                        {/* Search Input */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="请输入6位商品编号"
                                className="w-full h-10 pl-4 pr-10 bg-white border border-gray-200 rounded-full text-sm outline-none focus:border-gray-400 placeholder:text-gray-400"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            <button
                                onClick={() => handleSearch()}
                                disabled={loading}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-transparent p-0 disabled:opacity-50"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-1 w-8 h-8"></div>
                    </div>

                    {/* Secondary Nav */}
                    <div className="flex items-center gap-3 mt-4 pb-1 text-xs text-gray-600 min-h-[24px]">
                        {history.length > 0 && (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 shrink-0">
                                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
                                    {history.map((item, index) => (
                                        <div key={index} className="flex items-center gap-1 group whitespace-nowrap">
                                            <span
                                                onClick={() => handleSearch(item)}
                                                className="hover:text-black transition-colors color-red "
                                            >
                                                {item}
                                            </span>
                                            <span
                                                onClick={(e) => removeFromHistory(e, item)}
                                                className="text-gray-300 hover:text-red-500 p-0.5"
                                                title="Remove from history"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="px-4 py-8 flex-1 overflow-y-auto">
                {/* Search Results / Loading */}
                {(loading || result) && (
                    <section className="mb-10">
                        {loading && <div className="text-center py-4 text-gray-500">搜索中...</div>}
                        {result && (
                            <div className="bg-gray-50 p-6 rounded-lg">
                                {result.error ? (
                                    <p className="text-red-500">{result.error}</p>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="font-semibold text-lg">{result.productName}</h3>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-sm text-gray-600">Product ID: {result.productId}</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <p className="text-lg font-bold text-red-600">¥{result.minPrice}</p>
                                                        {result.originPrice > result.minPrice && (
                                                            <p className="text-xs text-gray-400 line-through">¥{result.originPrice}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className="mb-4 flex items-center gap-1 text-sm font-bold border border-gray-200 rounded px-3 py-1 inline-flex cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={() => {
                                                setViewMode(viewMode === 'color' ? 'size' : 'color');
                                                setExpandedGroup(null);
                                            }}
                                        >
                                            <span className={viewMode === 'color' ? 'text-green-500' : 'text-gray-400'}>
                                                颜色
                                            </span>
                                            <span className="text-gray-300 font-normal">|</span>
                                            <span className={viewMode === 'size' ? 'text-green-500' : 'text-gray-400'}>
                                                尺寸
                                            </span>
                                        </div>

                                        {/* Group Buttons */}
                                        <div className="flex flex-wrap gap-3 mb-6">
                                            {groupedData.map((group) => (
                                                <button
                                                    key={group.key}
                                                    onClick={() => setExpandedGroup(expandedGroup === group.key ? null : group.key)}
                                                    className={`
                                                        px-4 py-2 rounded-lg border text-sm font-medium transition flex flex-col items-center gap-1 min-w-[80px]
                                                        ${expandedGroup === group.key
                                                            ? 'border-black bg-transparent text-black'
                                                            : 'border-gray-200 bg-transparent text-gray-700 hover:border-gray-300'
                                                        }
                                                    `}
                                                >
                                                    <span>{group.key}</span>
                                                    <span className={`text-xs ${expandedGroup === group.key ? 'text-gray-300' : 'text-gray-500'}`}>
                                                        库存: {group.totalStock}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Expanded Detail View */}
                                        {expandedGroup && (
                                            <div className="bg-white rounded-lg border border-gray-100 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <h4 className="text-sm font-medium text-gray-500 mb-3">
                                                    <span className="text-black">{expandedGroup}</span> 库存详情:
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {groupedData
                                                        .find(g => g.key === expandedGroup)
                                                        ?.subItems.map((sub, idx) => {
                                                            const style = viewMode === 'color' ? expandedGroup : sub.key;
                                                            const size = viewMode === 'color' ? sub.key : expandedGroup;
                                                            // Check by attributes, not key
                                                            const isFav = favorites.some(f =>
                                                                f.productId === result.productId &&
                                                                f.color === style &&
                                                                f.size === size
                                                            );

                                                            return (
                                                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                                                    <span className="font-medium text-sm text-gray-700">{sub.key}</span>
                                                                    <div className="text-right">
                                                                        <div className={`flex items-center justify-end gap-1 text-sm font-bold ${sub.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span>{sub.stock > 0 ? sub.stock : '售罄'}</span>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleFavorite(style, size);
                                                                                    }}
                                                                                    className={`p-1.5 rounded-full border shadow-sm transition-all ${isFav
                                                                                        ? 'bg-red-50 border-red-200 text-red-500'
                                                                                        : 'bg-white border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200'
                                                                                        }`}
                                                                                    title={isFav ? "取消收藏" : "收藏"}
                                                                                >
                                                                                    <svg
                                                                                        width="14"
                                                                                        height="14"
                                                                                        viewBox="0 0 24 24"
                                                                                        fill={isFav ? "currentColor" : "none"}
                                                                                        stroke="currentColor"
                                                                                        strokeWidth="2"
                                                                                        strokeLinecap="round"
                                                                                        strokeLinejoin="round"
                                                                                    >
                                                                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                                                                    </svg>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
