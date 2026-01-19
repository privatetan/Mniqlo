'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

                        // Update product details (origin price)
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

                // Update product details
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

    const removeFavorite = async (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        const itemToRemove = favorites.find(f => f.key === key);
        if (!itemToRemove) return;

        try {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);

                // Guest handling
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
    };

    const fetchFavorites = useCallback(async () => {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);

        // Guest handling
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
                    imageUrl: f.image_url || f.imageUrl
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

    // Group favorites by productId
    const groupedFavorites = favorites.reduce((acc, item) => {
        const pid = item.productId;
        if (!acc[pid]) {
            acc[pid] = [];
        }
        acc[pid].push(item);
        return acc;
    }, {} as Record<string, FavoriteItem[]>);

    // Get all unique product IDs to preserve order based on the newest item in the group
    const uniqueProductIds = Array.from(new Set(favorites.map(f => f.productId)));

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="bg-white flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-normal ml-2">
                        共计： {uniqueProductIds.length} 个商品 / {favorites.length} 个规格
                    </span>
                </div>

                {favorites.length > 0 && (
                    <button
                        onClick={checkStock}
                        disabled={checking}
                        className="text-xs px-3 py-1.5 bg-black text-white rounded-full disabled:opacity-50 flex items-center gap-1"
                    >
                        {checking ? (
                            <>
                                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                检查中...
                            </>
                        ) : '刷新库存'}
                    </button>
                )}
            </div>

            {favorites.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-gray-500 py-20 overflow-y-auto">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 text-gray-300">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm">请添加收藏</p>
                </div>
            ) : (
                <div className="p-4 space-y-4 pt-4 flex-1 overflow-y-auto">
                    {uniqueProductIds.map((pid) => {
                        const groupItems = groupedFavorites[pid];
                        if (!groupItems || groupItems.length === 0) return null;

                        const representative = groupItems[0];
                        const isExpanded = selectedProductId === pid;
                        const details = productDetails[pid];
                        // Always treated as a group even if only 1 item, to maintain consistent look?
                        // Or only simplified if expanded? 
                        // User said "The clicked item only has...".
                        // This implies the list item itself (whether expanded or not) should be simple.
                        // Let's make the "Header" simple.

                        const handleCodeClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            router.push(`/?code=${representative.code}`);
                        };

                        return (
                            <div key={pid} className="flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm transition-all duration-300">
                                {/* Simplified Group Header */}
                                <div
                                    onClick={() => setSelectedProductId(isExpanded ? null : pid)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between relative rounded-t-xl ${!isExpanded ? 'rounded-b-xl' : ''}`}
                                >
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="font-mono text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                                                onClick={handleCodeClick}
                                            >
                                                {representative.code}
                                            </span>
                                            <span className="text-xs text-gray-300">ID: {pid}</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="font-medium text-sm text-gray-900">{representative.name}</h3>
                                            {details?.originPrice && (
                                                <span className="text-xs text-gray-400 line-through">¥{details.originPrice}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        {groupItems.length > 0 && (
                                            <span className="bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                                {groupItems.length} 个规格
                                            </span>
                                        )}
                                        <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Expanded List - Show ALL items when expanded */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 p-2 space-y-2 animate-in fade-in slide-in-from-top-1 rounded-b-xl">
                                        {groupItems.map((item) => (
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
