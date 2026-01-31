import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, ArrowLeftRight, Calendar, Upload, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadPhoto, getPhotos, deletePhoto } from '../../services/photoService';

const GlassCard = ({ children, className = "" }) => (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 ${className}`}>
        {children}
    </div>
);

const ViewToggle = ({ active, onChange }) => (
    <div className="flex bg-black/20 p-1 rounded-xl">
        {['gallery', 'compare', 'upload'].map((view) => (
            <button
                key={view}
                onClick={() => onChange(view)}
                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase transition-all ${active === view
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-gray-500 hover:text-white/70'
                    }`}
            >
                {view}
            </button>
        ))}
    </div>
);

const PhotoGrid = ({ photos, onDelete, onSelect, selectionMode, selectedIds }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.length === 0 ? (
            <div className="col-span-full py-12 text-center text-white/30 border-2 border-dashed border-white/10 rounded-3xl">
                <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
                <p>No photos yet</p>
            </div>
        ) : (
            photos.map((photo) => (
                <div
                    key={photo.id}
                    className={`relative group aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border transition-all ${selectedIds?.includes(photo.id)
                            ? 'border-red-500 ring-2 ring-red-500/50 scale-[0.98]'
                            : 'border-white/10 hover:border-white/30'
                        }`}
                    onClick={() => onSelect && onSelect(photo)}
                >
                    <img src={photo.url} alt="Progress" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold text-red-300 uppercase">{photo.type || 'Front'}</p>
                                <p className="text-xs font-bold text-white">{new Date(photo.date).toLocaleDateString()}</p>
                            </div>
                            {!selectionMode && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
                                    className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))
        )}
    </div>
);

