# Form Coach Phase 5: Post-Set & Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the post-set summary with a letter grade, XP earned with combo multiplier, best rep highlighted in gold, combo stats, and a screenshot-ready share card.

**Architecture:** Enhance existing `FormSessionSummary.jsx` component. Add XP calculation helper. Add set grade algorithm. Share card uses `html-to-image` (already in package.json) to generate a shareable PNG.

**Tech Stack:** React, Framer Motion, html-to-image (existing dep), Tailwind CSS

---

### Task 1: Add set grade + XP calculation to getSessionSummary

**Files:**
- Modify: `src/utils/formAnalysisEngine.js`

**Step 1: Add set grade and XP to getSessionSummary return**

In `getSessionSummary()`, find the return object (around line 969). Before the `return {` statement, add the grade and XP calculations:

```js
    // Set grade (factors in avg score + consistency)
    const scoreVariance = scores.length > 1
      ? scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length
      : 0;
    const consistency = Math.max(0, 100 - Math.sqrt(scoreVariance)); // 0-100, higher = more consistent
    const gradeScore = avgScore * 0.7 + consistency * 0.3; // 70% form, 30% consistency
    const grade = gradeScore >= 90 ? 'A' : gradeScore >= 80 ? 'B' : gradeScore >= 70 ? 'C' : gradeScore >= 55 ? 'D' : 'F';

    // XP earned (base + combo bonus)
    const baseXP = totalReps * 10 + Math.round(avgScore / 10) * totalReps;
    const comboMultiplier = this.maxCombo >= 10 ? 3 : this.maxCombo >= 5 ? 2 : this.maxCombo >= 3 ? 1.5 : 1;
    const totalXP = Math.round(baseXP * comboMultiplier);
```

Then add these fields to the return object:

```js
      grade,
      gradeScore: Math.round(gradeScore),
      consistency: Math.round(consistency),
      xp: {
        base: baseXP,
        comboMultiplier,
        total: totalXP,
      },
```

**Step 2: Commit**

```bash
git add src/utils/formAnalysisEngine.js
git commit -m "feat: add set grade and XP calculation to session summary"
```

---

### Task 2: Upgrade FormSessionSummary with grade, XP, combo, and gold best rep

**Files:**
- Modify: `src/components/FormSessionSummary.jsx`

**Step 1: Update the destructured fields**

Find the line (around line 34):
```js
    const { exerciseName, totalReps, avgScore, bestRep, worstRep, tempo, rom, fatigueIndex, injuryFlags, scoreTrend, reps } = summary;
```

Replace with:
```js
    const { exerciseName, totalReps, avgScore, bestRep, worstRep, tempo, rom, fatigueIndex, injuryFlags, scoreTrend, reps, grade, consistency, maxCombo, xp } = summary;
```

**Step 2: Add grade colors**

After the `fatigueColor` line (around line 37), add:

```js
    const gradeColor = grade === 'A' ? 'text-green-400' : grade === 'B' ? 'text-blue-400' : grade === 'C' ? 'text-yellow-400' : grade === 'D' ? 'text-orange-400' : 'text-red-400';
    const gradeBg = grade === 'A' ? 'from-green-500/20 border-green-500/30' : grade === 'B' ? 'from-blue-500/20 border-blue-500/30' : grade === 'C' ? 'from-yellow-500/20 border-yellow-500/30' : grade === 'D' ? 'from-orange-500/20 border-orange-500/30' : 'from-red-500/20 border-red-500/30';
```

**Step 3: Replace the header section**

Find the header block (around lines 79-87, the `{/* Header */}` comment through the close button). Replace with:

