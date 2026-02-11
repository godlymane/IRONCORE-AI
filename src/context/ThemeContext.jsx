import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
    dark: {
        name: 'dark',
        colors: {
            background: '#000000',
            backgroundSecondary: '#080808',
            surface: 'rgba(220, 38, 38, 0.03)',
            surfaceHover: 'rgba(220, 38, 38, 0.08)',
            border: 'rgba(220, 38, 38, 0.12)',
            borderHover: 'rgba(220, 38, 38, 0.4)',
            text: '#ffffff',
            textSecondary: 'rgba(255, 255, 255, 0.8)',
            textMuted: 'rgba(255, 255, 255, 0.5)',
            accent: '#dc2626',
            accentLight: '#ef4444',
            accentDark: '#b91c1c',
            accentDeep: '#991b1b',
            accentSecondary: '#ef4444',
            accentGlow: 'rgba(220, 38, 38, 0.4)',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#dc2626',
        },
        fonts: {
            body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            heading: "'Oswald', 'Inter', sans-serif",
            mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        }
    },
    // light theme removed
};

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('dark');

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
        // Theme switching disabled - Enforcing Dark Mode
        setTheme('dark');
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


