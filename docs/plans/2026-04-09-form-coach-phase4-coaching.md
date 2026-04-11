# Form Coach Phase 4: Coaching Experience — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the form coach from passive monitoring to active coaching — add a pre-set countdown, phase-aware voice lines, encouragement that scales with fatigue, and contextual cue cards rendered on the canvas.

**Architecture:** Countdown and position check are React state in FormCoach.jsx. Phase-aware voice and encouragement scaling are in FormFeedbackManager. Contextual cue cards are rendered on canvas by FormCanvasRenderer. All changes stay within existing component boundaries.

**Tech Stack:** React state + Canvas2D + Web Speech API (existing speechService)

---

### Task 1: Pre-set countdown in FormCoach.jsx

**Files:**
- Modify: `src/components/FormCoach.jsx`

**Step 1: Add countdown state**

In FormCoach, find the state declarations (around line 46, near `const [isStreaming, setIsStreaming]`). Add:

```js
    const [countdown, setCountdown] = useState(null); // null = not counting, 3/2/1/0
```

**Step 2: Add countdown logic to startCamera**

In the `startCamera` callback, find where it calls `detectPose()` at the end (around line 238). Replace:

```js
                    detectPose();
```

With:

```js
                    // 3-2-1 countdown before detection starts
                    setCountdown(3);
                    setCoachedTip('Get in position!');
                    setTimeout(() => {
                        if (!isMountedRef.current) return;
                        setCountdown(2);
                    }, 1000);
                    setTimeout(() => {
                        if (!isMountedRef.current) return;
                        setCountdown(1);
                    }, 2000);
                    setTimeout(() => {
                        if (!isMountedRef.current) return;
                        setCountdown(0);
                        setCountdown(null);
                        setCoachedTip('Position yourself so your full body is visible');
                        detectPose();
                    }, 3000);
```

**Step 3: Add countdown overlay in JSX**

In the JSX, find the video area. After the `<canvas>` element and before the pose visibility warning, add:

```jsx
                        {/* Countdown overlay */}
                        {countdown !== null && countdown > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="text-7xl font-black text-white animate-ping-slow" style={{
                                        textShadow: '0 0 40px rgba(220, 38, 38, 0.8), 0 0 80px rgba(220, 38, 38, 0.4)',
                                    }}>
                                        {countdown}
                                    </div>
                                    <p className="text-white/70 text-sm font-medium tracking-wider uppercase">Get Ready</p>
                                </div>
                            </div>
                        )}
```

**Step 4: Commit**

```bash
git add src/components/FormCoach.jsx
git commit -m "feat: 3-2-1 countdown before detection starts"
```

---

### Task 2: Phase-aware voice lines in FormFeedbackManager

**Files:**
- Modify: `src/utils/formFeedbackManager.js`
- Modify: `src/utils/speechService.js`

**Step 1: Add phase-aware voice cues to FORM_CUES in speechService.js**

In `src/utils/speechService.js`, find the `FORM_CUES` object. Add these new entries at the end (before the closing `}`):

```js
    // Phase-aware coaching
    PHASE_ECCENTRIC_1: 'Slow and controlled.',
    PHASE_ECCENTRIC_2: 'Keep the tension.',
    PHASE_ECCENTRIC_3: 'Nice and steady.',
    PHASE_BOTTOM_1: 'Hold.',
    PHASE_BOTTOM_2: 'Chest up.',
    PHASE_BOTTOM_3: 'Brace hard.',
    PHASE_CONCENTRIC_1: 'Drive up!',
    PHASE_CONCENTRIC_2: 'Explode!',
    PHASE_CONCENTRIC_3: 'Push through!',
    PHASE_LOCKOUT_1: 'Squeeze at the top.',
    PHASE_LOCKOUT_2: 'Lock it out.',

    // Fatigue-aware coaching
    FATIGUE_STAY_TIGHT: 'Last few reps. Stay tight.',
    FATIGUE_DONT_SLIP: "Don't let form slip.",
    FATIGUE_ALMOST_DONE: 'Almost done. Finish strong.',

    // Encouragement scaling
    EARLY_SET_PRAISE: 'Great start. Keep it up.',
    MID_SET_PRAISE: 'Looking strong.',
    COMBO_PRAISE: 'On fire! Keep the combo going.',
```

**Step 2: Add phase-aware coaching and encouragement scaling to FormFeedbackManager**

In `src/utils/formFeedbackManager.js`, make these changes:

**Add state to constructor (after `this.lastFatigueWarning = 0;`):**

