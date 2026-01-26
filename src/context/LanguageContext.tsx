'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type LanguageType = 'zh' | 'en';

interface Translations {
    [key: string]: {
        zh: string;
        en: string;
    };
}

export const translations: Translations = {
    // Sidebar
    'nav.selection': { zh: '超值精选', en: 'Super Selection' },
    'nav.search': { zh: '商品搜索', en: 'Search' },
    'nav.favorites': { zh: '我的收藏', en: 'Favorites' },
    'nav.est': { zh: '始于 2026', en: 'Est. 2026' },

    // Header
    'header.admin': { zh: '管理后台', en: 'Admin' },
    'header.logout': { zh: '退出登录', en: 'Logout' },
    'header.search_title': { zh: '库存搜索', en: 'Search Inventory' },
    'header.gallery_title': { zh: '私人收藏', en: 'Private Collection' },
    'header.selection_title': { zh: '精选商品', en: 'Featured Selection' },

    // Search Page
    'search.placeholder': { zh: '请输入6位商品编号...', en: 'Enter 6-digit product code...' },
    'search.history': { zh: '搜索历史', en: 'History' },
    'search.searching': { zh: '搜索中...', en: 'Searching...' },
    'search.color': { zh: '颜色', en: 'Color' },
    'search.size': { zh: '尺寸', en: 'Size' },
    'search.stock': { zh: '库存', en: 'Stock' },

    // Favorites Page
    'fav.collection': { zh: '共 {p} 个商品 / {v} 个规格', en: 'Collection: {p} Products / {v} Variants' },
    'fav.syncing': { zh: '同步中...', en: 'Syncing...' },
    'fav.refresh': { zh: '刷新库存', en: 'Refresh Stock' },
    'fav.empty': { zh: '收藏夹还是空的', en: 'Your gallery is empty' },
    'fav.variants': { zh: '{n} 个规格', en: '{n} Variants' },
    'fav.delete': { zh: '删除', en: 'Delete' },
    'fav.monitor': { zh: '监控设置', en: 'Monitor Setup' },

    // Super Selection Page
    'sel.search_placeholder': { zh: '搜索代码或名称...', en: 'Search by code or name...' },
    'sel.sort_default': { zh: '默认排序', en: 'Default Sort' },
    'sel.sort_price_asc': { zh: '价格从低到高', en: 'Price: Low to High' },
    'sel.sort_price_desc': { zh: '价格从高到低', en: 'Price: High to Low' },
    'sel.sort_discount': { zh: '最大折扣', en: 'Best Discount' },
    'sel.found': { zh: '找到 {n} 个商品', en: '{n} items found' },
    'sel.loading': { zh: '正在加载精选...', en: 'Curating selection...' },
    'sel.none': { zh: '未找到匹配项', en: 'No items found' },
    'sel.new': { zh: '新品', en: 'NEW' },
    'sel.off': { zh: '{n} 折', en: '{n} OFF' },

    // Login Form
    'login.title': { zh: '欢迎使用 Mniqlo', en: 'Welcome to Mniqlo' },
    'reg.title': { zh: '注册 Mniqlo 账号', en: 'Create Mniqlo Account' },
    'login.username': { zh: '用户名', en: 'Username' },
    'login.password': { zh: '密码', en: 'Password' },
    'login.submit': { zh: '登录', en: 'Login' },
    'reg.submit': { zh: '注册', en: 'Register' },
    'login.loading': { zh: '登录中...', en: 'Logging in...' },
    'reg.loading': { zh: '注册中...', en: 'Registering...' },
    'login.to_reg': { zh: '没有账号？去注册', en: 'No account? Register' },
    'login.to_login': { zh: '已有账号？去登录', en: 'Have account? Login' },
    'login.or': { zh: '或者', en: 'OR' },
    'login.guest': { zh: '游客登录', en: 'Guest Login' },
    'login.err_msg': { zh: '登录失败', en: 'Login failed' },
    'reg.err_msg': { zh: '注册失败', en: 'Registration failed' },
    'login.err_generic': { zh: '发生错误，请重试', en: 'An error occurred, please try again' },

    // Monitor Modal
    'mon.title': { zh: '监控任务设置', en: 'Monitor Task Settings' },
    'mon.enable': { zh: '启用监控', en: 'Enable Monitor' },
    'mon.enable_desc': { zh: '自动检查库存状态并推送通知', en: 'Auto-check stock and push notifications' },
    'mon.interval': { zh: '检查间隔', en: 'Check Interval' },
    'mon.interval_unit': { zh: '秒', en: 'sec' },
    'mon.interval_min': { zh: '最小间隔为 2 秒', en: 'Min interval: 2s' },
    'mon.window': { zh: '监控时间段', en: 'Monitoring Window' },
    'mon.window_desc': { zh: '仅在此时间段内执行监控', en: 'Monitor only within this window' },
    'mon.status': { zh: '任务状态', en: 'Task Status' },
    'mon.count': { zh: '执行次数', en: 'Execution Count' },
    'mon.curr_status': { zh: '当前状态', en: 'Current Status' },
    'mon.unchecked': { zh: '未检查', en: 'Unchecked' },
    'mon.in_stock': { zh: '有货', en: 'In Stock' },
    'mon.sold_out': { zh: '售罄', en: 'Sold Out' },
    'mon.logs': { zh: '执行日志 ({n})', en: 'Logs ({n})' },
    'mon.no_logs': { zh: '暂无执行记录', en: 'No logs yet' },
    'mon.cancel': { zh: '取消', en: 'Cancel' },
    'mon.start': { zh: '开始监控', en: 'Start Monitor' },
    'mon.stop': { zh: '关闭监控', en: 'Stop Monitor' },
    'mon.log_exec': { zh: '执行时间 {t} - {m}', en: 'Time {t} - {m}' },
    'mon.log_window': { zh: '不在监控时间段 ({w})', en: 'Out of window ({w})' },
    'mon.notify_req': { zh: '[发出通知请求] ...', en: '[Notification Request] ...' },
    'mon.notify_rate': { zh: '[限流] 剩余 {n} 分钟', en: '[Rate Limit] {n} min left' },
    'mon.notify_ok': { zh: '[通知成功] 微信已发送', en: '[Success] WeChat sent' },
    'mon.notify_err': { zh: '[通知失败] {m}', en: '[Failed] {m}' },
    'mon.net_err': { zh: '[网络错误] {m}', en: '[Network Error] {m}' },
    'mon.user_err': { zh: '[错误] 用户名缺失', en: '[Error] Username missing' },
    'mon.login_err': { zh: '[错误] 未登录', en: '[Error] Not logged in' },
    'mon.notify_title': { zh: '库存通知: {n}', en: 'Stock Alert: {n}' },
    'mon.notify_content': { zh: '您监控的商品 [{c}] {n} ({clr}/{s}) 现在有货了！\n刷新时间: {t}', en: 'Item [{c}] {n} ({clr}/{s}) is now in stock!\nTime: {t}' },
};

interface LanguageContextType {
    language: LanguageType;
    setLanguage: (lang: LanguageType) => void;
    t: (key: string, variables?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<LanguageType>('zh');

    useEffect(() => {
        const savedLang = localStorage.getItem('language') as LanguageType;
        if (savedLang) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: LanguageType) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string, variables?: Record<string, string | number>) => {
        const translation = translations[key];
        if (!translation) return key;

        let text = translation[language];
        if (variables) {
            Object.entries(variables).forEach(([name, value]) => {
                text = text.replace(`{${name}}`, String(value));
            });
        }
        return text;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
