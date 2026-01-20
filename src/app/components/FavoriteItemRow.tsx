import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteItem } from '@/types';
import { parseLocalTime } from '@/lib/date-utils';
import { MonitorSchedulerModal } from './MonitorSchedulerModal';

interface FavoriteItemRowProps {
    item: FavoriteItem;
    stockStatus: boolean | null;
    onRemove: (e: React.MouseEvent, key: string) => void;
    onCheckSingle: (item: FavoriteItem) => Promise<boolean>;
    hideProductInfo?: boolean;
    originPrice?: number;
}

export function FavoriteItemRow({ item, stockStatus, onRemove, onCheckSingle, hideProductInfo = false, originPrice }: FavoriteItemRowProps) {
    const router = useRouter();
    const [showScheduler, setShowScheduler] = useState(false);
    const [localStockStatus, setLocalStockStatus] = useState<boolean | null>(stockStatus);

    const handleCodeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/?code=${item.code}`);
    };

    const handleStockStatusChange = (status: boolean) => {
        setLocalStockStatus(status);
    };



    // Swipe logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [isSwiped, setIsSwiped] = useState(false);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
        setShowScheduler(false); // Close popup on interaction
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            setIsSwiped(true);
        } else if (isRightSwipe) {
            setIsSwiped(false);
        }
    };

    const handleClick = () => {
        if (isSwiped) setIsSwiped(false);
    };

    return (
        <div className="relative select-none touch-pan-y" onClick={handleClick}>
            {/* Delete Background */}
            <div
                className="absolute inset-0 bg-red-500 rounded-xl flex items-center justify-end px-6 cursor-pointer"
                onClick={(e) => onRemove(e, item.key)}
            >
                <span className="text-white font-medium text-sm">删除</span>
            </div>

            {/* Foreground Content */}
            <div
                className={`flex gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm relative z-10 transition-transform duration-200 ease-out overflow-visible group ${isSwiped ? '-translate-x-20' : 'translate-x-0'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="flex-1 min-w-0">
                    {hideProductInfo ? (
                        // Single line layout
                        <div className="flex items-center justify-between h-full">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.color}</span>
                                    <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.size}</span>
                                </div>
                                <span className="font-bold text-red-600">¥{item.price}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {localStockStatus !== undefined && localStockStatus !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${localStockStatus
                                        ? 'bg-green-50 text-green-600 border-green-100'
                                        : 'bg-red-50 text-red-500 border-red-100'
                                        }`}>
                                        {localStockStatus ? '有货' : '售罄'}
                                    </span>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const userStr = localStorage.getItem('user');
                                        if (userStr && JSON.parse(userStr).id === -1) {
                                            alert('游客无法使用监控功能，请注册登录');
                                            return;
                                        }
                                        setShowScheduler(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-all hover:scale-110"
                                    title="监控设置"
                                >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>

                                <button
                                    onClick={(e) => onRemove(e, item.key)}
                                    className="text-gray-400 hover:text-red-500 p-1 bg-transparent"
                                    title="删除收藏"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Default stacked layout
                        <>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex-1 mr-2 flex items-baseline gap-2 truncate">
                                    <h3 className="font-medium text-sm text-gray-900 truncate">
                                        {item.code && (
                                            <span
                                                className="font-mono text-green-500 mr-2 cursor-pointer hover:underline"
                                                onClick={handleCodeClick}
                                            >
                                                {item.code}
                                            </span>
                                        )}
                                        {item.name}
                                    </h3>
                                    {originPrice && (
                                        <span className="text-xs text-gray-400 line-through shrink-0">¥{originPrice}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {localStockStatus !== undefined && localStockStatus !== null && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${localStockStatus
                                            ? 'bg-green-50 text-green-600 border-green-100'
                                            : 'bg-red-50 text-red-500 border-red-100'
                                            }`}>
                                            {localStockStatus ? '有货' : '售罄'}
                                        </span>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const userStr = localStorage.getItem('user');
                                            if (userStr && JSON.parse(userStr).id === -1) {
                                                alert('游客无法使用监控功能，请注册登录');
                                                return;
                                            }
                                            setShowScheduler(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-all hover:scale-110"
                                        title="监控设置"
                                    >
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={(e) => onRemove(e, item.key)}
                                        className="text-gray-400 hover:text-red-500 p-1 -mr-2 bg-transparent"
                                        title="删除收藏"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.color}</span>
                                <span className="text-gray-900 text-sm px-2 py-0.5 bg-gray-100 rounded-full font-medium">{item.size}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="font-bold text-red-600">¥{item.price}</span>
                                <span className="text-xs text-gray-400">{parseLocalTime(item.timestamp).toLocaleDateString()}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {showScheduler && (
                <MonitorSchedulerModal
                    item={item}
                    isOpen={showScheduler}
                    onClose={() => setShowScheduler(false)}
                    onCheckSingle={onCheckSingle}
                    onStockStatusChange={handleStockStatusChange}
                />
            )}
        </div>
    );
}
