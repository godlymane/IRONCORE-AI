# Flagship Form Coach — Design Doc

**Date**: 2026-04-09
**Goal**: Transform the form correction feature from a dev-tool-quality overlay into a flagship gaming-HUD coach that drives subscriptions and engagement.
**Aesthetic**: Gaming HUD — neon glows, combo counters, XP integration. Matches the competitive fitness identity of IronCore.

---

## Section 1: Visual Overhaul

### Skeleton Rendering
- Neon glow lines: double-pass rendering (wide blurred glow underneath, thin sharp stroke on top)
- Phase colors with glow: blue (eccentric), amber (bottom), green (concentric), purple (lockout)
- Animated keypoint nodes: diamond joints, circle extremities, pulse on phase transitions
- Confidence fade: low-confidence segments draw dashed/dim instead of disappearing

### HUD Elements
- **Rep counter** — Large, bold, center-top. Scale bounce + flash animation on each rep.
- **Score ring** — Animated arc that fills 0-100. Color shifts green/amber/red. Pulses on rep complete.
- **Combo counter** — Consecutive reps with score >= 80 build combo. "3x COMBO" with multiplier glow. Visual crack on break.
- **Phase banner** — Bottom-center, animated slide-in/out. Phase name + color background + blur.
- **Rep toast** — Slides in from right on rep complete. Score + verdict ("PERFECT" / "SOLID" / "FIX FORM"). Fades after 1.5s.

### Effects
- Rep complete flash: brief screen-edge glow (green >= 85, amber >= 65, red < 65)
- Streak fire: after 5+ combo, subtle flame particles along skeleton lines
- Injury pulse: red vignette at screen edges when danger flag active

### Files to Modify/Create
- Rewrite: `src/utils/formCanvasRenderer.js` — full rendering overhaul
- Create: `src/utils/formHUDEffects.js` — combo, streak fire, edge glow, rep toast effects

---

## Section 2: Accuracy & Feel

### Skeleton Smoothing
- Replace EMA (alpha 0.3) with one-euro filter — adaptive, fast response on movement, stable on holds
- Per-keypoint filter instances — fast-moving wrists get less smoothing, stable hips get more

### Scoring Calibration
- Change checkpoint scoring from binary (pass=1.0, fail=0.5) to gradient (0.0-1.0 based on distance from threshold)
- A rep with all checkpoints failing should score near 0, not 50
- Recalibrate score bands: 90-100 PERFECT, 75-89 SOLID, 60-74 OKAY, <60 FIX FORM

### Rep Counting
- Minimum rep duration: 0.8 seconds (reject jitter ghost reps)
- Phase lockout timer: must hold each phase for 3+ frames before transitioning
- Partial rep detection: started lowering but didn't hit BOTTOM = show "PARTIAL" toast, don't count

### Side Detection
- Sticky side: once picked, don't switch unless confidence difference > 0.15 for 10+ consecutive frames

### Files to Modify
- Modify: `src/utils/formAnalysisEngine.js` — one-euro filter, scoring calibration, rep timing, sticky side
- Create: `src/utils/oneEuroFilter.js` — reusable one-euro filter implementation

---

## Section 3: Coaching Experience

### Pre-Set
- 3-2-1 animated countdown before detection starts
- Position check: green body silhouette outline to stand in. "Step back" / "Move left" guidance.

### In-Set Coaching
- Contextual cue cards: visual card with arrow pointing at problem joint + fix text. Slides in, holds 2s, out. Max 1 at a time.
- Phase-aware voice lines:
  - ECCENTRIC: "Slow and controlled" / "Keep tension"
  - BOTTOM: "Hold... hold..." / "Chest up"  
  - CONCENTRIC: "Drive up!" / "Explode!"
  - LOCKOUT: "Squeeze at the top"
- Encouragement scaling: more praise early (reps 1-3), more corrective when fatigue hits
- Fatigue awareness: when fatigueIndex > 0.5, tone shifts to "Last few reps, stay tight"

### Post-Set Summary
- Rep-by-rep scorecard: visual bar chart, tap any rep to see issues, best rep highlighted gold
- Set grade: A/B/C/D/F factoring in consistency (score variance), not just average
- XP popup: "+120 XP" with combo bonus. Ties into league/leveling.
- "Share Rep" button: screenshot-ready card of best rep score + skeleton overlay

### Combo & Gamification
- Combo -> XP multiplier: 3x combo = 1.5x XP, 5x = 2x, 10x = 3x
- Personal best tracking: "NEW PR: Best squat score (94)" toast
- Session streak badge on post-set summary

### Files to Modify/Create
- Modify: `src/components/FormCoach.jsx` — countdown, position check, cue cards, post-set summary UI
- Modify: `src/utils/formFeedbackManager.js` — phase-aware voice, encouragement scaling, fatigue tone
- Create: `src/components/FormCoachHUD.jsx` — extracted HUD overlay component (combo, score ring, rep toast, cue cards)
- Create: `src/components/PostSetSummary.jsx` — rep scorecard, set grade, XP popup, share card
- Modify: `src/utils/formAnalysisEngine.js` — combo tracking, personal best detection, XP calculation

---

## Implementation Phases

### Phase 1: Accuracy & Smoothing (Session 1)
- One-euro filter
- Scoring calibration (gradient scoring, band recalibration)
- Rep counting fixes (min duration, phase lockout, partial rep detection)
- Sticky side detection

### Phase 2: Visual Overhaul (Session 2)
- Neon glow skeleton rendering
- Score ring, rep counter animation, phase banner
- Rep toast on completion
- Confidence fade for low-confidence keypoints

### Phase 3: Combo & Effects (Session 3)
- Combo counter system
- Edge glow on rep complete
- Streak fire particles
- Injury vignette

### Phase 4: Coaching Experience (Session 4)
- Pre-set countdown + position check
- Contextual cue cards with joint arrows
- Phase-aware voice lines
- Encouragement scaling + fatigue awareness

### Phase 5: Post-Set & Integration (Session 5)
- Post-set summary (rep scorecard, set grade)
- XP integration with combo multiplier
- Personal best detection
- Share card generation
