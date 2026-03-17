'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeType = 'mist' | 'ocean' | 'forest' | 'night';

const THEME_STORAGE_KEY = 'mniqlo-theme';
const AVAILABLE_THEMES: ThemeType[] = ['mist', 'ocean', 'forest', 'night'];

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    themes: ThemeType[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isThemeType = (value: string | null): value is ThemeType => {
    return value !== null && AVAILABLE_THEMES.includes(value as ThemeType);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeType>('mist');

    useEffect(() => {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (isThemeType(savedTheme)) {
            setThemeState(savedTheme);
        }
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme: setThemeState,
                themes: AVAILABLE_THEMES
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
