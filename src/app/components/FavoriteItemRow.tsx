import { useState, memo } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteItem } from '@/types';
import { parseLocalTime } from '@/lib/date-utils';
import { MonitorSchedulerModal } from './MonitorSchedulerModal';
import { useLanguage } from '@/context/LanguageContext';

interface FavoriteItemRowProps {
    item: FavoriteItem;
    stockStatus: boolean | null;
    onRemove: (e: React.MouseEvent, key: string) => void;
    onCheckSingle: (item: FavoriteItem) => Promise<boolean>;
    hideProductInfo?: boolean;
    originPrice?: number;
}

export const FavoriteItemRow = memo(function FavoriteItemRow({ item, stockStatus, onRemove, onCheckSingle, hideProductInfo = false, originPrice }: FavoriteItemRowProps) {
    const router = useRouter();
    const [showScheduler, setShowScheduler] = useState(false);
    const [localStockStatus, setLocalStockStatus] = useState<boolean | null>(stockStatus);
    const { t, language } = useLanguage();

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
                className="absolute inset-0 bg-red-400/90 rounded-xl flex items-center justify-end px-6 cursor-pointer"
                onClick={(e) => onRemove(e, item.key)}
            >
                <span className="text-white font-semibold text-sm">{t('fav.delete')}</span>
            </div>

            {/* Foreground Content */}
            <div
                className={`flex gap-3 py-3 px-4 bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl shadow-sm relative z-10 transition-transform duration-200 ease-out overflow-visible group ${isSwiped ? '-translate-x-20' : 'translate-x-0'} hover:shadow-md hover:bg-white/90`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                <div className="flex-1 min-w-0">
                    {hideProductInfo ? (
                        // Single line layout
                        <div className="flex flex-wrap items-center justify-between h-full gap-y-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-700 text-[11px] font-semibold bg-slate-100 px-2.5 py-1 rounded-full">{item.color}</span>
                                    <span className="text-slate-700 text-[11px] font-semibold bg-slate-100 px-2.5 py-1 rounded-full">{item.size}</span>
                                </div>
                                <span className="font-bold text-red-500 text-sm">¥{item.price}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {localStockStatus !== undefined && localStockStatus !== null && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${localStockStatus
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-red-50 text-red-500 border-red-100'
                                        }`}>
                                        {localStockStatus ? (language === 'zh' ? '有货' : 'In Stock') : (language === 'zh' ? '售罄' : 'Sold Out')}
                                    </span>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const userStr = localStorage.getItem('user');
                                        if (userStr && JSON.parse(userStr).id === -1) {
                                            alert(language === 'zh' ? '请登录以使用监控功能' : 'Sign in to use the Monitor feature');
                                            return;
                                        }
                                        setShowScheduler(true);
                                    }}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-lg bg-sky-50 text-sky-400 hover:text-sky-600 hover:bg-sky-100 transition-all"
                                    title={t('fav.monitor')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </button>

                                <button
                                    onClick={(e) => onRemove(e, item.key)}
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                    className="text-slate-300 hover:text-red-400 p-1 transition-colors"
                                    title={t('fav.delete')}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M18 6L6 18M6 6L18 18" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Default stacked layout
                        <>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex-1 mr-2 flex items-baseline gap-2 truncate">
                                    <h3 className="font-medium text-sm text-slate-800 truncate">
                                        {item.code && (
                                            <span
                                                className="font-mono text-emerald-500 mr-2 cursor-pointer hover:underline"
                                                onClick={handleCodeClick}
                                            >
                                                {item.code}
                                            </span>
                                        )}
                                        {item.name}
                                    </h3>
                                    {originPrice && (
                                        <span className="text-xs text-slate-400 line-through shrink-0">¥{originPrice}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {localStockStatus !== undefined && localStockStatus !== null && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${localStockStatus
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            : 'bg-red-50 text-red-500 border-red-100'
                                            }`}>
                                            {localStockStatus ? (language === 'zh' ? '有货' : 'In Stock') : (language === 'zh' ? '售罄' : 'Sold Out')}
                                        </span>
                                    )}

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const userStr = localStorage.getItem('user');
                                            if (userStr && JSON.parse(userStr).id === -1) {
                                                alert(language === 'zh' ? '游客无法使用监控功能，请注册登录' : 'Guests cannot use monitors, please sign in');
                                                return;
                                            }
                                            setShowScheduler(true);
                                        }}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchEnd={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg bg-sky-50/50 hover:bg-sky-100 shadow-sm transition-all hover:scale-110"
                                        title={t('fav.monitor')}
                                    >
                                        <svg className="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={(e) => onRemove(e, item.key)}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchEnd={(e) => e.stopPropagation()}
                                        className="text-slate-300 hover:text-red-400 p-1 -mr-2 bg-transparent"
                                        title={t('fav.delete')}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-slate-700 text-sm px-2 py-0.5 bg-slate-100 rounded-full font-medium">{item.color}</span>
                                <span className="text-slate-700 text-sm px-2 py-0.5 bg-slate-100 rounded-full font-medium">{item.size}</span>
                            </div>
                            <div className="flex items-baseline justify-between">
                                <span className="font-bold text-red-500">¥{item.price}</span>
                                <span className="text-xs text-slate-400">{parseLocalTime(item.timestamp).toLocaleDateString()}</span>
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
});
