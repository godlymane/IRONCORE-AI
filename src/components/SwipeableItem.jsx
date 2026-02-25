/**
 * SwipeableItem — Native-feel swipe gesture wrapper using Framer Motion.
 * Swipe left to delete, right to complete.
 */
import { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { hapticLight, hapticWarning } from '../utils/haptics';

const SWIPE_THRESHOLD = 50;
const MAX_DRAG = 120;

export default function SwipeableItem({
    children,
    onDelete,
    onComplete,
    deleteLabel = 'Delete',
    completeLabel = 'Done',
    disabled = false
}) {
    const [isRemoving, setIsRemoving] = useState(false);
    const x = useMotionValue(0);

    // Background opacity based on drag distance
    const deleteOpacity = useTransform(x, [-MAX_DRAG, -SWIPE_THRESHOLD, 0], [1, 0.5, 0]);
    const completeOpacity = useTransform(x, [0, SWIPE_THRESHOLD, MAX_DRAG], [0, 0.5, 1]);

    const handleDragEnd = async (_, info) => {
        const offset = info.offset.x;

        if (offset < -SWIPE_THRESHOLD && onDelete) {
            await hapticWarning();
            setIsRemoving(true);
            setTimeout(() => onDelete(), 200);
        } else if (offset > SWIPE_THRESHOLD && onComplete) {
            await hapticLight();
            setIsRemoving(true);
            setTimeout(() => onComplete(), 200);
        }
    };

    if (isRemoving) {
        return (
            <motion.div
                initial={{ height: 'auto', opacity: 1 }}
                animate={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
            />
        );
    }

    return (
        <div className="relative overflow-hidden rounded-xl">
            {/* Delete background (left swipe) */}
            <motion.div
                className="absolute inset-0 flex items-center justify-end px-4 bg-red-600 rounded-xl"
                style={{ opacity: deleteOpacity }}
            >
                <span className="text-white font-semibold text-sm">{deleteLabel}</span>
            </motion.div>

            {/* Complete background (right swipe) */}
            <motion.div
                className="absolute inset-0 flex items-center justify-start px-4 bg-emerald-600 rounded-xl"
                style={{ opacity: completeOpacity }}
            >
                <span className="text-white font-semibold text-sm">{completeLabel}</span>
            </motion.div>

            {/* Draggable content */}
            <motion.div
                drag={disabled ? false : 'x'}
                dragConstraints={{ left: -MAX_DRAG, right: MAX_DRAG }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                style={{ x }}
                whileTap={{ cursor: 'grabbing' }}
                className="relative z-10 bg-zinc-900 rounded-xl"
            >
                {children}
            </motion.div>
        </div>
    );
}
