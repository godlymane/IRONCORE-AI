import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X, Info, AlertTriangle, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToNotifications, markNotificationAsRead, markAllAsRead } from '../../services/NotificationService';

const NotificationItem = ({ note, onRead }) => {
    const getIcon = (type) => {
        switch (type) {
            case 'achievement': return <Trophy size={14} className="text-yellow-400" />;
            case 'warning': return <AlertTriangle size={14} className="text-red-400" />;
            case 'success': return <Zap size={14} className="text-green-400" />;
            default: return <Info size={14} className="text-amber-400" />;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`p-3 rounded-xl border mb-2 relative group ${note.read ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/10 border-white/20'
                }`}
        >
            <div className="flex gap-3">
                <div className="mt-1">{getIcon(note.type)}</div>
                <div className="flex-1">
                    <h4 className="text-xs font-bold text-white leading-tight">{note.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">{note.message}</p>
                    <p className="text-[11px] text-gray-600 mt-2">
                        {note.createdAt ? new Date(note.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}
                    </p>
                </div>
                {!note.read && (
                    <button
                        onClick={() => onRead(note.id)}
                        className="self-start min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/10 rounded-full text-red-400 transition-colors"
                        title="Mark as read"
                    >
                        <Check size={12} />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export const NotificationCenter = ({ userId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!userId) return;
        const unsubscribe = subscribeToNotifications(userId, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [userId]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAllRead = async () => {
        await markAllAsRead(userId);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative min-h-[44px] min-w-[44px] flex items-center justify-center bg-white/5 rounded-full hover:bg-white/10 transition-colors"
            >
                <Bell size={18} className={unreadCount > 0 ? 'text-white' : 'text-gray-400'} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center text-white border border-black">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-4 w-80 max-h-[80vh] bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 backdrop-blur-md">
                            <h3 className="text-sm font-black italic text-white uppercase">Notifications</h3>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-[11px] text-red-400 font-bold hover:text-red-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Bell size={24} className="mx-auto text-gray-700 mb-2" />
                                    <p className="text-xs text-gray-500">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map(note => (
                                    <NotificationItem
                                        key={note.id}
                                        note={note}
                                        onRead={(id) => markNotificationAsRead(userId, id)}
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;



