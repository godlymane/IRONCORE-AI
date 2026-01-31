import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
    dark: {
        name: 'dark',
        colors: {
            background: '#030712',
            backgroundSecondary: '#0f172a',
            surface: 'rgba(255, 255, 255, 0.03)',
            surfaceHover: 'rgba(255, 255, 255, 0.06)',
            border: 'rgba(255, 255, 255, 0.08)',
            borderHover: 'rgba(255, 255, 255, 0.15)',
            text: '#ffffff',
            textSecondary: 'rgba(255, 255, 255, 0.7)',
            textMuted: 'rgba(255, 255, 255, 0.5)',
            accent: '#dc2626',
            accentSecondary: '#ef4444',
            accentGlow: 'rgba(220, 38, 38, 0.4)',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#dc2626',
        }
    },
    light: {
        name: 'light',
        colors: {
            background: '#f8fafc',
            backgroundSecondary: '#ffffff',
            surface: 'rgba(0, 0, 0, 0.02)',
            surfaceHover: 'rgba(0, 0, 0, 0.05)',
            border: 'rgba(0, 0, 0, 0.08)',
            borderHover: 'rgba(220, 38, 38, 0.2)',
            text: '#0f172a',
            textSecondary: 'rgba(15, 23, 42, 0.7)',
            textMuted: 'rgba(15, 23, 42, 0.5)',
            accent: '#dc2626',
            accentSecondary: '#b91c1c',
            accentGlow: 'rgba(220, 38, 38, 0.3)',
            success: '#16a34a',
            warning: '#d97706',
            error: '#dc2626',
            info: '#dc2626',
        }
    }
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Check localStorage first
        const saved = localStorage.getItem('ironcore-theme');
        if (saved && themes[saved]) return saved;

        // Check system preference
        if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        localStorage.setItem('ironcore-theme', theme);

        // Apply theme to document
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Apply CSS variables
        const colors = themes[theme].colors;
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const value = {
        theme,
        themeConfig: themes[theme],
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        isLight: theme === 'light',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export default ThemeContext;