```js
    // Phase-aware coaching
    this.lastPhaseVoiceTime = 0;
    this.PHASE_VOICE_INTERVAL = 8000; // Min 8s between phase cues

    // Encouragement scaling
    this.encouragementMode = 'early'; // 'early' | 'mid' | 'late'
```

**Replace the `_onPhaseChange` method entirely with:**

```js
  /**
   * Handle phase change — haptic + phase-aware voice coaching
   */
  _onPhaseChange(phase) {
    if (this.hapticsEnabled) {
      if (phase === PHASE.BOTTOM) {
        hapticLight();
      } else if (phase === PHASE.LOCKOUT) {
        hapticLight();
      }
    }

    // Phase-aware voice (throttled)
    const now = Date.now();
    if (!this.voiceEnabled || now - this.lastPhaseVoiceTime < this.PHASE_VOICE_INTERVAL) return;

    const phaseCues = {
      [PHASE.ECCENTRIC]: ['PHASE_ECCENTRIC_1', 'PHASE_ECCENTRIC_2', 'PHASE_ECCENTRIC_3'],
      [PHASE.BOTTOM]: ['PHASE_BOTTOM_1', 'PHASE_BOTTOM_2', 'PHASE_BOTTOM_3'],
      [PHASE.CONCENTRIC]: ['PHASE_CONCENTRIC_1', 'PHASE_CONCENTRIC_2', 'PHASE_CONCENTRIC_3'],
      [PHASE.LOCKOUT]: ['PHASE_LOCKOUT_1', 'PHASE_LOCKOUT_2'],
    };

    const cues = phaseCues[phase];
    if (cues) {
      const cue = cues[Math.floor(Math.random() * cues.length)];
      speakFormCue(FORM_CUES[cue]);
      this.lastPhaseVoiceTime = now;
    }
  }
```

**Replace the fatigue warning section (step 6 in processFrame) with encouragement scaling:**

Find:
```js
    // 6. Fatigue warning
    if (analysis.fatigueIndex > 0.5 && now - this.lastFatigueWarning > 15000) {
      this._triggerCue('FATIGUE_WARNING', 'warning', now);
      this.lastFatigueWarning = now;
    }
```

Replace with:
```js
    // 6. Fatigue-aware coaching (shifts tone as set progresses)
    if (analysis.repCount <= 3) {
      this.encouragementMode = 'early';
    } else if (analysis.fatigueIndex > 0.5) {
      this.encouragementMode = 'late';
    } else {
      this.encouragementMode = 'mid';
    }

    if (analysis.fatigueIndex > 0.5 && now - this.lastFatigueWarning > 12000) {
      const fatigueCues = ['FATIGUE_STAY_TIGHT', 'FATIGUE_DONT_SLIP', 'FATIGUE_ALMOST_DONE'];
      const cue = fatigueCues[Math.floor(Math.random() * fatigueCues.length)];
      this._triggerCue(cue, 'warning', now);
      this.lastFatigueWarning = now;
    }
```

**Update `_onRepComplete` with encouragement scaling:**

Replace the `_onRepComplete` method entirely with:

```js
  /**
   * Handle rep completion — haptic + contextual voice
   */
  _onRepComplete(repCount, score) {
    if (this.hapticsEnabled) {
      if (score >= 85) {
        hapticSuccess();
      } else if (score >= 60) {
        hapticMedium();
      } else {
        hapticHeavy();
      }
    }

    if (this.voiceEnabled) {
      if (score >= 90) {
        // More praise in early reps, more focused later
        if (this.encouragementMode === 'early') {
          const praise = ['Perfect rep.', 'Textbook.', 'Great start.'][repCount % 3];
          speakFormCue(`${repCount}. ${praise}`);
        } else if (this.encouragementMode === 'late') {
          speakFormCue(`${repCount}. Strong. Keep going.`);
        } else {
          const praise = ['Clean.', 'Money rep.', 'Solid.'][repCount % 3];
          speakFormCue(`${repCount}. ${praise}`);
        }
      } else if (score >= 75) {
        speakFormCue(`${repCount}. Solid.`);
      } else if (score >= 60) {
        if (this.encouragementMode === 'late') {
          speakFormCue(`${repCount}. Tighten up. Almost there.`);
        } else {
          speakFormCue(`${repCount}. Tighten up.`);
        }
      } else {
        speakFormCue(`${repCount}. Fix your form.`);
      }
    }
  }
```

**Add to reset():**

```js
    this.lastPhaseVoiceTime = 0;
    this.encouragementMode = 'early';
```

**Step 3: Commit**

