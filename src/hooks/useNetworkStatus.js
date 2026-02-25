/**
 * Hook to monitor online/offline network status.
 * Returns real-time connectivity state for offline indicators.
 */
import { useState, useEffect, useCallback } from 'react';

export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [wasOffline, setWasOffline] = useState(false);
    const [showSyncBanner, setShowSyncBanner] = useState(false);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        if (wasOffline) {
            setShowSyncBanner(true);
            // Hide sync banner after 3 seconds
            setTimeout(() => setShowSyncBanner(false), 3000);
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
        };
    }, [handleOnline, handleOffline]);

    return { isOnline, showSyncBanner };
}
