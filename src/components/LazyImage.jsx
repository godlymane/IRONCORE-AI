import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ImageOff } from 'lucide-react';

/**
 * Lazy loading image component with placeholder and error handling
 */
export const LazyImage = ({
    src,
    alt = '',
    className = '',
    placeholderColor = 'bg-white/5',
    onLoad,
    onError
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        onError?.();
    };

    return (
        <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
            {/* Placeholder */}
            {!isLoaded && !hasError && (
                <div className={`absolute inset-0 ${placeholderColor} animate-pulse`} />
            )}

            {/* Error state */}
            {hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5">
                    <ImageOff size={24} className="text-white/30" />
                </div>
            )}

            {/* Actual image */}
            {isInView && !hasError && (
                <motion.img
                    src={src}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isLoaded ? 1 : 0 }}
                />
            )}
        </div>
    );
};

/**
 * Avatar with lazy loading
 */
export const LazyAvatar = ({ src, name = '', size = 40, className = '' }) => {
    const [hasError, setHasError] = useState(false);

    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (hasError || !src) {
        return (
            <div
                className={`flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-purple-600 text-white font-bold ${className}`}
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {initials || '?'}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className={`rounded-full object-cover ${className}`}
            style={{ width: size, height: size }}
            onError={() => setHasError(true)}
            loading="lazy"
        />
    );
};

/**
 * Progress photo with lazy loading and zoom
 */
export const LazyProgressPhoto = ({
    src,
    date,
    caption,
    onClick,
    className = ''
}) => {
    return (
        <div
            className={`relative rounded-xl overflow-hidden cursor-pointer group ${className}`}
            onClick={onClick}
        >
            <LazyImage
                src={src}
                alt={caption || 'Progress photo'}
                className="w-full h-full"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    {date && (
                        <p className="text-xs text-white/70">{new Date(date).toLocaleDateString()}</p>
                    )}
                    {caption && (
                        <p className="text-sm text-white font-medium line-clamp-2">{caption}</p>
                    )}
                </div>
            </div>

            {/* Zoom indicator */}
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
            </div>
        </div>
    );
};

export default LazyImage;



