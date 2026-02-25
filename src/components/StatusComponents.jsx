import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Offline Indicator - shows when user loses internet + sync banner on reconnect
export const OfflineIndicator = () => {
    const { isOnline, showSyncBanner } = useNetworkStatus();

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-amber-600 text-white text-center py-1.5 text-xs font-medium safe-area-top"
                >
                    📡 You're offline — workouts will sync when connected
                </motion.div>
            )}
            {isOnline && showSyncBanner && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed top-0 left-0 right-0 z-[9999] bg-emerald-600 text-white text-center py-1.5 text-xs font-medium safe-area-top"
                >
                    ✅ Back online — syncing your workouts...
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Error Card - reusable error display with retry
export const ErrorCard = ({ message, onRetry, className = '' }) => {
    return (
        <div className={`bg-red-900/20 border border-red-500/30 rounded-2xl p-6 text-center ${className}`}>
            <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
            <p className="text-white font-bold mb-2">Hit a wall</p>
            <p className="text-sm text-red-300 mb-4">{message || 'Something didn\'t load right. Give it another shot.'}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-white text-sm font-bold flex items-center gap-2 mx-auto transition-colors"
                >
                    <RefreshCw size={14} />
                    Try Again
                </button>
            )}
        </div>
    );
};

// Loading Skeleton - generic skeleton loader
export const SkeletonLoader = ({ className = '', lines = 3 }) => {
    return (
        <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="h-4 bg-white/10 rounded"
                    style={{ width: `${Math.random() * 30 + 70}%` }}
                />
            ))}
        </div>
    );
};

// Empty State - friendly empty state with action
export const EmptyState = ({ icon, title, description, action, actionLabel }) => {
    return (
        <div className="text-center py-12 px-6">
            {icon && <div className="text-5xl mb-4 opacity-50">{icon}</div>}
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-white/50 mb-6 max-w-xs mx-auto">{description}</p>
            {action && (
                <button
                    onClick={action}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition-colors"
                >
                    {actionLabel || 'Get Started'}
                </button>
            )}
        </div>
    );
};

// Connection Status Hook
export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
};



