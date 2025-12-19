'use client';

import { useState, useEffect, useCallback } from 'react';
import { FavoriteItemRow } from './FavoriteItemRow';
import { FavoriteItem } from '@/types';

export default function FavoritePage() {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [stockStatus, setStockStatus] = useState<Record<string, boolean | null>>({});
    const [checking, setChecking] = useState(false);

    const checkStock = useCallback(async () => {
        setChecking(true);
        const codes = Array.from(new Set(favorites.map(f => f.code).filter(Boolean)));
        const newStatus: Record<string, boolean> = {};

        try {
            await Promise.all(codes.map(async (code) => {
                try {
                    const res = await fetch(`/api/search?code=${code}`);
                    const data = await res.json();

                    if (data && data.items) {
                        favorites.filter(f => f.code === code).forEach(fav => {
                            const stockItem = data.items.find((item: any) =>
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
        } finally {
            setChecking(false);
        }
    }, [favorites]);

    const checkSingleStock = useCallback(async (item: FavoriteItem): Promise<boolean> => {
        try {
            const res = await fetch(`/api/search?code=${item.code}`);
            const data = await res.json();
            if (data && data.items) {
                const stockItem = data.items.find((si: any) =>
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

                await fetch(`/api/favorites?userId=${user.id}&productId=${itemToRemove.productId}&style=${itemToRemove.color}&size=${itemToRemove.size}`, {
                    method: 'DELETE'
                });
            }

            const newFavs = favorites.filter(f => f.key !== key);
            setFavorites(newFavs);
            // localStorage.setItem('favorites', JSON.stringify(newFavs)); // Keep local sync optionally? Better to rely on API state/re-fetch?
            // For now, optimistically update UI is good.
            window.dispatchEvent(new Event('favorites-updated'));
        } catch (error) {
            console.error('Failed to remove favorite', error);
            // Revert state if needed, but for now just log
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
                    key: `${f.style}-${f.size}`,
                    productId: f.productId,
                    code: f.code,
                    name: f.name,
                    color: f.style || '',
                    size: f.size || '',
                    price: f.price,
                    timestamp: new Date(f.createdAt).getTime(),
                    imageUrl: f.imageUrl
                }));
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

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="bg-white flex items-center justify-between p-4">
                <h1> <span className="text-xs text-gray-500 font-normal ml-2">{favorites.length} 个商品</span></h1>
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
                <div className="p-4 space-y-4 pt-0 flex-1 overflow-y-auto">
                    {favorites.map((item) => (
                        <FavoriteItemRow
                            key={item.key}
                            item={item}
                            stockStatus={stockStatus[item.key] ?? null}
                            onRemove={removeFavorite}
                            onCheckSingle={checkSingleStock}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
