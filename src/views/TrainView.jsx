import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WorkoutSkeleton, CardioSkeleton } from '../components/ViewSkeletons';

// Lazy-load both sub-views — they stay in their own chunks
const WorkoutView = React.lazy(() =>
  import('./WorkoutView').then(m => ({ default: m.WorkoutView }))
);
const CardioView = React.lazy(() =>
  import('./CardioView').then(m => ({ default: m.CardioView }))
);

const STORAGE_KEY = 'ironcore_train_subtab';
const TABS = [
  { id: 'lift', label: 'Lift' },
  { id: 'cardio', label: 'Cardio' },
];

export const TrainView = () => {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'cardio' ? 'cardio' : 'lift';
    } catch {
      return 'lift';
    }
  });

  // Persist selection
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, activeSubTab); } catch {}
  }, [activeSubTab]);

  const handleSubTabChange = useCallback((tab) => {
    if (tab !== activeSubTab) setActiveSubTab(tab);
  }, [activeSubTab]);

  // Expose setter so FAB quick actions can switch sub-tab externally
  // (via window event — lightweight, no prop drilling needed)
  useEffect(() => {
    const handler = (e) => {
      const target = e.detail;
      if (target === 'lift' || target === 'cardio') setActiveSubTab(target);
    };
    window.addEventListener('ironcore:train-subtab', handler);
    return () => window.removeEventListener('ironcore:train-subtab', handler);
  }, []);

  const activeIdx = TABS.findIndex(t => t.id === activeSubTab);

  return (
    <div className="flex flex-col min-h-0">
      {/* ── Segmented Control (sticky) ── */}
      <div className="sticky top-0 z-30 pb-3">
        <div
          className="relative flex items-center rounded-2xl p-1 border border-white/[0.06]"
          role="tablist"
          aria-label="Training mode"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Sliding pill indicator */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-[14px] z-0"
            style={{
              width: `calc(50% - 2px)`,
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 2px 12px rgba(220, 38, 38, 0.35)',
            }}
            animate={{ left: activeIdx === 0 ? 4 : 'calc(50% + 0px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />

          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSubTabChange(tab.id)}
              role="tab"
              aria-selected={activeSubTab === tab.id}
              className={`
                relative z-10 flex-1 py-2 text-center text-xs font-black uppercase tracking-widest
                transition-colors duration-200
                ${activeSubTab === tab.id ? 'text-white' : 'text-gray-500'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sub-view content ── */}
      <AnimatePresence mode="wait" initial={false}>
        {activeSubTab === 'lift' ? (
          <motion.div
            key="lift"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <Suspense fallback={<WorkoutSkeleton />}>
              <WorkoutView />
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="cardio"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          >
            <Suspense fallback={<CardioSkeleton />}>
              <CardioView />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
