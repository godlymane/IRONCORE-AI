import React, { useState } from 'react';
import { X, Camera } from 'lucide-react';
import { Button } from '../UIComponents';

export const ProfileSettingsModal = ({ profile, userPhoto, user, uploadProfilePic, fileInputRef, uploadingPhoto, setUploadingPhoto, onClose, updateData }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        weight: profile?.weight || '',
        height: profile?.height || '',
        goal: profile?.goal || 'maintain',
        dailyCalories: profile?.dailyCalories || 2000,
        dailyProtein: profile?.dailyProtein || 150,
        dailyCarbs: profile?.dailyCarbs || 200,
        dailyFat: profile?.dailyFat || 60,
    });

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !uploadProfilePic) return;
        setUploadingPhoto(true);
        try {
            await uploadProfilePic(file);
        } catch (err) {
            console.error('Photo upload error:', err);
        }
        setUploadingPhoto(false);
    };

    const handleSave = async () => {
        if (updateData) {
            await updateData('add', 'profile', {
                weight: parseFloat(editData.weight) || null,
                height: parseFloat(editData.height) || null,
                goal: editData.goal,
                dailyCalories: parseInt(editData.dailyCalories) || 2000,
                dailyProtein: parseInt(editData.dailyProtein) || 150,
                dailyCarbs: parseInt(editData.dailyCarbs) || 200,
                dailyFat: parseInt(editData.dailyFat) || 60,
            });
        }
        setIsEditing(false);
    };

    const dailyCalories = isEditing ? editData.dailyCalories : (profile?.dailyCalories || 2000);
    const dailyProtein = isEditing ? editData.dailyProtein : (profile?.dailyProtein || 150);
    const dailyCarbs = isEditing ? editData.dailyCarbs : (profile?.dailyCarbs || 200);
    const dailyFat = isEditing ? editData.dailyFat : (profile?.dailyFat || 60);

    const goals = ['cut', 'maintain', 'bulk'];

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
            <div
                className="w-full max-w-sm rounded-3xl relative overflow-hidden max-h-[90vh] overflow-y-auto"
                style={{
                    background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7)',
                }}
            >
                <div className="p-6">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-20">
                        <X size={20} />
                    </button>

                    {/* Profile Photo */}
                    <div className="flex flex-col items-center mb-6">
                        <button onClick={() => fileInputRef.current?.click()} className="relative group mb-3">
                            <div
                                className="w-20 h-20 rounded-2xl overflow-hidden"
                                style={{
                                    border: '2px solid rgba(220, 38, 38, 0.6)',
                                    boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3)',
                                }}
                            >
                                {uploadingPhoto ? (
                                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : userPhoto ? (
                                    <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                        <Camera size={24} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-red-600">
                                <Camera size={12} className="text-white" />
                            </div>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                        <h3 className="text-lg font-black italic text-white uppercase">{user?.displayName || 'Athlete'}</h3>
                        <p className="text-[11px] text-gray-500">{user?.email}</p>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Weight (kg)</label>
                                    <input
                                        type="number"
                                        value={editData.weight}
                                        onChange={e => setEditData({ ...editData, weight: e.target.value })}
                                        className="w-full bg-gray-900/50 p-2.5 rounded-xl text-white text-sm border border-white/5 focus:border-red-500 outline-none text-center"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Height (cm)</label>
                                    <input
                                        type="number"
                                        value={editData.height}
                                        onChange={e => setEditData({ ...editData, height: e.target.value })}
                                        className="w-full bg-gray-900/50 p-2.5 rounded-xl text-white text-sm border border-white/5 focus:border-red-500 outline-none text-center"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Protocol</label>
                                <div className="flex gap-2">
                                    {goals.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setEditData({ ...editData, goal: g })}
                                            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg border transition-all ${editData.goal === g
                                                ? 'bg-red-600 border-red-500 text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400'
                                                }`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Target Calories</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={editData.dailyCalories}
                                        onChange={e => setEditData({ ...editData, dailyCalories: e.target.value })}
                                        className="w-full bg-gray-900/50 p-2.5 rounded-xl text-white text-sm border border-white/5 focus:border-red-500 outline-none pr-12 font-black"
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-gray-500 font-bold uppercase">Kcal</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { k: 'dailyProtein', l: 'Pro' },
                                    { k: 'dailyCarbs', l: 'Carb' },
                                    { k: 'dailyFat', l: 'Fat' }
                                ].map(({ k, l }) => (
                                    <div key={k} className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">{l}</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={editData[k]}
                                                onChange={e => setEditData({ ...editData, [k]: e.target.value })}
                                                className="w-full bg-gray-900/50 p-2 rounded-xl text-white text-sm border border-white/5 focus:border-red-500 outline-none text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button onClick={() => setIsEditing(false)} variant="ghost" className="flex-1 !bg-white/5">Cancel</Button>
                                <Button onClick={handleSave} className="flex-1">Save Profile</Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Stats Preview */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5">
                                    <span className="text-2xl font-black text-white">{profile?.weight || '--'}</span>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Weight kg</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-4 flex flex-col items-center justify-center border border-white/5">
                                    <span className="text-2xl font-black text-white">{profile?.height || '--'}</span>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">Height cm</span>
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Daily Protocol</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${profile?.goal === 'cut' ? 'bg-red-500/20 text-red-400' :
                                            profile?.goal === 'bulk' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-green-500/20 text-green-400'
                                        }`}>
                                        {profile?.goal || 'Maintain'}
                                    </span>
                                </div>

                                <div className="flex items-end gap-1 mb-4">
                                    <span className="text-4xl font-black italic text-white leading-none">{dailyCalories}</span>
                                    <span className="text-sm text-gray-500 font-bold uppercase pb-1">Kcal</span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                                        <span className="block text-xs text-amber-400 font-bold">{dailyProtein}g</span>
                                        <span className="text-[9px] text-gray-500 uppercase">Protein</span>
                                    </div>
                                    <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                                        <span className="block text-xs text-yellow-400 font-bold">{dailyCarbs}g</span>
                                        <span className="text-[9px] text-gray-500 uppercase">Carbs</span>
                                    </div>
                                    <div className="bg-gray-900/50 rounded-xl p-2 text-center">
                                        <span className="block text-xs text-pink-400 font-bold">{dailyFat}g</span>
                                        <span className="text-[9px] text-gray-500 uppercase">Fat</span>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={() => setIsEditing(true)} className="w-full">
                                Edit Protocol
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
