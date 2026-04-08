/**
 * Hook to monitor online/offline network status.
 * Returns real-time connectivity state for offline indicators.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [wasOffline, setWasOffline] = useState(false);
    const [showSyncBanner, setShowSyncBanner] = useState(false);
    const bannerTimeoutRef = useRef(null);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        if (wasOffline) {
            setShowSyncBanner(true);
            // Clear any previous timeout before setting a new one
            clearTimeout(bannerTimeoutRef.current);
            // Hide sync banner after 3 seconds
            bannerTimeoutRef.current = setTimeout(() => setShowSyncBanner(false), 3000);
        }
    }, [wasOffline]);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setWasOffline(true);
    }, []);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            // Clean up the banner timeout on unmount to prevent memory leak
            clearTimeout(bannerTimeoutRef.current);
        };
    }, [handleOnline, handleOffline]);

    return { isOnline, showSyncBanner };
}
