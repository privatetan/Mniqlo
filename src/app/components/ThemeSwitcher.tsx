'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme, type ThemeType } from '@/context/ThemeContext';

type ThemeSwitcherProps = {
    align?: 'left' | 'right';
    compact?: boolean;
};

const themeSwatches: Record<ThemeType, string> = {
    mist: 'linear-gradient(135deg, #dbece4 0%, #ffffff 48%, #dfe8f1 100%)',
    ocean: 'linear-gradient(135deg, #dce7f4 0%, #ffffff 48%, #d7ebf3 100%)',
    forest: 'linear-gradient(135deg, #e6efdf 0%, #ffffff 48%, #e0edd6 100%)',
    night: 'linear-gradient(135deg, #19232c 0%, #0f151b 48%, #20313f 100%)'
};

const PANEL_WIDTH = 224;
const VIEWPORT_GUTTER = 12;

export default function ThemeSwitcher({ align = 'right', compact = false }: ThemeSwitcherProps) {
    const { theme, setTheme, themes } = useTheme();
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideTrigger = containerRef.current?.contains(target);
            const clickedInsidePanel = panelRef.current?.contains(target);

            if (!clickedInsideTrigger && !clickedInsidePanel) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen || !buttonRef.current) {
            return;
        }

        const updatePanelPosition = () => {
            if (!buttonRef.current) {
                return;
            }

            const rect = buttonRef.current.getBoundingClientRect();
            const top = rect.bottom + 12;
            const preferredLeft = align === 'left' ? rect.left : rect.right - PANEL_WIDTH;
            const maxLeft = window.innerWidth - PANEL_WIDTH - VIEWPORT_GUTTER;
            const left = Math.min(Math.max(preferredLeft, VIEWPORT_GUTTER), Math.max(VIEWPORT_GUTTER, maxLeft));

            setPanelStyle({
                position: 'fixed',
                top,
                left,
                width: PANEL_WIDTH,
                zIndex: 90
            });
        };

        updatePanelPosition();

        window.addEventListener('resize', updatePanelPosition);
        window.addEventListener('scroll', updatePanelPosition, true);

        return () => {
            window.removeEventListener('resize', updatePanelPosition);
            window.removeEventListener('scroll', updatePanelPosition, true);
        };
    }, [align, isOpen]);

    return (
        <div ref={containerRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-3 py-2 text-slate-500 transition-all hover:bg-white/90 hover:text-[color:var(--accent-strong)]"
                aria-label={t('theme.label')}
                title={t('theme.label')}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3a9 9 0 1 0 9 9c0-.47-.04-.93-.11-1.38A5.5 5.5 0 0 1 13.38 3.11c-.45-.07-.91-.11-1.38-.11Z" />
                    <path d="M7.5 11.5 9 13l2.5-3" />
                </svg>
                {!compact && (
                    <span className="hidden sm:inline text-xs font-semibold tracking-tight">
                        {t(`theme.${theme}`)}
                    </span>
                )}
            </button>

            {isMounted && isOpen && panelStyle && createPortal(
                <div
                    ref={panelRef}
                    className="rounded-2xl frost-panel p-2 shadow-[0_24px_56px_-34px_rgba(31,48,55,0.38)]"
                    style={panelStyle}
                >
                    <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {t('theme.label')}
                    </div>
                    <div className="space-y-1">
                        {themes.map((item) => {
                            const selected = item === theme;
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                        setTheme(item);
                                        setIsOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${selected
                                        ? 'border-white/80 bg-white/85 shadow-[0_18px_30px_-24px_rgba(31,48,55,0.35)]'
                                        : 'border-transparent bg-transparent hover:border-white/70 hover:bg-white/60'
                                        }`}
                                >
                                    <span
                                        className="h-8 w-8 rounded-full border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]"
                                        style={{ background: themeSwatches[item] }}
                                    />
                                    <span className="flex-1 text-sm font-semibold text-slate-700">
                                        {t(`theme.${item}`)}
                                    </span>
                                    {selected && (
                                        <svg className="text-[color:var(--accent-strong)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m5 12 5 5L20 7" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
