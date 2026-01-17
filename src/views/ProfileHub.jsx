import React, { useState, useRef } from 'react';
import { User, Calendar, Activity, Image as ImageIcon, Camera, Trash2, LogOut } from 'lucide-react';
import { TrackView } from './TrackView';
import { StatsView } from './StatsView';
import { ChronicleView } from './ChronicleView';

export const ProfileHub = ({ 
    profile = {}, 
    progress = [], 
    photos = [], 
    meals = [],
    workouts = [],
    burned = [],
    leaderboard = [],
    deleteEntry,
    uploadProfilePic,
    uploadProgressPhoto,
    onLogout,
    isStorageReady
}) => {
    const [subTab, setSubTab] = useState('overview'); 

    return (
        <div className="space-y-4 pb-24 animate-in fade-in">
            {/* Header with Logout */}
            <div className="flex justify-between items-center px-1">
                <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">My Hub</h2>
                <button 
                    onClick={onLogout} 
                    className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-900/10 px-3 py-1.5 rounded-full border border-red-900/50 hover:bg-red-900/30 transition-colors"
                >
                    <LogOut size={12}/> Sign Out
                </button>
            </div>

            {/* Navigation */}
            <div className="flex p-1 bg-gray-900 rounded-2xl border border-gray-800 mx-1 overflow-x-auto scrollbar-hide">
                <button onClick={() => setSubTab('overview')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${subTab === 'overview' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><User size={14}/> Profile</button>
                <button onClick={() => setSubTab('history')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${subTab === 'history' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><Calendar size={14}/> History</button>
                <button onClick={() => setSubTab('stats')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${subTab === 'stats' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><Activity size={14}/> Stats</button>
                <button onClick={() => setSubTab('gallery')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${subTab === 'gallery' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}><ImageIcon size={14}/> Gallery</button>
            </div>

            {/* Content */}
            <div className="min-h-[60vh]">
                {subTab === 'overview' && <TrackView profile={profile} progress={progress} />}
                {subTab === 'history' && <ChronicleView meals={meals} burned={burned} workouts={workouts} progress={progress} user={{}} deleteEntry={deleteEntry} profile={profile} />}
                {subTab === 'stats' && <StatsView leaderboard={leaderboard} profile={profile} progress={progress} meals={meals} workouts={workouts} />}
                {subTab === 'gallery' && <GalleryView photos={photos} uploadProgressPhoto={uploadProgressPhoto} deleteEntry={deleteEntry} isStorageReady={isStorageReady} />}
            </div>
        </div>
    );
};

const GalleryView = ({ photos, uploadProgressPhoto, deleteEntry, isStorageReady }) => {
    const fileRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            await uploadProgressPhoto(file, "Progress Update");
        } catch (e) {
            console.error("Gallery Upload Error:", e);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black italic text-white uppercase">Transformation Log</h3>
                
                {isStorageReady && (
                    <button onClick={() => !uploading && fileRef.current?.click()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                        <Camera size={16}/> {uploading ? 'Uploading...' : 'Add Photo'}
                    </button>
                )}
                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading}/>
            </div>
            
            {!isStorageReady && <p className="text-xs text-red-400 bg-red-900/10 p-2 rounded border border-red-900/30">Storage not enabled. Cannot upload photos.</p>}

            <div className="grid grid-cols-2 gap-3">
                {photos.length === 0 ? (
                    <div className="col-span-2 text-center py-10 border-2 border-dashed border-gray-800 rounded-3xl">
                        <ImageIcon size={32} className="mx-auto text-gray-600 mb-2"/>
                        <p className="text-gray-500 text-xs">No progress photos yet.</p>
                        <p className="text-gray-600 text-[10px]">Upload one to track your gains.</p>
                    </div>
                ) : (
                    photos.map(photo => (
                        <div key={photo.id} className="relative group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 aspect-[3/4]">
                            <img src={photo.url} alt="Progress" className="w-full h-full object-cover"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                                <p className="text-xs font-bold text-white">{new Date(photo.date).toLocaleDateString()}</p>
                                <p className="text-[10px] text-gray-400 truncate">{photo.note}</p>
                            </div>
                            <button 
                                onClick={() => deleteEntry('photos', photo.id)}
                                className="absolute top-2 right-2 bg-red-500/80 p-1.5 rounded-full text-white"
                            >
                                <Trash2 size={12}/>
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};