import React from 'react';
import { motion } from 'framer-motion';

export const PremiumIcon = ({
    src,
    alt,
    size = 'md',
    className = '',
    fallback: FallbackIcon
}) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const containerSize = sizeClasses[size] || sizeClasses.md;

    // Determine type of src
    const isElement = React.isValidElement(src);
    const isComponent = typeof src === 'function';
    const isString = typeof src === 'string';

    return (
        <div className={`relative flex items-center justify-center ${containerSize} ${className}`}>
            {isElement ? (
                // If it's already an element (e.g. <Icon />), clone it to inject className if needed
                React.cloneElement(src, { className: `w-full h-full ${src.props.className || ''}` })
            ) : isComponent ? (
                // If it's a component function (e.g. Icon), render it
                React.createElement(src, { className: "w-full h-full" })
            ) : isString ? (
                /* Image Icon */
                <motion.img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover rounded-xl shadow-lg"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    onError={(e) => {
                        // Hide image on error and let fallback show if exists
                        e.target.style.display = 'none';
                        if (!FallbackIcon) {
                            console.warn(`Failed to load icon: ${src}`);
                        }
                    }}
                />
            ) : null}

            {/* Fallback (rendered behind, visible if image fails or loading) */}
            {FallbackIcon && (
                <div className="absolute inset-0 flex items-center justify-center -z-10 bg-white/5 rounded-xl">
                    <FallbackIcon className="w-1/2 h-1/2 opacity-50" />
                </div>
            )}
        </div>
    );
};
