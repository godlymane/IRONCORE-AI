import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings, Download, Bell, BellOff, Palette, FileText,
    Shield, LogOut, ChevronRight, Check, Clock, Moon, Sun,
    Database, Share2, Trash2, Cpu, Zap, Hand
} from 'lucide-react';
import { exportWorkouts, exportMeals, exportAllData } from '../../utils/exportUtils';
import {
    requestNotificationPermission,
    getNotificationPermission,
    scheduleWorkoutReminder,
    getWorkoutReminders,
    removeWorkoutReminder
} from '../../services/pushNotificationService';
import { usePremium } from '../../context/PremiumContext';
import { getPerformanceMode, setPerformanceMode } from '../../lib/performanceMonitor';

export const SettingsPanel = ({
    workouts = [],
    meals = [],
    profile = {},
    onLogout,
    className = ''
}) => {
    const { isPremium, requirePremium } = usePremium();
    const [notificationStatus, setNotificationStatus] = useState('default');
    const [reminders, setReminders] = useState([]);
    const [showReminderPicker, setShowReminderPicker] = useState(false);
    const [selectedTime, setSelectedTime] = useState({ hour: 9, minute: 0 });
    const [exportLoading, setExportLoading] = useState(null);
    const [perfMode, setPerfMode] = useState(getPerformanceMode);

    useEffect(() => {
        setNotificationStatus(getNotificationPermission());
        setReminders(getWorkoutReminders());
    }, []);

    const handlePerfModeChange = (mode) => {
        setPerfMode(mode);
        setPerformanceMode(mode);
    };

    const handleEnableNotifications = async () => {
        const result = await requestNotificationPermission();
        setNotificationStatus(result.permission || 'denied');
    };

    const handleAddReminder = () => {
        const result = scheduleWorkoutReminder(
            selectedTime.hour,
            selectedTime.minute,
            "Time to get your workout in! 💪"
        );
        if (result.success) {
            setReminders(getWorkoutReminders());
            setShowReminderPicker(false);
        }
    };

    const handleRemoveReminder = (id) => {
        removeWorkoutReminder(id);
        setReminders(getWorkoutReminders());
    };

    const handleExport = async (type) => {
        if (!isPremium) {
            requirePremium('pro', 'advancedStats');
            return;
        }
        setExportLoading(type);
        try {
            switch (type) {
                case 'workouts':
                    exportWorkouts(workouts);
                    break;
                case 'meals':
                    exportMeals(meals);
                    break;
                case 'all':
                    exportAllData({ workouts, meals, profile });
                    break;
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
        setTimeout(() => setExportLoading(null), 1000);
    };

    const formatTime = (hour, minute) => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    const SettingItem = ({ icon: Icon, label, description, action, dangerous = false }) => (
        <div
            onClick={action}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-colors ${dangerous
                    ? 'bg-red-900/20 hover:bg-red-900/30 border border-red-500/20'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
        >
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dangerous ? 'bg-red-500/20' : 'bg-white/10'
                    }`}>
                    <Icon size={20} className={dangerous ? 'text-red-400' : 'text-white/70'} />
                </div>
                <div>
                    <p className={`font-medium ${dangerous ? 'text-red-400' : 'text-white'}`}>{label}</p>
                    {description && (
                        <p className="text-xs text-white/50">{description}</p>
                    )}
                </div>
            </div>
            <ChevronRight size={18} className="text-white/30" />
        </div>
    );

    return (
        <div className={`space-y-6 ${className}`}>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings size={24} />
                Settings
            </h2>

            {/* Notifications Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Notifications</h3>

                {notificationStatus !== 'granted' ? (
                    <SettingItem
                        icon={BellOff}
                        label="Enable Notifications"
                        description="Get workout reminders and achievements"
                        action={handleEnableNotifications}
                    />
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 p-3 bg-green-900/20 rounded-xl border border-green-500/20">
                            <Check size={16} className="text-green-400" />
                            <span className="text-sm text-green-400">Notifications enabled</span>
                        </div>

                        {/* Reminders list */}
                        {reminders.map(reminder => (
                            <div key={reminder.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-red-400" />
                                    <span className="text-sm text-white">
                                        Daily at {formatTime(reminder.hour, reminder.minute)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleRemoveReminder(reminder.id)}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} className="text-red-400" />
                                </button>
                            </div>
                        ))}

                        {/* Add reminder button */}
                        {!showReminderPicker ? (
                            <button
                                onClick={() => setShowReminderPicker(true)}
                                className="w-full p-3 border border-dashed border-white/20 rounded-xl text-sm text-white/50 hover:border-white/40 transition-colors"
                            >
                                + Add Workout Reminder
                            </button>
                        ) : (
                            <div className="p-4 bg-white/5 rounded-xl space-y-3">
                                <div className="flex gap-3">
                                    <select
                                        value={selectedTime.hour}
                                        onChange={(e) => setSelectedTime({ ...selectedTime, hour: parseInt(e.target.value) })}
                                        className="flex-1 p-2 bg-white/10 rounded-lg text-white border-none"
                                    >
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <option key={i} value={i}>{formatTime(i, 0).split(':')[0]} {i >= 12 ? 'PM' : 'AM'}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedTime.minute}
                                        onChange={(e) => setSelectedTime({ ...selectedTime, minute: parseInt(e.target.value) })}
                                        className="flex-1 p-2 bg-white/10 rounded-lg text-white border-none"
                                    >
                                        {[0, 15, 30, 45].map(m => (
                                            <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddReminder}
                                        className="flex-1 py-2 bg-red-600 rounded-lg text-sm font-bold text-white"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setShowReminderPicker(false)}
                                        className="px-4 py-2 bg-white/10 rounded-lg text-sm text-white/70"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Performance Mode */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">AI Camera</h3>
                <div className="space-y-2">
                    {[
                        { mode: 'auto', icon: Zap, label: 'Auto', desc: 'Best quality — auto-detects low-end devices' },
                        { mode: 'low_power', icon: Cpu, label: 'Low Power', desc: 'Reduced resolution — saves battery & prevents overheating' },
                        { mode: 'manual', icon: Hand, label: 'Manual Mode', desc: 'Camera off — log reps & form checks manually' },
                    ].map(({ mode, icon: Icon, label, desc }) => (
                        <div
                            key={mode}
                            onClick={() => handlePerfModeChange(mode)}
                            className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                                perfMode === mode
                                    ? 'bg-red-900/30 border border-red-500/40'
                                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                perfMode === mode ? 'bg-red-500/20' : 'bg-white/10'
                            }`}>
                                <Icon size={20} className={perfMode === mode ? 'text-red-400' : 'text-white/70'} />
                            </div>
                            <div className="flex-1">
                                <p className={`font-medium ${perfMode === mode ? 'text-white' : 'text-white/80'}`}>{label}</p>
                                <p className="text-xs text-white/50">{desc}</p>
                            </div>
                            {perfMode === mode && <Check size={18} className="text-red-400" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Data & Export Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Data & Export</h3>

                <SettingItem
                    icon={Download}
                    label={isPremium ? "Export Workouts" : "Export Workouts (PRO)"}
                    description={`${workouts.length} workouts as CSV`}
                    action={() => handleExport('workouts')}
                />
                <SettingItem
                    icon={FileText}
                    label={isPremium ? "Export Meals" : "Export Meals (PRO)"}
                    description={`${meals.length} meals as CSV`}
                    action={() => handleExport('meals')}
                />
                <SettingItem
                    icon={Database}
                    label={isPremium ? "Full Backup" : "Full Backup (PRO)"}
                    description="Export all data as JSON"
                    action={() => handleExport('all')}
                />
            </div>

            {/* Account Section */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Account</h3>

                <SettingItem
                    icon={Shield}
                    label="Privacy & Security"
                    description="Manage your data and privacy"
                    action={() => { }}
                />
                <SettingItem
                    icon={LogOut}
                    label="Sign Out"
                    description={profile?.email || 'Log out of your account'}
                    action={onLogout}
                    dangerous
                />
            </div>

            {/* App Info */}
            <div className="text-center text-xs text-white/30 pt-4">
                <p>IronCore AI v1.0.0</p>
                <p>Made with 💪 for fitness enthusiasts</p>
            </div>
        </div>
    );
};

export default SettingsPanel;



