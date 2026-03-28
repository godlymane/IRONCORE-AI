import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '../utils/constants';

/**
 * Hook to detect mobile viewport.
 * @param {number} [breakpoint] - Custom breakpoint (default: BREAKPOINTS.mobile)
 * @returns {boolean} Whether viewport is at or below the breakpoint
 */
export function useIsMobile(breakpoint) {
    const bp = breakpoint || (typeof BREAKPOINTS !== 'undefined' ? BREAKPOINTS.mobile : 768);
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth <= bp : false
    );

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= bp);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [bp]);

    return isMobile;
}
