'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { FavoriteItemRow } from './FavoriteItemRow';
import { FavoriteItem } from '@/types';
import { parseLocalTime } from '@/lib/date-utils';

export default function FavoritePage() {
    const router = useRouter();
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [stockStatus, setStockStatus] = useState<Record<string, boolean | null>>({});
    const [productDetails, setProductDetails] = useState<Record<string, { originPrice: number }>>({});
    const [checking, setChecking] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const { t } = useLanguage();

    const fetchFavorites = useCallback(async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        if (user.id === -1) {
            const savedFavs = localStorage.getItem('favorites');
            if (savedFavs) {
                try {
                    const parsed = JSON.parse(savedFavs);
                    setFavorites(parsed);
                } catch (e) { console.error(e); }
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
                    mainPic: f.main_pic || f.mainPic || f.image_url || f.imageUrl
                }));
                // Sort by timestamp desc to show newest first
                mapped.sort((a: FavoriteItem, b: FavoriteItem) => {
                    const tA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
                    const tB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
                    return tB - tA;
                });
                setFavorites(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch favorites', error);
        }
    }, []);

    useEffect(() => {
        fetchFavorites();
        window.addEventListener('favorites-updated', fetchFavorites);
        return () => window.removeEventListener('favorites-updated', fetchFavorites);
    }, [fetchFavorites]);

    const checkStock = useCallback(async () => {
        setChecking(true);
        const codes = Array.from(new Set(favorites.map(f => f.code).filter(Boolean)));
        const newStatus: Record<string, boolean> = {};
        const newDetails: Record<string, { originPrice: number }> = {};

        try {
            await Promise.all(codes.map(async (code) => {
                try {
                    const res = await fetch(`/api/search?code=${code}`);
                    const data = await res.json();

                    if (data) {
                        const products = Array.isArray(data) ? data : [data];

                        products.forEach((p: any) => {
                            if (p.productId && p.originPrice) {
                                newDetails[p.productId] = { originPrice: p.originPrice };
                            }
                        });

                        const allItems = products.flatMap((p: any) => p.items || []);

                        favorites.filter(f => f.code === code).forEach(fav => {
                            const stockItem = allItems.find((item: any) =>
                                item.style === fav.color && item.size === fav.size
                            );
                            newStatus[fav.key] = stockItem ? stockItem.stock > 0 : false;
                        });
                    }
                } catch (e) {
                    console.error(`Failed to check stock for ${code}`, e);
                }
            }));
            setStockStatus(prev => ({ ...prev, ...newStatus }));
            setProductDetails(prev => ({ ...prev, ...newDetails }));
        } finally {
            setChecking(false);
        }
    }, [favorites]);

    const checkSingleStock = useCallback(async (item: FavoriteItem): Promise<boolean> => {
        try {
            const res = await fetch(`/api/search?code=${item.code}`);
            const data = await res.json();
            if (data) {
                const products = Array.isArray(data) ? data : [data];

                const newDetails: Record<string, { originPrice: number }> = {};
                products.forEach((p: any) => {
                    if (p.productId && p.originPrice) {
                        newDetails[p.productId] = { originPrice: p.originPrice };
                    }
                });
                setProductDetails(prev => ({ ...prev, ...newDetails }));

                const allItems = products.flatMap((p: any) => p.items || []);
                const stockItem = allItems.find((si: any) =>
                    si.style === item.color && si.size === item.size
                );
                return stockItem ? stockItem.stock > 0 : false;
            }
        } catch (e) {
            console.error(`Failed to check stock for ${item.code}`, e);
        }
        return false;
    }, []);

    const removeFavorite = useCallback(async (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        const itemToRemove = favorites.find(f => f.key === key);
        if (!itemToRemove) return;

        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);

                if (user.id === -1) {
                    const newFavs = favorites.filter(f => f.key !== key);
                    setFavorites(newFavs);
                    localStorage.setItem('favorites', JSON.stringify(newFavs));
                    window.dispatchEvent(new Event('favorites-updated'));
                    return;
                }

                const query = itemToRemove.id
                    ? `/api/favorites?id=${itemToRemove.id}`
                    : `/api/favorites?userId=${user.id}&productId=${itemToRemove.productId}&style=${itemToRemove.color}&size=${itemToRemove.size}`;

                await fetch(query, {
                    method: 'DELETE'
                });
            }

            const newFavs = favorites.filter(f => f.key !== key);
            setFavorites(newFavs);
            window.dispatchEvent(new Event('favorites-updated'));
        } catch (error) {
            console.error('Failed to remove favorite', error);
        }
    }, [favorites]);

    const groupedFavorites = useMemo(() => {
        return favorites.reduce((acc, item) => {
            const pid = item.productId;
            if (!acc[pid]) {
                acc[pid] = [];
            }
            acc[pid].push(item);
            return acc;
        }, {} as Record<string, FavoriteItem[]>);
    }, [favorites]);

    const uniqueProductIds = useMemo(() => {
        return Array.from(new Set(favorites.map(f => f.productId)));
    }, [favorites]);

    return (
        <div className="flex flex-col bg-sky-50/20 overflow-hidden max-h-full">
            <div className="bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 py-4 border-b border-slate-100 shadow-sm relative z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium font-outfit">
                        {t('fav.collection', { p: uniqueProductIds.length, v: favorites.length })}
                    </span>
                </div>

                {favorites.length > 0 && (
                    <button
                        onClick={checkStock}
                        disabled={checking}
                        className="text-xs px-4 py-2 bg-slate-800 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 hover:bg-slate-900 transition-all shadow-sm"
                    >
                        {checking ? (
                            <>
                                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                {t('fav.syncing')}
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                {t('fav.refresh')}
                            </>
                        )}
                    </button>
                )}
            </div>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-32 text-slate-300 overflow-y-auto">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-6 opacity-30 text-sky-200">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <p className="text-sm font-medium tracking-tight text-slate-400">{t('fav.empty')}</p>
                </div>
            ) : (
                <div className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
                    {uniqueProductIds.map((pid: string) => {
                        const groupItems = groupedFavorites[pid];
                        if (!groupItems || groupItems.length === 0) return null;

                        const representative = groupItems[0];
                        const isExpanded = selectedProductId === pid;
                        const details = productDetails[pid];

                        const handleCodeClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/?code=${representative.code}`);
                        };

                        return (
                            <div key={pid} className="card p-0 flex flex-col transition-all duration-300 border border-slate-100 shadow-sm hover:shadow-md bg-white/60 backdrop-blur-sm">
                                {/* Simplified Group Header */}
                                <div
                                    role="button"
                                    onClick={() => setSelectedProductId(isExpanded ? null : pid)}
                                    className={`p-3 cursor-pointer bg-white/50 transition-colors hover:bg-white flex items-center justify-between relative group select-none ${isExpanded ? 'border-b border-slate-100' : ''}`}
                                >
                                    <div className="w-20 h-20 mr-4 shrink-0 bg-white rounded-lg overflow-hidden border border-slate-100/50 shadow-sm relative">
                                        {representative.mainPic ? (
                                            <img
                                                src={`https://www.uniqlo.cn${representative.mainPic}`}
                                                alt={representative.name}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1 flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-mono text-sm text-emerald-600 font-bold tracking-tight cursor-pointer hover:underline"
                                                onClick={handleCodeClick}
                                            >
                                                {representative.code}
                                            </span>
                                            <span className="text-sm font-bold text-red-600">¥{representative.price}</span>
                                            {details?.originPrice && (
                                                <span className="text-[10px] text-slate-400 line-through shrink-0">¥{details.originPrice}</span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="font-semibold text-xs text-slate-700 tracking-tight line-clamp-2">{representative.name}</h3>

                                        </div>
                                        <div className="flex items-center gap-2">
                                            {groupItems.length > 0 && (
                                                <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                                                    {t('fav.variants', { n: groupItems.length })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">

                                        <div className="p-2 -m-2 rounded-full hover:bg-slate-50 transition-colors">
                                            <svg className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded List - Show ALL items when expanded */}
                                {isExpanded && (
                                    <div className="bg-gray-50/50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                                        {groupItems.map((item: FavoriteItem) => (
                                            <FavoriteItemRow
                                                key={item.key}
                                                item={item}
                                                stockStatus={stockStatus[item.key] ?? null}
                                                onRemove={removeFavorite}
                                                onCheckSingle={checkSingleStock}
                                                hideProductInfo={true}
                                                originPrice={details?.originPrice}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
