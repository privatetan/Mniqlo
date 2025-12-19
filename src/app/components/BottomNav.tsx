'use client';

type BottomNavProps = {
    activeTab: 'search' | 'favorites';
    setActiveTab: (tab: 'search' | 'favorites') => void;
};

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
    return (
        <nav className="w-full bg-white border-t border-gray-200 z-50 pb-safe shrink-0 ">
            <div className="h-[70px] flex items-center justify-around">
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex flex-col items-center gap-1 p-1 w-full bg-transparent ${activeTab === 'search' ? 'text-black' : 'text-gray-400'}`}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L16.65 16.65M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[10px] font-medium">搜索</span>
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`flex flex-col items-center gap-1 p-1 w-full bg-transparent ${activeTab === 'favorites' ? 'text-black' : 'text-gray-400'}`}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[10px] font-medium">收藏</span>
                </button>
            </div>
        </nav>
    );
}