```jsx
                {/* Header — Grade + Title */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {grade && (
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-b ${gradeBg} border flex items-center justify-center`}>
                                <span className={`text-3xl font-black ${gradeColor}`}>{grade}</span>
                            </div>
                        )}
                        <div>
                            <h2 className="text-white font-black text-lg">Set Complete</h2>
                            <p className="text-gray-500 text-xs">{exerciseName} — {totalReps} reps</p>
                            {consistency > 0 && (
                                <p className="text-gray-600 text-[10px]">{consistency}% consistency</p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                        <X size={16} />
                    </button>
                </div>
```

**Step 4: Add XP + Combo section after the stats grid**

After the stats grid (the `{/* Score + Stats Row */}` section ending around line 103), add:

```jsx
                {/* XP Earned + Combo */}
                {xp && (
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-amber-500/10 border border-purple-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-amber-400" />
                                    <span className="text-white font-black text-xl">+{xp.total} XP</span>
                                </div>
                                {xp.comboMultiplier > 1 && (
                                    <p className="text-purple-400 text-[11px] font-bold mt-0.5">
                                        {xp.comboMultiplier}x combo bonus (base: {xp.base} XP)
                                    </p>
                                )}
                            </div>
                            {maxCombo >= 2 && (
                                <div className="text-center">
                                    <div className="text-lg font-black text-purple-400">{maxCombo}x</div>
                                    <div className="text-[9px] text-gray-500 uppercase font-bold">Max Combo</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
```

**Step 5: Highlight best rep in gold in per-rep breakdown**

In the per-rep breakdown section (around line 165), find the `reps.map` callback. Change the rep number display to highlight the best rep. Replace:

```jsx
                                    <span className="text-gray-500 w-6">#{rep.number}</span>
```

With:

```jsx
                                    <span className={`w-6 font-bold ${bestRep && rep.number === bestRep.number ? 'text-amber-400' : 'text-gray-500'}`}>
                                        {bestRep && rep.number === bestRep.number ? '★' : '#'}{rep.number}
                                    </span>
```

**Step 6: Commit**

```bash
git add src/components/FormSessionSummary.jsx
git commit -m "feat: set grade, XP with combo multiplier, gold best rep in post-set summary"
```

---

### Task 3: Add share card generation

**Files:**
- Modify: `src/components/FormSessionSummary.jsx`

**Step 1: Add import for html-to-image and share**

At the top of the file, add:

```js
import { toPng } from 'html-to-image';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share as ShareIcon, Download } from 'lucide-react';
```

Note: `Share` and `Download` icons — check if `ShareIcon` conflicts with the Capacitor Share import. If so, alias the lucide one differently. The Capacitor `Share` is for native sharing, the lucide `Share` is an icon.

Actually, simpler approach — just add the lucide icons:

Add `Share2` and `Download` to the existing lucide import:

Find:
```js
import { X, TrendingDown, TrendingUp, AlertTriangle, Zap, Brain } from 'lucide-react';
```

Replace with:
```js
import { X, TrendingDown, TrendingUp, AlertTriangle, Zap, Brain, Share2, Download } from 'lucide-react';
```

Add html-to-image import:
```js
import { toPng } from 'html-to-image';
```

**Step 2: Add share card ref and function**

Inside the component function, after the `loadingAI` state, add:

```js
    const shareCardRef = React.useRef(null);
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        if (!shareCardRef.current) return;
        setSharing(true);
        try {
            const dataUrl = await toPng(shareCardRef.current, {
                backgroundColor: '#111827',
                pixelRatio: 2,
            });

            // Create a download link
            const link = document.createElement('a');
            link.download = `ironcore-${exerciseName}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Share card generation failed:', err);
        }
        setSharing(false);
    };
```

**Step 3: Add share card div (hidden, for screenshot)**

Before the `{/* Close */}` section (the Done button), add:

```jsx
                {/* Share Card (screenshot target) */}
                <div ref={shareCardRef} className="mb-4 p-4 rounded-2xl bg-gray-900 border border-white/10" style={{ display: 'block' }}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-b ${gradeBg} border flex items-center justify-center`}>
                            <span className={`text-2xl font-black ${gradeColor}`}>{grade || '-'}</span>
                        </div>
                        <div>
                            <p className="text-white font-black text-sm">{exerciseName}</p>
                            <p className="text-gray-500 text-[11px]">{totalReps} reps — Score: {avgScore}/100</p>
                        </div>
                    </div>
                    {xp && (
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={14} className="text-amber-400" />
                            <span className="text-amber-400 font-bold text-sm">+{xp.total} XP</span>
                            {maxCombo >= 2 && <span className="text-purple-400 text-xs font-bold ml-2">{maxCombo}x max combo</span>}
                        </div>
                    )}
                    {scoreTrend.length > 2 && (
                        <svg viewBox="0 0 200 30" className="w-full h-8 mb-2">
                            <path d={buildSparkline(scoreTrend, 200, 30).line} fill="none" stroke={avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#eab308' : '#ef4444'} strokeWidth="2" />
                        </svg>
                    )}
                    <p className="text-gray-600 text-[9px] text-center">IronCore AI — Your Phone. Your Trainer.</p>
                </div>

                {/* Share Button */}
                <Button onClick={handleShare} variant="secondary" className="w-full mb-3" disabled={sharing}>
                    <Share2 className="w-4 h-4 mr-2" />
                    {sharing ? 'Generating...' : 'Share Rep Card'}
                </Button>
```

**Step 4: Commit**

```bash
git add src/components/FormSessionSummary.jsx
git commit -m "feat: share card generation for post-set summary"
```

---

### Task 4: Verify build

**Step 1: Run build**

```bash
cd C:/Users/devda/iron-ai
npm run build
```

Expected: Build succeeds.
