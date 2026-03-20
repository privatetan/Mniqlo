'use client';

import { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { CrawledItem, FavoriteItem } from '@/types';
import { getUser } from '@/lib/session';

type GroupedProduct = {
    code: string;
    product_id: string;
    name: string;
    gender: string;
    minPrice: number;
    originPrice: number;
    items: CrawledItem[];
    groupedData?: GroupedData[];
};

type GroupedData = {
    key: string;
    totalStock: number;
    subItems: {
        key: string;
        stock: number;
        breakdown: CrawledItem[];
    }[];
};

const getSizeWeight = (size: string): number => {
    const s = size.toUpperCase();
    const weights: { [key: string]: number } = {
        'XXS': 10,
        'XS': 20,
        'S': 30,
        'M': 40,
        'L': 50,
        'XL': 60,
        'XXL': 70,
        '3XL': 80,
        '4XL': 90,
    };
    if (weights[s]) return weights[s];

    const match = s.match(/^(\d+)/);
    if (match) {
        return 100 + parseFloat(match[1]);
    }

    return 9999;
};

type LimitedTimePageProps = {
    isFilterPanelOpen?: boolean;
    onToggleFilterPanel?: () => void;
    onCloseFilterPanel?: () => void;
};

export default function LimitedTimePage({ isFilterPanelOpen = false, onToggleFilterPanel, onCloseFilterPanel }: LimitedTimePageProps) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<CrawledItem[]>([]);
    const [activeGender, setActiveGender] = useState('全部');
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [expandedCode, setExpandedCode] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'color' | 'size'>('color');
    const [expandedState, setExpandedState] = useState<{ code: string; key: string } | null>(null);
    const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'discount'>('default');
    const { t, language } = useLanguage();
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const searchKeywords = useMemo(
        () => deferredSearchQuery
            .toLowerCase()
            .trim()
            .split(/[\s\u3000]+/)
            .filter(Boolean),
        [deferredSearchQuery]
    );
    const favoriteKeys = useMemo(
        () => new Set(favorites.map((favorite) => `${favorite.productId}:${favorite.color}:${favorite.size}`)),
        [favorites]
    );

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sheetTouchStartY = useRef<number | null>(null);
    const [sheetOffsetY, setSheetOffsetY] = useState(0);
    const cardTouchRef = useRef<{ code: string | null; x: number; y: number; moved: boolean }>({
        code: null,
        x: 0,
        y: 0,
        moved: false
    });
    const closeFilterPanel = useCallback(() => {
        if (isFilterPanelOpen) {
            onCloseFilterPanel?.();
        }
    }, [isFilterPanelOpen, onCloseFilterPanel]);

    const handleCodeClick = useCallback((e: React.MouseEvent, code: string) => {
        e.stopPropagation();
        router.push(`/?code=${encodeURIComponent(code)}`);
    }, [router]);

    const categories = ['全部', '女装', '男装', '中性/男女同款', '童装', '婴幼儿装'];

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isFilterPanelOpen) {
            setSheetOffsetY(0);
            sheetTouchStartY.current = null;
        }
    }, [isFilterPanelOpen]);

    const fetchItems = useCallback(async (gender: string) => {
        setLoading(true);
        try {
            const queryGender = gender === '全部' ? 'null' : gender;
            const res = await fetch(`/api/limited-time?gender=${encodeURIComponent(queryGender)}`);
            const data = await res.json();
            if (data.success) {
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch limited-time items:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFavorites = useCallback(async () => {
        const user = getUser();
        if (user) {
            if (user.id === -1) return;
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
                        timestamp: f.created_at || f.createdAt || f.timestamp
                    }));
                    setFavorites(mapped);
                }
            } catch (error) {
                console.error(error);
            }
        }
    }, []);

    useEffect(() => {
        fetchItems(activeGender);
        fetchFavorites();

        const handleFavoritesUpdated = () => fetchFavorites();
        const handleLimitedTimeUpdated = () => fetchItems(activeGender);
        window.addEventListener('favorites-updated', handleFavoritesUpdated);
        window.addEventListener('limited-time-updated', handleLimitedTimeUpdated);
        return () => {
            window.removeEventListener('favorites-updated', handleFavoritesUpdated);
            window.removeEventListener('limited-time-updated', handleLimitedTimeUpdated);
        };
    }, [activeGender, fetchItems, fetchFavorites]);

    const toggleFavorite = useCallback(async (item: CrawledItem, overrideStyle?: string, overrideSize?: string) => {
        const user = getUser();
        if (!user) {
            alert(language === 'zh' ? '请先登录' : 'Please login first');
            return;
        }
        if (user.id === -1) return;

        const style = overrideStyle || item.color;
        const size = overrideSize || item.size;
        const isFav = favorites.some(f => f.productId === item.product_id && f.color === style && f.size === size);

        try {
            if (isFav) {
                const fav = favorites.find(f => f.productId === item.product_id && f.color === style && f.size === size);
                if (fav) {
                    await fetch(`/api/favorites?id=${fav.id}`, { method: 'DELETE' });
                }
            } else {
                await fetch('/api/favorites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        productId: item.product_id,
                        code: item.code,
                        name: item.name,
                        price: parseFloat(item.price),
                        style,
                        size,
                        mainPic: item.main_pic
                    })
                });
            }
            window.dispatchEvent(new Event('favorites-updated'));
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    }, [favorites, language]);

    const filteredAndGroupedProducts = useMemo(() => {
        let filtered = items;

        if (activeGender !== '全部') {
            filtered = filtered.filter(item => item.gender === activeGender);
        }

        if (searchKeywords.length > 0) {
            filtered = filtered.filter(item => {
                const searchableText = [
                    item.name,
                    item.code,
                    item.color,
                    item.size,
                    item.product_id,
                    item.gender
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();

                return searchKeywords.every(keyword => searchableText.includes(keyword));
            });
        }

        const groups = new Map<string, GroupedProduct>();
        filtered.forEach(item => {
            if (!groups.has(item.code)) {
                groups.set(item.code, {
                    code: item.code,
                    product_id: item.product_id,
                    name: item.name,
                    gender: item.gender,
                    minPrice: parseFloat(item.price),
                    originPrice: item.origin_price ? parseFloat(item.origin_price as any) : parseFloat(item.price),
                    items: []
                });
            }
            const group = groups.get(item.code)!;
            group.items.push(item);
            const price = parseFloat(item.price);
            if (price < group.minPrice) group.minPrice = price;
            if (item.origin_price && parseFloat(item.origin_price as any) > group.originPrice) {
                group.originPrice = parseFloat(item.origin_price as any);
            }
        });

        return Array.from(groups.values()).map(product => {
            const itemGroups = new Map<string, Map<string, CrawledItem[]>>();

            product.items.forEach((item) => {
                const primaryKey = viewMode === 'color' ? item.color : item.size;
                const secondaryKey = viewMode === 'color' ? item.size : item.color;

                if (!itemGroups.has(primaryKey)) {
                    itemGroups.set(primaryKey, new Map());
                }
                const subGroup = itemGroups.get(primaryKey)!;
                if (!subGroup.has(secondaryKey)) {
                    subGroup.set(secondaryKey, []);
                }
                subGroup.get(secondaryKey)!.push(item);
            });

            const groupedData: GroupedData[] = [];
            itemGroups.forEach((subMap, primaryKey) => {
                const subItemsList: GroupedData['subItems'] = [];
                let groupTotal = 0;

                subMap.forEach((variants, secondaryKey) => {
                    const subTotal = variants.reduce((sum, variant) => sum + variant.stock, 0);
                    groupTotal += subTotal;
                    subItemsList.push({
                        key: secondaryKey,
                        stock: subTotal,
                        breakdown: variants
                    });
                });

                groupedData.push({
                    key: primaryKey,
                    totalStock: groupTotal,
                    subItems: subItemsList
                });
            });

            if (viewMode === 'size') {
                groupedData.sort((a, b) => getSizeWeight(a.key) - getSizeWeight(b.key));
            } else {
                groupedData.forEach(group => {
                    group.subItems.sort((a, b) => getSizeWeight(a.key) - getSizeWeight(b.key));
                });
            }

            return {
                ...product,
                groupedData
            };
        });
    }, [items, activeGender, searchKeywords, viewMode]);

    const sortedProducts = useMemo(() => {
        const products = [...filteredAndGroupedProducts];

        if (sortBy === 'price-asc') {
            return products.sort((a, b) => a.minPrice - b.minPrice);
        }
        if (sortBy === 'price-desc') {
            return products.sort((a, b) => b.minPrice - a.minPrice);
        }
        if (sortBy === 'discount') {
            return products.sort((a, b) => {
                const discountA = a.originPrice > 0 ? a.minPrice / a.originPrice : 1;
                const discountB = b.originPrice > 0 ? b.minPrice / b.originPrice : 1;
                return discountA - discountB;
            });
        }

        return products;
    }, [filteredAndGroupedProducts, sortBy]);

    const sortOptions = useMemo(() => ([
        { value: 'default' as const, label: t('sel.sort_default') },
        { value: 'price-asc' as const, label: t('sel.sort_price_asc') },
        { value: 'price-desc' as const, label: t('sel.sort_price_desc') },
        { value: 'discount' as const, label: t('sel.sort_discount') }
    ]), [t]);

    const currentSortLabel = useMemo(
        () => sortOptions.find((option) => option.value === sortBy)?.label ?? sortOptions[0].label,
        [sortBy, sortOptions]
    );

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (activeGender !== '全部') count += 1;
        if (searchQuery.trim()) count += 1;
        if (sortBy !== 'default') count += 1;
        return count;
    }, [activeGender, searchQuery, sortBy]);

    const summaryTokens = useMemo(() => {
        const tokens: string[] = [];
        if (activeGender !== '全部') tokens.push(activeGender);
        if (searchQuery.trim()) tokens.push(searchQuery.trim());
        if (sortBy !== 'default') tokens.push(currentSortLabel);

        if (tokens.length === 0) {
            return [t('filters.summary_none')];
        }

        return tokens;
    }, [activeGender, searchQuery, sortBy, currentSortLabel, t]);

    const resetFilters = useCallback(() => {
        setActiveGender('全部');
        setSearchQuery('');
        setSortBy('default');
    }, []);

    const handleSheetTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        sheetTouchStartY.current = e.touches[0]?.clientY ?? null;
    }, []);

    const handleSheetTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (sheetTouchStartY.current === null) return;
        const delta = e.touches[0].clientY - sheetTouchStartY.current;
        setSheetOffsetY(Math.max(0, Math.min(delta, 140)));
    }, []);

    const handleSheetTouchEnd = useCallback(() => {
        if (sheetOffsetY > 72) {
            closeFilterPanel();
        }
        setSheetOffsetY(0);
        sheetTouchStartY.current = null;
    }, [sheetOffsetY, closeFilterPanel]);

    const handleCardTouchStart = useCallback((code: string, e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        cardTouchRef.current = {
            code,
            x: touch.clientX,
            y: touch.clientY,
            moved: false
        };
    }, []);

    const handleCardTouchMove = useCallback((code: string, e: React.TouchEvent<HTMLDivElement>) => {
        if (cardTouchRef.current.code !== code) return;
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - cardTouchRef.current.x);
        const deltaY = Math.abs(touch.clientY - cardTouchRef.current.y);

        if (deltaX > 8 || deltaY > 8) {
            cardTouchRef.current.moved = true;
        }
    }, []);

    const handleCardToggle = useCallback((code: string) => {
        if (cardTouchRef.current.code === code && cardTouchRef.current.moved) {
            cardTouchRef.current = { code: null, x: 0, y: 0, moved: false };
            return;
        }

        setExpandedCode((current) => current === code ? null : code);
        cardTouchRef.current = { code: null, x: 0, y: 0, moved: false };
    }, []);

    const renderFilterControls = (mode: 'desktop' | 'mobile') => (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="mt-1 text-sm font-semibold text-amber-800">
                        {mode === 'desktop' ? (language === 'zh' ? '分类与排序' : 'Categories & Sort') : t('filters.sheet_title')}
                    </h3>
                </div>
                <div className="filter-surface rounded-full px-3 py-2 text-[11px] font-medium text-amber-700/80">
                    {t('filters.results', { n: sortedProducts.length })}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500/70">
                    {t('filters.category')}
                </p>
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveGender(cat)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${activeGender === cat
                                ? 'filter-pill-warm-active'
                                : 'filter-pill-warm hover:bg-amber-50/80 hover:border-amber-100'
                                }`}
                        >
                            {cat === '全部' ? (language === 'zh' ? '全部' : 'All') :
                                cat === '女装' ? (language === 'zh' ? '女装' : 'Women') :
                                    cat === '男装' ? (language === 'zh' ? '男装' : 'Men') :
                                        cat === '中性/男女同款' ? (language === 'zh' ? '中性/男女同款' : 'Unisex') :
                                            cat === '童装' ? (language === 'zh' ? '童装' : 'Kids') :
                                                cat === '婴幼儿装' ? (language === 'zh' ? '婴幼儿装' : 'Baby') : cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500/70">
                    {t('filters.keyword')}
                </p>
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('lim.search_placeholder')}
                        className="w-full h-11 pl-11 pr-4 bg-white/72 border border-white/70 rounded-full text-sm outline-none appearance-none shadow-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                    </svg>
                </div>
            </div>

            <div className={`grid gap-3 ${mode === 'desktop' ? 'grid-cols-[minmax(0,11rem)_auto]' : 'grid-cols-1'}`}>
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-500/70">
                        {t('filters.sort')}
                    </p>
                    <div className="filter-control-shell rounded-2xl px-1.5 py-1">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                            className="w-full text-xs px-3 py-2 pr-8 rounded-xl border-0 bg-transparent text-amber-700 outline-none appearance-none shadow-none focus:ring-0 focus:shadow-none cursor-pointer transition-all"
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {mode === 'desktop' && (
                    <div className="flex items-end justify-end">
                        <div className="filter-surface rounded-full px-3 py-2 text-[11px] font-medium text-amber-700/80">
                            {activeFilterCount > 0 ? t('filters.active_count', { n: activeFilterCount }) : t('filters.summary_none')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-transparent overflow-hidden">
            <div
                ref={scrollContainerRef}
                className="flex-1 md:overflow-y-auto overflow-visible px-4 pb-20 pt-4 md:pb-4 scroll-smooth"
            >
                <div className="hidden md:block sticky top-3 z-20 pb-4">
                    {isFilterPanelOpen ? (
                        <div className="filter-surface rounded-[30px] px-5 py-4">
                            {renderFilterControls('desktop')}
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="filter-pill-warm rounded-full px-4 py-2 text-xs font-semibold transition-colors hover:text-amber-800"
                                >
                                    {t('filters.reset')}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeFilterPanel}
                                    className="filter-pill-warm-active rounded-full px-4 py-2 text-xs font-semibold transition-transform hover:-translate-y-0.5"
                                >
                                    {t('filters.done')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onToggleFilterPanel}
                            className="filter-surface flex w-full items-center gap-4 rounded-[28px] px-4 py-3 text-left transition-all hover:-translate-y-0.5"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap gap-2">
                                    {summaryTokens.map((token) => (
                                        <span key={token} className="filter-pill-warm rounded-full px-3 py-1 text-[11px] font-medium">
                                            {token}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-amber-800">{sortedProducts.length}</p>
                                <p className="text-[10px] font-medium text-amber-500/70">
                                    {activeFilterCount > 0 ? t('filters.active_count', { n: activeFilterCount }) : t('filters.results', { n: sortedProducts.length })}
                                </p>
                            </div>
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-amber-700">
                        <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4" />
                        <p className="text-sm font-medium tracking-tight">{t('lim.loading')}</p>
                    </div>
                ) : sortedProducts.length === 0 ? (
                    <div className="text-center py-24 text-amber-700">
                        <p className="text-sm font-medium tracking-tight">{t('lim.none')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sortedProducts.map(product => (
                            <div
                                key={product.code}
                                className="card rounded-[30px] p-0 overflow-hidden relative border border-white/70 transition-none"
                            >
                                <div
                                    className="rounded-[28px] p-3 cursor-pointer transition-none"
                                    onClick={() => handleCardToggle(product.code)}
                                    onTouchStart={(e) => handleCardTouchStart(product.code, e)}
                                    onTouchMove={(e) => handleCardTouchMove(product.code, e)}
                                    onTouchCancel={() => {
                                        cardTouchRef.current = { code: null, x: 0, y: 0, moved: false };
                                    }}
                                >
                                    <div className="flex gap-3 mb-3">
                                        <div className="w-20 h-20 shrink-0 bg-amber-50/50 rounded-xl overflow-hidden relative border border-amber-100/80">
                                            {product.items[0]?.main_pic ? (
                                                <img
                                                    src={`https://www.uniqlo.cn${product.items[0].main_pic}`}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-amber-200">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                        <polyline points="21 15 16 10 5 21"></polyline>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="flex justify-between items-start h-full">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex flex-col gap-1 h-full">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span
                                                                className="text-sm text-amber-700 font-bold font-mono tracking-tight cursor-pointer hover:underline"
                                                                onClick={(e) => handleCodeClick(e, product.code)}
                                                            >
                                                                {product.code}
                                                            </span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50/90 text-amber-700 font-semibold rounded-full uppercase tracking-tight">{product.gender}</span>
                                                            {product.items.some(i => i.stock_status === 'new') && (
                                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-full uppercase tracking-tight">
                                                                    {t('lim.flash')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">{product.name}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-amber-700 font-bold text-base leading-none">¥{product.minPrice}</div>
                                                        {product.originPrice > product.minPrice && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <div className="text-[10px] text-slate-400 line-through">¥{product.originPrice}</div>
                                                                <div className="text-[10px] text-rose-500 font-semibold">
                                                                    {t('sel.off', { n: ((product.minPrice / product.originPrice) * 10).toFixed(1) })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-medium pt-2 border-t border-amber-100/70 text-amber-700/70">
                                        <span>{t('fav.variants', { n: product.items.length })}</span>
                                        <div className="inline-flex items-center justify-center rounded-full px-2.5 py-1 bg-white/70 text-amber-600 border border-white/70">
                                            <svg
                                                className={expandedCode === product.code ? 'rotate-180' : ''}
                                                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                            >
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {expandedCode === product.code && (
                                    <div className="mx-2 mb-2 rounded-[26px] px-4 pb-4 pt-2 bg-white/75">
                                        <div className="h-px bg-amber-100/70 mb-4" />

                                        <div
                                            className="mb-3 flex items-center gap-1 text-xs font-bold border border-white/70 bg-white/80 rounded-full px-3 py-1.5 inline-flex cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewMode(viewMode === 'color' ? 'size' : 'color');
                                                setExpandedState(null);
                                            }}
                                        >
                                            <span className={viewMode === 'color' ? 'text-amber-700' : 'text-slate-400'}>
                                                {t('search.color')}
                                            </span>
                                            <span className="text-amber-200 font-normal">|</span>
                                            <span className={viewMode === 'size' ? 'text-amber-700' : 'text-slate-400'}>
                                                {t('search.size')}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {product.groupedData?.map((group) => {
                                                const isExpanded = expandedState?.code === product.code && expandedState?.key === group.key;
                                                return (
                                                    <button
                                                        key={group.key}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedState(isExpanded ? null : { code: product.code, key: group.key });
                                                        }}
                                                        className={`
                                                            px-3 py-1.5 rounded-lg border text-xs font-medium transition flex flex-col items-center gap-0.5 min-w-[70px]
                                                            ${isExpanded
                                                                ? 'border-amber-100 bg-amber-50/90 text-amber-800 shadow-[0_16px_30px_-24px_rgba(180,83,9,0.42)]'
                                                                : 'border-white/70 bg-white/80 text-slate-700 hover:border-amber-100 hover:bg-amber-50/60'
                                                            }
                                                        `}
                                                    >
                                                        <span>{group.key}</span>
                                                        <span className={`text-[10px] ${isExpanded ? 'text-amber-600/70' : 'text-slate-500'}`}>
                                                            {t('search.stock')}: {group.totalStock}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {expandedState?.code === product.code && (
                                            <div className="bg-amber-50/55 rounded-2xl border border-amber-100/80 p-3">
                                                <h4 className="text-xs font-medium text-amber-700 mb-2">
                                                    <span className="text-slate-800">{expandedState?.key}</span> {language === 'zh' ? '库存详情:' : 'Stock Details:'}
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {product.groupedData
                                                        ?.find((g) => g.key === expandedState?.key)
                                                        ?.subItems.map((sub, idx) => {
                                                            const style = viewMode === 'color' ? expandedState?.key : sub.key;
                                                            const size = viewMode === 'color' ? sub.key : expandedState?.key;
                                                            const item = sub.breakdown[0];
                                                            const isFav = favoriteKeys.has(`${item.product_id}:${style}:${size}`);
                                                            const isNewStock = item.stock_status === 'new';

                                                            return (
                                                                <div key={idx} className="flex justify-between items-center p-2 bg-white/90 rounded-xl border border-amber-100/80 relative">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-xs text-slate-700">{sub.key}</span>
                                                                        {isNewStock && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded uppercase tracking-wide shadow-sm">
                                                                                {t('lim.flash')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`text-xs font-bold ${sub.stock > 0 ? 'text-amber-700' : 'text-rose-500'}`}>
                                                                            {sub.stock > 0 ? sub.stock : (language === 'zh' ? '售罄' : 'Sold Out')}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleFavorite(item, style, size);
                                                                            }}
                                                                            className={`p-1.5 rounded-full border shadow-sm transition-all ${isFav
                                                                                ? 'bg-rose-50 border-rose-200 text-rose-500'
                                                                                : 'bg-white border-amber-100 text-amber-300 hover:text-rose-400 hover:border-rose-200'
                                                                                }`}
                                                                        >
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                viewBox="0 0 24 24"
                                                                                fill={isFav ? 'currentColor' : 'none'}
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
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isMounted && isFilterPanelOpen && createPortal(
                <div className="md:hidden fixed inset-0 z-[90] pointer-events-none">
                    <button
                        type="button"
                        aria-label={t('filters.done')}
                        onClick={closeFilterPanel}
                        className="pointer-events-auto absolute inset-0 z-0 bg-slate-950/20 backdrop-blur-sm"
                    />
                    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                        <div
                            className="filter-surface touch-pan-y rounded-[30px] px-4 pb-4 pt-3 shadow-[0_-26px_60px_-28px_rgba(180,83,9,0.34)]"
                            style={{
                                transform: `translateY(${sheetOffsetY}px)`,
                                transition: sheetTouchStartY.current === null ? 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                className="flex justify-center pb-3"
                                onTouchStart={handleSheetTouchStart}
                                onTouchMove={handleSheetTouchMove}
                                onTouchEnd={handleSheetTouchEnd}
                            >
                                <div className="h-1.5 w-12 rounded-full bg-amber-200/90" />
                            </div>
                            <div
                                className="max-h-[65vh] overflow-y-auto overscroll-contain pr-1 touch-pan-y"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                {renderFilterControls('mobile')}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="filter-pill-warm rounded-full px-4 py-3 text-sm font-semibold transition-colors hover:text-amber-800"
                                >
                                    {t('filters.reset')}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeFilterPanel}
                                    className="filter-pill-warm-active rounded-full px-4 py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
                                >
                                    {t('filters.done')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
