import { useState, useEffect, useRef } from 'react';
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
    const debounceRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setIsMobile(window.innerWidth <= bp);
            }, 150);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(debounceRef.current);
        };
    }, [bp]);

    return isMobile;
}