```bash
git add src/utils/formFeedbackManager.js src/utils/speechService.js
git commit -m "feat: phase-aware voice coaching, fatigue-aware encouragement scaling"
```

---

### Task 3: Contextual cue cards on canvas

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Add cue card state to constructor**

In the constructor, after the combo state, add:

```js
    // Cue card
    this.activeCueCard = null; // { text, jointIdx, startTime }
    this.CUE_CARD_DURATION = 2500;
```

**Step 2: Add `triggerCueCard` and `_drawCueCard` methods**

Add these methods to the class:

```js
  /**
   * Trigger a contextual cue card near a specific joint
   * @param {string} text - Short instruction ("Push knees out")
   * @param {number} jointIdx - Keypoint index to anchor the card near
   */
  triggerCueCard(text, jointIdx) {
    // Don't override existing card
    if (this.activeCueCard && Date.now() - this.activeCueCard.startTime < 1000) return;

    this.activeCueCard = {
      text,
      jointIdx,
      startTime: Date.now(),
    };
  }

  /**
   * Draw contextual cue card — anchored near a joint with an arrow
   */
  _drawCueCard(ctx, keypoints, w, h, scaleX, scaleY) {
    if (!this.activeCueCard) return;

    const elapsed = Date.now() - this.activeCueCard.startTime;
    if (elapsed > this.CUE_CARD_DURATION) {
      this.activeCueCard = null;
      return;
    }

    const { text, jointIdx } = this.activeCueCard;
    const kp = keypoints[jointIdx];
    if (!kp || kp.score < MIN_CONFIDENCE) return;

    const progress = elapsed / this.CUE_CARD_DURATION;

    // Fade in (0-0.1), hold (0.1-0.7), fade out (0.7-1.0)
    let alpha = 1;
    if (progress < 0.1) {
      alpha = progress / 0.1;
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    }

    const jx = kp.x * scaleX;
    const jy = kp.y * scaleY;

    // Card position: offset to the right and slightly above the joint
    const cardX = Math.min(jx + 30, w - 130);
    const cardY = Math.max(jy - 20, 20);

    ctx.save();
    ctx.globalAlpha = alpha;

    // Card background
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(text);
    const cardW = metrics.width + 16;
    const cardH = 24;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 6);
    ctx.fill();

    // Left accent
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cardX, cardY + 4, 3, cardH - 8);

    // Arrow line from card to joint
    ctx.beginPath();
    ctx.moveTo(cardX, cardY + cardH / 2);
    ctx.lineTo(jx + 8, jy);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow dot at joint
    ctx.beginPath();
    ctx.arc(jx, jy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.fill();

    // Text
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cardX + 8, cardY + 16);

    ctx.restore();
  }
```

**Step 3: Add cue card drawing to drawFrame**

In `drawFrame`, after the streak fire particles section (step 9d), add:

```js
    // 9e. Contextual cue card
    this._drawCueCard(ctx, keypoints, w, h, scaleX, scaleY);
```

**Step 4: Wire up cue cards from FormFeedbackManager**

This requires FormCoach.jsx to connect the feedback manager's injury/form triggers to the renderer's cue card system. In `src/components/FormCoach.jsx`, find where the feedback manager processes a frame (search for `feedbackMgrRef.current?.processFrame`). After that call, add:

```js
                        // Trigger cue cards for active issues
                        if (analysis.injuryFlags.length > 0 && rendererRef.current) {
                            const flag = analysis.injuryFlags[0]; // Show most urgent
                            const jointName = flag.joints?.[0];
                            const JOINT_TO_KP_IDX = {
                                knee: 13, hip: 11, shoulder: 5, wrist: 9, elbow: 7, ankle: 15,
                                left_knee: 13, right_knee: 14, left_hip: 11, right_hip: 12,
                                left_shoulder: 5, right_shoulder: 6, left_wrist: 9, right_wrist: 10,
                                left_elbow: 7, right_elbow: 8, left_ankle: 15, right_ankle: 16,
                            };
                            const kpIdx = JOINT_TO_KP_IDX[jointName];
                            if (kpIdx !== undefined && flag.name) {
                                rendererRef.current.triggerCueCard(flag.name, kpIdx);
                            }
                        }
```

**Step 5: Commit**

```bash
git add src/utils/formCanvasRenderer.js src/components/FormCoach.jsx
git commit -m "feat: contextual cue cards anchored to joints with arrows"
```

---

### Task 4: Verify build

**Step 1: Run build**

```bash
cd C:/Users/devda/iron-ai
npm run build
```

Expected: Build succeeds.
