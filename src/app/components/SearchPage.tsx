'use client';
import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';

import { FavoriteItem, StockItem } from '@/types';
import { parseLocalTime } from '@/lib/date-utils';
import { getUser } from '@/lib/session';

type GroupedData = {
    key: string;
    totalStock: number;
    subItems: {
        key: string;
        stock: number;
        breakdown: StockItem[];
    }[];
};

export default function SearchPage({ initialQuery }: { initialQuery?: string | null }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[] | null>(null);
    const [viewMode, setViewMode] = useState<'color' | 'size'>('color');
    const [expandedState, setExpandedState] = useState<{ pid: string; key: string } | null>(null);
    const [history, setHistory] = useState<string[]>([]);

    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

    // Scroll handling
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const scrollContainerRef = useRef<HTMLElement>(null);
    const ticking = useRef(false);

    // Check if we have results to determine if hiding is allowed
    const canHideHeader = results && results.length > 0 && !results[0].error;

    const handleScroll = useCallback(() => {
        // Desktop: Scroll container ref
        if (scrollContainerRef.current && window.innerWidth >= 768) {
            const scrollTop = scrollContainerRef.current.scrollTop;

            if (!ticking.current) {
                window.requestAnimationFrame(() => {
                    const diff = scrollTop - lastScrollY.current;
                    const minScroll = 50;
                    const threshold = 10;

                    // Only allow hiding if we have results
                    if (canHideHeader && diff > threshold && scrollTop > minScroll && showHeader) {
                        setShowHeader(false);
                    } else if (diff < -threshold && !showHeader) {
                        setShowHeader(true);
                    } else if (!canHideHeader && !showHeader) {
                        // Force show if we shouldn't execute hiding
                        setShowHeader(true);
                    }
                    lastScrollY.current = scrollTop;
                    ticking.current = false;
                });
                ticking.current = true;
            }
        }
    }, [showHeader, canHideHeader]);

    // Mobile: Window scroll listener
    useEffect(() => {
        const handleWindowScroll = () => {
            if (window.innerWidth < 768) {
                const scrollTop = window.scrollY;
                if (!ticking.current) {
                    window.requestAnimationFrame(() => {
                        const diff = scrollTop - lastScrollY.current;
                        const minScroll = 50;
                        const threshold = 10;

                        if (canHideHeader && diff > threshold && scrollTop > minScroll && showHeader) {
                            setShowHeader(false);
                        } else if (diff < -threshold && !showHeader) {
                            setShowHeader(true);
                        } else if (scrollTop < 10 && !showHeader) {
                            setShowHeader(true);
                        } else if (!canHideHeader && !showHeader) {
                            setShowHeader(true);
                        }

                        lastScrollY.current = scrollTop;
                        ticking.current = false;
                    });
                    ticking.current = true;
                }
            }
        };

        window.addEventListener('scroll', handleWindowScroll);
        return () => window.removeEventListener('scroll', handleWindowScroll);
    }, [showHeader, canHideHeader]);

    useEffect(() => {
        if (initialQuery) {
            setQuery(initialQuery);
            handleSearch(initialQuery);
        }
    }, [initialQuery]);

    useEffect(() => {
        const fetchFavorites = async () => {
            const user = getUser();
            if (user) {
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

    const fetchHistory = useCallback(async () => {
        const user = getUser();
        if (user) {
            try {
                if (user.id !== -1) {
                    const res = await fetch(`/api/search/history?userId=${user.id}`);
                    const data = await res.json();
                    if (data.success) {
                        const serverKeywords = data.history.map((h: any) => h.keyword);
                        const localHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
                        const combined = Array.from(new Set([...serverKeywords, ...localHistory])).slice(0, 10);
                        setHistory(combined);
                        localStorage.setItem('searchHistory', JSON.stringify(combined));
                    }
                } else {
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
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const toggleFavorite = useCallback(async (product: any, style: string, size: string) => {
        if (!product) return;

        const isFav = favorites.some(f => f.productId === product.productId && f.color === style && f.size === size);

        const user = getUser();
        if (!user) {
            alert(language === 'zh' ? '请登录以使用收藏功能' : 'Please login to use favorites');
            return;
        }

        if (user.id === -1) {
            let newFavs;
            if (isFav) {
                newFavs = favorites.filter(f => !(f.productId === product.productId && f.color === style && f.size === size));
            } else {
                const newItem: FavoriteItem = {
                    key: `${product.productId}-${style}-${size}`,
                    productId: product.productId,
                    code: product.code,
                    name: product.productName,
                    color: style,
                    size: size,
                    price: product.minPrice,
                    timestamp: Date.now(),
                    mainPic: product.mainPic
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
                const itemToRemove = favorites.find(f => f.productId === product.productId && f.color === style && f.size === size);
                if (itemToRemove) {
                    const query = itemToRemove.id
                        ? `/api/favorites?id=${itemToRemove.id}`
                        : `/api/favorites?userId=${user.id}&productId=${itemToRemove.productId}&style=${style}&size=${size}`;
                    await fetch(query, {
                        method: 'DELETE'
                    });
                }
                setFavorites(favorites.filter(f => !(f.productId === product.productId && f.color === style && f.size === size)));
            } else {
                const newItem = {
                    userId: user.id,
                    productId: product.productId,
                    code: product.code,
                    name: product.productName,
                    price: product.minPrice,
                    style,
                    size,
                    mainPic: product.mainPic
                };

                const res = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem)
                });

                if (res.ok) {
                    const addedFav: FavoriteItem = {
                        key: `${product.productId}-${style}-${size}`,
                        productId: product.productId,
                        code: product.code,
                        name: product.productName,
                        color: style,
                        size: size,
                        price: product.minPrice,
                        timestamp: Date.now(),
                        mainPic: product.mainPic
                    };
                    setFavorites([...favorites, addedFav]);
                }
            }
            window.dispatchEvent(new Event('favorites-updated'));
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    }, [favorites]);

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

    const handleSearch = useCallback(async (overrideQuery?: string) => {
        const searchText = overrideQuery || query;
        if (!searchText.trim()) return;

        if (overrideQuery) setQuery(overrideQuery);
        updateHistory(searchText);

        const user = getUser();
        if (user) {
            try {
                if (user.id !== -1) {
                    fetch('/api/search/history', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, keyword: searchText })
                    });
                }
            } catch (e) {
                console.error('Failed to save search history', e);
            }
        }

        setLoading(true);
        setResults(null);
        setExpandedState(null);
        try {
            const res = await fetch(`/api/search?code=${searchText}`);
            const data = await res.json();
            // Handle array or error object
            if (data.error) {
                setResults([{ error: data.error }]);
            } else {
                const list = Array.isArray(data) ? data : [data];
                setResults(list);
            }
            console.log('Search Result:', data);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    }, [query, history, updateHistory]);

    const processedResults = useMemo(() => {
        if (!results) return [];
        return results.map(product => {
            if (product.error) return product;
            if (!product.items) return { ...product, groupedData: [] };

            const groups = new Map<string, Map<string, StockItem[]>>();

            product.items.forEach((item: StockItem) => {
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

            return {
                ...product,
                groupedData: list
            };
        });
    }, [results, viewMode]);

    const { t, language } = useLanguage();

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            {/* Header Section */}
            {/* Header Section */}
            <header
                className={`fixed md:absolute top-[60px] md:top-0 left-0 right-0 z-30 md:z-40 transition-transform duration-300 ease-in-out ${showHeader ? 'translate-y-0' : '-translate-y-[200%]'
                    }`}
            >
                <div className="space-y-3 px-4 py-3 md:px-6">
                    <div className="frost-panel rounded-[28px] px-4 py-3">
                        <div className="flex items-center gap-4">
                        {/* Search Input */}
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder={t('search.placeholder')}
                                    className="w-full h-11 pl-11 pr-12 bg-white/75 border border-white/70 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-600 transition-all font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={() => handleSearch()}
                                    disabled={loading}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-800 transition-colors p-1 bg-transparent border-0 shadow-none"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </button>
                                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.3-4.3" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Nav */}
                    {history.length > 0 && (
                        <div className="frost-panel flex items-center gap-3 rounded-[24px] px-4 py-3 text-xs font-medium text-slate-400 min-h-[24px]">
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 shrink-0">
                                    <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" />
                                    <path d="M12 6V12L16 14" />
                                </svg>
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                    {history.map((item, index) => (
                                        <div key={index} className="flex items-center gap-1.5 px-3 py-1 bg-white/70 border border-white/70 rounded-full group whitespace-nowrap transition-colors hover:bg-emerald-50/70">
                                            <span
                                                onClick={() => handleSearch(item)}
                                                className="hover:text-teal-800 transition-colors cursor-pointer"
                                            >
                                                {item}
                                            </span>
                                            <span
                                                onClick={(e) => removeFromHistory(e, item)}
                                                className="text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M18 6L6 18M6 6L18 18" />
                                                </svg>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        </div>
                    )}
                </div>
            </header>

            <main
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="px-4 pb-24 md:pb-4 pt-32 flex-1 md:overflow-y-auto overflow-visible scroll-smooth"
            >
                {/* Search Results / Loading */}
                {(loading || results) && (
                    <section className="mb-8 grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {loading && (
                            <div className="text-center py-24 text-slate-500 italic">
                                <div className="w-8 h-8 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin mx-auto mb-4" />
                                {t('search.searching')}
                            </div>
                        )}

                        {processedResults.map((product: any, idx) => (
                            <div key={product.productId || idx} className="card p-4">
                                {product.error ? (
                                    <p className="text-rose-500 font-medium tracking-tight">{product.error}</p>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-start border-b border-slate-100/80 pb-3 mb-3">
                                            {/* Product Image */}
                                            {product.mainPic && (
                                                <div className="mr-3 shrink-0">
                                                    <img
                                                        src={`https://www.uniqlo.cn${product.mainPic}`}
                                                        alt={product.productName}
                                                        className="w-20 h-20 object-cover rounded-xl border border-white/70"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-bold text-sm text-slate-800 tracking-tight mb-1">{product.productName}</h3>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-[10px] text-slate-400 font-medium">ID: {product.productId}</p>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <p className="text-base font-bold price-text">¥{product.minPrice}</p>
                                                        {product.originPrice > product.minPrice && (
                                                            <>
                                                                <p className="text-[10px] text-slate-400 line-through">¥{product.originPrice}</p>
                                                                <p className="text-[10px] text-rose-500 font-semibold">
                                                                    {t('sel.off', { n: ((product.minPrice / product.originPrice) * 10).toFixed(1) })}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className="mb-6 flex items-center gap-2 text-xs font-semibold bg-white/75 border border-white/70 px-4 py-2 rounded-full inline-flex cursor-pointer transition-all hover:bg-emerald-50/70 tracking-tight"
                                            onClick={() => {
                                                setViewMode(viewMode === 'color' ? 'size' : 'color');
                                                setExpandedState(null);
                                            }}
                                        >
                                            <span className={viewMode === 'color' ? 'text-teal-800' : 'text-slate-400'}>
                                                {t('search.color')}
                                            </span>
                                            <span className="text-slate-200">|</span>
                                            <span className={viewMode === 'size' ? 'text-teal-800' : 'text-slate-400'}>
                                                {t('search.size')}
                                            </span>
                                        </div>

                                        {/* Group Buttons */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {product.groupedData.map((group: GroupedData) => {
                                                const isExpanded = expandedState?.pid === product.productId && expandedState?.key === group.key;
                                                return (
                                                    <button
                                                        key={group.key}
                                                        onClick={() => setExpandedState(isExpanded ? null : { pid: product.productId, key: group.key })}
                                                        className={`
                                                            px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex flex-col items-center gap-0.5 min-w-[70px]
                                                            ${isExpanded
                                                                ? 'bg-emerald-50/90 text-teal-800 border-emerald-100 shadow-[0_16px_30px_-24px_rgba(47,96,93,0.55)]'
                                                                : 'border-white/70 bg-white/80 text-slate-600 hover:border-emerald-100 hover:bg-emerald-50/60'
                                                            }
                                                        `}
                                                    >
                                                        <span>{group.key}</span>
                                                        <span className={`text-[9px] font-medium ${isExpanded ? 'text-teal-600/70' : 'text-slate-400'}`}>
                                                            {t('search.stock')}: {group.totalStock}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Expanded Detail View */}
                                        {expandedState?.pid === product.productId && (
                                            <div className="bg-white/80 rounded-2xl border border-white/70 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <h4 className="text-sm font-medium text-slate-500 mb-3">
                                                    <span className="text-slate-800">{expandedState?.key}</span> {language === 'zh' ? '库存详情:' : 'Stock Details:'}
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {product.groupedData
                                                        .find((g: GroupedData) => g.key === expandedState?.key)
                                                        ?.subItems.map((sub: any, idx: number) => {
                                                            const style = viewMode === 'color' ? expandedState?.key : sub.key;
                                                            const size = viewMode === 'color' ? sub.key : expandedState?.key;
                                                            // Check by attributes, not key
                                                            const isFav = favorites.some(f =>
                                                                f.productId === product.productId &&
                                                                f.color === style &&
                                                                f.size === size
                                                            );

                                                            return (
                                                                <div key={idx} className="flex justify-between items-center p-3 bg-slate-50/80 rounded-xl border border-white/70">
                                                                    <span className="font-medium text-sm text-slate-700">{sub.key}</span>
                                                                    <div className="text-right">
                                                                        <div className={`flex items-center justify-end gap-1 text-sm font-bold ${sub.stock > 0 ? 'text-emerald-700' : 'text-rose-500'}`}>
                                                                            <div className="flex items-center gap-2">
                                                                                <span>{sub.stock > 0 ? sub.stock : (language === 'zh' ? '售罄' : 'Sold Out')}</span>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleFavorite(product, style, size);
                                                                                    }}
                                                                                    className={`p-1.5 rounded-full border shadow-sm transition-all ${isFav
                                                                                        ? 'bg-rose-50 border-rose-200 text-rose-500'
                                                                                        : 'bg-white border-slate-200 text-slate-300 hover:text-rose-400 hover:border-rose-200'
                                                                                        }`}
                                                                                    title={isFav ? (language === 'zh' ? "取消收藏" : "Remove from Favorites") : (language === 'zh' ? "收藏" : "Add to Favorites")}
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
                        ))}
                    </section>
                )}
            </main>
        </div>
    );
}
