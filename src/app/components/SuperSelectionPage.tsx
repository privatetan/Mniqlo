'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { CrawledItem, FavoriteItem } from '@/types';
import { parseLocalTime } from '@/lib/date-utils';

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

    // Attempt to parse number for numeric sizes (e.g. 29, 160/80A)
    const match = s.match(/^(\d+)/);
    if (match) {
        return 100 + parseFloat(match[1]); // Offset to separate from S/M/L
    }

    return 9999; // Unknown last
};

export default function SuperSelectionPage() {
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

    // Scroll handling for header visibility
    const [showHeader, setShowHeader] = useState(true);
    const lastScrollY = useRef(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const ticking = useRef(false);

    const handleScroll = useCallback(() => {
        // Desktop: Scroll container ref
        if (scrollContainerRef.current && window.innerWidth >= 768) {
            const scrollTop = scrollContainerRef.current.scrollTop;

            if (!ticking.current) {
                window.requestAnimationFrame(() => {
                    if (scrollTop > lastScrollY.current && scrollTop > 50) {
                        setShowHeader(false);
                    } else if (scrollTop < lastScrollY.current) {
                        setShowHeader(true);
                    }
                    lastScrollY.current = scrollTop;
                    ticking.current = false;
                });
                ticking.current = true;
            }
        }
    }, []);

    // Mobile: Window scroll listener
    useEffect(() => {
        const handleWindowScroll = () => {
            if (window.innerWidth < 768) {
                const scrollTop = window.scrollY;
                if (!ticking.current) {
                    window.requestAnimationFrame(() => {
                        // Add buffer to prevent jitter at top
                        if (scrollTop > lastScrollY.current && scrollTop > 50) {
                            setShowHeader(false);
                        } else if (scrollTop < lastScrollY.current) {
                            setShowHeader(true);
                        }

                        // Always show if at top
                        if (scrollTop < 10) {
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
    }, []);

    const categories = ['全部', '女装', '男装', '童装', '婴幼儿装'];

    const fetchItems = useCallback(async (gender: string) => {
        setLoading(true);
        try {
            const queryGender = gender === '全部' ? 'null' : gender;
            const res = await fetch(`/api/super-selection?gender=${encodeURIComponent(queryGender)}`);
            const data = await res.json();
            if (data.success) {
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch super selection items:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFavorites = useCallback(async () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
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
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    useEffect(() => {
        fetchItems(activeGender);
        fetchFavorites();

        const handleFavoritesUpdated = () => fetchFavorites();
        window.addEventListener('favorites-updated', handleFavoritesUpdated);
        return () => window.removeEventListener('favorites-updated', handleFavoritesUpdated);
    }, [activeGender, fetchItems, fetchFavorites]);

    const toggleFavorite = useCallback(async (item: CrawledItem, overrideStyle?: string, overrideSize?: string) => {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
            alert(language === 'zh' ? '请先登录' : 'Please login first');
            return;
        }
        const user = JSON.parse(userStr);
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
                        style: style,
                        size: size,
                        mainPic: item.main_pic
                    })
                });
            }
            window.dispatchEvent(new Event('favorites-updated'));
        } catch (error) {
            console.error('Failed to toggle favorite', error);
        }
    }, [favorites]);

    const filteredAndGroupedProducts = useMemo(() => {
        let filtered = items;
        if (activeGender !== '全部') {
            filtered = filtered.filter(item => item.gender === activeGender);
        }
        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.code.includes(searchQuery)
            );
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
            const g = groups.get(item.code)!;
            g.items.push(item);
            const price = parseFloat(item.price);
            if (price < g.minPrice) g.minPrice = price;
            if (item.origin_price && parseFloat(item.origin_price as any) > g.originPrice) {
                g.originPrice = parseFloat(item.origin_price as any);
            }
        });

        // Add groupedData for each product
        const productsWithGrouping = Array.from(groups.values()).map(product => {
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

                subMap.forEach((items, secondaryKey) => {
                    const subTotal = items.reduce((sum, i) => sum + i.stock, 0);
                    groupTotal += subTotal;
                    subItemsList.push({
                        key: secondaryKey,
                        stock: subTotal,
                        breakdown: items
                    });
                });

                groupedData.push({
                    key: primaryKey,
                    totalStock: groupTotal,
                    subItems: subItemsList
                });
            });

            // Sort logic
            if (viewMode === 'size') {
                // If viewing by size, sort the main groups (keys are sizes)
                groupedData.sort((a, b) => getSizeWeight(a.key) - getSizeWeight(b.key));
            } else {
                // If viewing by color, sort the sub-items within each color group (keys are sizes)
                groupedData.forEach(group => {
                    group.subItems.sort((a, b) => getSizeWeight(a.key) - getSizeWeight(b.key));
                });
            }

            return {
                ...product,
                groupedData
            };
        });

        return productsWithGrouping;
    }, [items, activeGender, searchQuery, viewMode]);

    // Apply sorting
    const sortedProducts = useMemo(() => {
        const products = [...filteredAndGroupedProducts];

        if (sortBy === 'price-asc') {
            return products.sort((a, b) => a.minPrice - b.minPrice);
        } else if (sortBy === 'price-desc') {
            return products.sort((a, b) => b.minPrice - a.minPrice);
        } else if (sortBy === 'discount') {
            return products.sort((a, b) => {
                const discountA = a.originPrice > 0 ? a.minPrice / a.originPrice : 1;
                const discountB = b.originPrice > 0 ? b.minPrice / b.originPrice : 1;
                return discountA - discountB; // Lower ratio = better discount
            });
        }

        return products; // default order
    }, [filteredAndGroupedProducts, sortBy]);

    return (
        <div className="h-full flex flex-col bg-gray-50/30 overflow-hidden">
            {/* Header: Tabs & Search */}
            {/* Header: Tabs & Search */}
            <div
                className={`fixed md:absolute top-[60px] md:top-0 left-0 right-0 bg-white z-30 md:z-40 transition-transform duration-300 ease-in-out shadow-sm border-b border-gray-100 ${showHeader ? 'translate-y-0' : '-translate-y-[200%] md:-translate-y-full'
                    }`}
            >
                <div className="px-6 py-4">
                    <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveGender(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeGender === cat
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                {cat === '全部' ? (language === 'zh' ? '全部' : 'All') :
                                    cat === '女装' ? (language === 'zh' ? '女装' : 'Women') :
                                        cat === '男装' ? (language === 'zh' ? '男装' : 'Men') :
                                            cat === '童装' ? (language === 'zh' ? '童装' : 'Kids') :
                                                cat === '婴幼儿装' ? (language === 'zh' ? '婴幼儿装' : 'Baby') : cat}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={t('sel.search_placeholder')}
                            className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-400 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="mt-3 flex items-center justify-between">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 outline-none focus:border-gray-400 cursor-pointer transition-all"
                        >
                            <option value="default">{t('sel.sort_default')}</option>
                            <option value="price-asc">{t('sel.sort_price_asc')}</option>
                            <option value="price-desc">{t('sel.sort_price_desc')}</option>
                            <option value="discount">{t('sel.sort_discount')}</option>
                        </select>
                        {!loading && (
                            <div className="text-[11px] text-gray-400 font-medium">
                                {t('sel.found', { n: items.length })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 md:overflow-y-auto overflow-visible px-4 pb-20 pt-44 md:pb-4 scroll-smooth"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                        <div className="w-8 h-8 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin mb-4" />
                        <p className="text-sm font-medium tracking-tight">{t('sel.loading')}</p>
                    </div>
                ) : sortedProducts.length === 0 ? (
                    <div className="text-center py-24 text-gray-400">
                        <p className="text-sm font-medium tracking-tight">{t('sel.none')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        {sortedProducts.map(product => (
                            <div key={product.code} className="card p-0 overflow-hidden">
                                <div
                                    className="p-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    onClick={() => setExpandedCode(expandedCode === product.code ? null : product.code)}
                                >
                                    <div className="flex gap-3 mb-3">
                                        {/* Image */}
                                        <div className="w-20 h-20 shrink-0 bg-gray-100 rounded-lg overflow-hidden relative border border-gray-200">
                                            {product.items[0]?.main_pic ? (
                                                <img
                                                    src={`https://www.uniqlo.cn${product.items[0].main_pic}`}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
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
                                                            <span className="text-sm text-green-600 font-bold font-mono tracking-tight">{product.code}</span>
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 font-semibold rounded-full uppercase tracking-tight">{product.gender}</span>
                                                            {product.items.some(i => i.stock_status === 'new') && (
                                                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full uppercase tracking-tight">
                                                                    {t('sel.new')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h3 className="text-xs text-gray-900 font-medium line-clamp-2 leading-relaxed">{product.name}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-red-600 font-bold text-base leading-none">¥{product.minPrice}</div>
                                                        {product.originPrice > product.minPrice && (
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <div className="text-[10px] text-gray-400 line-through">¥{product.originPrice}</div>
                                                                <div className="text-[10px] text-red-500 font-semibold">
                                                                    {t('sel.off', { n: ((product.minPrice / product.originPrice) * 10).toFixed(1) })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-medium text-gray-400 border-t border-gray-50 pt-2">
                                        <span>{t('fav.variants', { n: product.items.length })}</span>
                                        <svg
                                            className={`transition-transform duration-300 ${expandedCode === product.code ? 'rotate-180' : ''}`}
                                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                        >
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Details */}
                                {expandedCode === product.code && (
                                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="h-px bg-gray-50 mb-4" />

                                        {/* Toggle Button */}
                                        <div
                                            className="mb-3 flex items-center gap-1 text-xs font-bold border border-gray-200 rounded px-3 py-1.5 inline-flex cursor-pointer hover:bg-gray-50 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewMode(viewMode === 'color' ? 'size' : 'color');
                                                setExpandedState(null);
                                            }}
                                        >
                                            <span className={viewMode === 'color' ? 'text-green-500' : 'text-gray-400'}>
                                                {t('search.color')}
                                            </span>
                                            <span className="text-gray-300 font-normal">|</span>
                                            <span className={viewMode === 'size' ? 'text-green-500' : 'text-gray-400'}>
                                                {t('search.size')}
                                            </span>
                                        </div>

                                        {/* Group Buttons */}
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {product.groupedData?.map((group: GroupedData) => {
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
                                                                ? 'border-black bg-transparent text-black'
                                                                : 'border-gray-200 bg-transparent text-gray-700 hover:border-gray-300'
                                                            }
                                                        `}
                                                    >
                                                        <span>{group.key}</span>
                                                        <span className={`text-[10px] ${isExpanded ? 'text-gray-300' : 'text-gray-500'}`}>
                                                            {t('search.stock')}: {group.totalStock}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Expanded Detail View */}
                                        {expandedState?.code === product.code && (
                                            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <h4 className="text-xs font-medium text-gray-500 mb-2">
                                                    <span className="text-black">{expandedState?.key}</span> {language === 'zh' ? '库存详情:' : 'Stock Details:'}
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                    {product.groupedData
                                                        ?.find((g: GroupedData) => g.key === expandedState?.key)
                                                        ?.subItems.map((sub: any, idx: number) => {
                                                            const style = viewMode === 'color' ? expandedState?.key : sub.key;
                                                            const size = viewMode === 'color' ? sub.key : expandedState?.key;
                                                            const item = sub.breakdown[0]; // Get first item for product_id
                                                            const isFav = favorites.some(f =>
                                                                f.productId === item.product_id &&
                                                                f.color === style &&
                                                                f.size === size
                                                            );
                                                            // Check if this is a new stock item
                                                            const isNewStock = item.stock_status === 'new';

                                                            return (
                                                                <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-gray-100 relative">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-xs text-gray-700">{sub.key}</span>
                                                                        {isNewStock && (
                                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white rounded uppercase tracking-wide shadow-sm">
                                                                                {t('sel.new')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`text-xs font-bold ${sub.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                            {sub.stock > 0 ? sub.stock : (language === 'zh' ? '售罄' : 'Sold Out')}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleFavorite(item, style, size);
                                                                            }}
                                                                            className={`p-1.5 rounded-full border shadow-sm transition-all ${isFav
                                                                                ? 'bg-red-50 border-red-200 text-red-500'
                                                                                : 'bg-white border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200'
                                                                                }`}
                                                                            title={isFav ? (language === 'zh' ? "取消收藏" : "Remove from Favorites") : (language === 'zh' ? "收藏" : "Add to Favorites")}
                                                                        >
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
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
                                                            );
                                                        })
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {/* <div className="mt-4">
                                            <a
                                                href={`https://www.uniqlo.cn/hmall-sc/jp/zh_CN/goods-detail.html?productCode=${product.product_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold text-center active:scale-[0.98] transition-all"
                                            >
                                                去官网查看详情
                                            </a>
                                        </div> */}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