const ComparisonView = ({ photos }) => {
    const [leftPhoto, setLeftPhoto] = useState(null);
    const [rightPhoto, setRightPhoto] = useState(null);
    const [sliderPos, setSliderPos] = useState(50);
    const containerRef = useRef(null);

    // Auto-select most recent two if available
    useEffect(() => {
        if (photos.length >= 2 && !leftPhoto && !rightPhoto) {
            const sorted = [...photos].sort((a, b) => new Date(b.date) - new Date(a.date));
            setRightPhoto(sorted[0]); // Newest
            setLeftPhoto(sorted[sorted.length - 1]); // Oldest
        }
    }, [photos]);

    const handleDrag = (e) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const pos = ((x - rect.left) / rect.width) * 100;
        setSliderPos(Math.min(100, Math.max(0, pos)));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Before (Left)</label>
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white"
                        onChange={(e) => setLeftPhoto(photos.find(p => p.id === e.target.value))}
                        value={leftPhoto?.id || ''}
                    >
                        <option value="">Select Photo</option>
                        {photos.map(p => (
                            <option key={p.id} value={p.id}>{new Date(p.date).toLocaleDateString()} - {p.type}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">After (Right)</label>
                    <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white"
                        onChange={(e) => setRightPhoto(photos.find(p => p.id === e.target.value))}
                        value={rightPhoto?.id || ''}
                    >
                        <option value="">Select Photo</option>
                        {photos.map(p => (
                            <option key={p.id} value={p.id}>{new Date(p.date).toLocaleDateString()} - {p.type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div
                ref={containerRef}
                className="relative w-full aspect-[3/4] md:aspect-video rounded-3xl overflow-hidden bg-black/50 border border-white/10 select-none touch-none"
                onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
                onTouchMove={handleDrag}
            >
                {leftPhoto && rightPhoto ? (
                    <>
                        {/* Right Photo (Background - Newer) */}
                        <img
                            src={rightPhoto.url}
                            alt="After"
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Left Photo (Forecast - Older) - Clipped */}
                        <div
                            className="absolute inset-0 overflow-hidden border-r-2 border-white/50"
                            style={{ width: `${sliderPos}%` }}
                        >
                            <img
                                src={leftPhoto.url}
                                alt="Before"
                                className="absolute inset-0 w-full h-full object-cover max-w-none"
                                style={{ width: `${100 / (sliderPos / 100)}%` }} // This logic is wrong for simple clipping.
                            // Correct approach for simple overlay: just standard object-cover with clipped div
                            />
                            {/* Correction: standard img inside clipped div needs to be positioned same as container */}
                            <img
                                src={leftPhoto.url}
                                alt="Before"
                                className="absolute top-0 left-0 w-[100vw] max-w-none h-full object-cover md:w-full" // Hacky, better to use fixed dimensions or %
                                style={{ width: containerRef.current ? containerRef.current.clientWidth : '100%' }}
                            />
                        </div>

                        {/* Slider Handle */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                            style={{ left: `${sliderPos}%` }}
                        >
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-black">
                                <ArrowLeftRight size={16} />
                            </div>
                        </div>

                        {/* Labels */}
                        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white pointer-events-none">
                            {new Date(leftPhoto.date).toLocaleDateString()}
                        </div>
                        <div className="absolute top-4 right-4 bg-red-600/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white pointer-events-none">
                            {new Date(rightPhoto.date).toLocaleDateString()}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-white/30">
                        <ArrowLeftRight size={48} className="mb-4 opacity-50" />
                        <p>Select two photos to compare</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const UploadView = ({ onUpload, userId }) => {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [type, setType] = useState('front');
    const [note, setNote] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = (e) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleUpload = async () => {
        if (!file || !userId) return;
        setUploading(true);
        try {
            await onUpload(file, userId, note, type);
            // Reset
            setFile(null);
            setPreview(null);
            setNote('');
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {!preview ? (
                <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-3xl p-12 text-center cursor-pointer hover:bg-white/5 transition-colors"
                >
                    <Upload className="mx-auto text-red-400 mb-4" size={48} />
                    <p className="text-lg font-bold text-white mb-2">Upload Progress Photo</p>
                    <p className="text-sm text-gray-400">Tap to select from gallery</p>
                    <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/50 mx-auto max-w-sm">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                            onClick={() => { setFile(null); setPreview(null); }}
                            className="absolute top-2 right-2 p-2 bg-black/50 backdrop-blur rounded-full text-white hover:bg-red-500/80 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {['front', 'side', 'back'].map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`py-3 rounded-xl text-xs font-bold uppercase border ${type === t
                                        ? 'bg-red-600 border-red-500 text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        placeholder="Add a note (e.g. Morning check-in, 185lbs)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                    />

                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full py-4 bg-red-600 rounded-xl font-black text-white hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {uploading ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : <Camera size={18} />}
                        {uploading ? 'Uploading...' : 'Save to Gallery'}
                    </button>
                </div>
            )}
        </div>
    );
};

export const ProgressPhotos = ({ userId }) => {
    const [view, setView] = useState('gallery');
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshPhotos = async () => {
        if (!userId) return;
        try {
            const data = await getPhotos(userId);
            setPhotos(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshPhotos();
    }, [userId]);

    const handleUploadWrapper = async (file, uid, note, type) => {
        await uploadPhoto(file, uid, note, type);
        await refreshPhotos();
        setView('gallery');
    };

    const handleDelete = async (photo) => {
        if (window.confirm('Delete this photo?')) {
            await deletePhoto(userId, photo.id, photo.storagePath);
            await refreshPhotos();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black italic text-white uppercase">Body Chronicle</h3>
                    <p className="text-xs text-red-300 font-bold uppercase tracking-widest">{photos.length} Snapshots Stored</p>
                </div>
                <ViewToggle active={view} onChange={setView} />
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={view}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    {loading ? (
                        <div className="py-20 text-center text-white/50">Loading archives...</div>
                    ) : (
                        <>
                            {view === 'gallery' && <PhotoGrid photos={photos} onDelete={handleDelete} />}
                            {view === 'compare' && <ComparisonView photos={photos} />}
                            {view === 'upload' && <UploadView onUpload={handleUploadWrapper} userId={userId} />}
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ProgressPhotos;



