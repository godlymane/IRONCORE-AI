import React, { createContext, useContext, useEffect, useMemo } from 'react';

const ThemeContext = createContext();

export const themes = {
    dark: {
        name: 'dark',
        colors: {
            // Backgrounds
            background: '#000000',
            backgroundSecondary: '#080808',
            backgroundTertiary: '#111111',
            backgroundElevated: '#1a1a1a',

            // Surfaces (glass/card backgrounds)
            surface: 'rgba(220, 38, 38, 0.03)',
            surfaceHover: 'rgba(220, 38, 38, 0.08)',
            surfaceActive: 'rgba(220, 38, 38, 0.12)',
            surfaceDisabled: 'rgba(255, 255, 255, 0.03)',

            // Borders
            border: 'rgba(220, 38, 38, 0.12)',
            borderHover: 'rgba(220, 38, 38, 0.4)',
            borderSubtle: 'rgba(255, 255, 255, 0.06)',
            borderFocus: 'rgba(220, 38, 38, 0.6)',

            // Text
            text: '#ffffff',
            textSecondary: 'rgba(255, 255, 255, 0.8)',
            textMuted: 'rgba(255, 255, 255, 0.5)',
            textDisabled: 'rgba(255, 255, 255, 0.25)',
            textInverse: '#000000',

            // Accent (canonical red palette — do NOT use raw #FF0000/#CC0000/#990000)
            accent: '#dc2626',
            accentLight: '#ef4444',
            accentExtraLight: '#f87171',
            accentDark: '#b91c1c',
            accentDeep: '#991b1b',
            accentSecondary: '#ef4444',
            accentGlow: 'rgba(220, 38, 38, 0.4)',
            accentGlowSubtle: 'rgba(220, 38, 38, 0.15)',

            // Semantic
            success: '#22c55e',
            successMuted: 'rgba(34, 197, 94, 0.15)',
            warning: '#f59e0b',
            warningMuted: 'rgba(245, 158, 11, 0.15)',
            error: '#ef4444',
            errorMuted: 'rgba(239, 68, 68, 0.15)',
            info: '#dc2626',
            infoMuted: 'rgba(220, 38, 38, 0.15)',

            // League/rank colors
            leagueIron: '#9ca3af',
            leagueBronze: '#c2410c',
            leagueSilver: '#cbd5e1',
            leagueGold: '#facc15',
            leaguePlatinum: '#22d3ee',
            leagueDiamond: '#f87171',

            // Overlay/backdrop
            overlay: 'rgba(0, 0, 0, 0.6)',
            overlayHeavy: 'rgba(0, 0, 0, 0.85)',
            scrim: 'rgba(0, 0, 0, 0.4)',
        },
        spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px',
            lg: '24px',
            xl: '32px',
            xxl: '48px',
        },
        radii: {
            sm: '6px',
            md: '10px',
            lg: '16px',
            xl: '24px',
            full: '9999px',
        },
        fonts: {
            body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            heading: "'Oswald', 'Inter', sans-serif",
            mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
        },
        fontSizes: {
            xs: '11px',
            sm: '13px',
            md: '15px',
            lg: '18px',
            xl: '24px',
            xxl: '32px',
            display: '48px',
        },
    },
    // light theme removed
};

export function ThemeProvider({ children }) {
    const theme = 'dark';

    useEffect(() => {
        try { localStorage.setItem('ironcore-theme', theme); } catch { /* private browsing / quota */ }

        // Apply theme to document
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Apply CSS variables for all token categories
        const config = themes[theme];
        const applyTokens = (obj, prefix) => {
            Object.entries(obj).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    root.style.setProperty(`--${prefix}-${key}`, value);
                }
            });
        };
        applyTokens(config.colors, 'color');
        if (config.spacing) applyTokens(config.spacing, 'spacing');
        if (config.radii) applyTokens(config.radii, 'radius');
        if (config.fontSizes) applyTokens(config.fontSizes, 'font-size');
    }, []);

    const value = useMemo(() => ({
        theme,
        themeConfig: themes[theme],
        isDark: true,
    }), []);

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


