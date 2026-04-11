# Form Coach Phase 3: Combo & Effects — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a combo counter system that rewards consecutive good reps, streak fire visual effect on the skeleton, and integrate combo data into the analysis engine output for downstream XP multiplier use.

**Architecture:** Combo tracking lives in the FormAnalysisEngine (data layer). Visual rendering of the combo counter and streak fire lives in FormCanvasRenderer. The engine outputs combo state in its processFrame return object. The renderer reads it and draws accordingly.

**Tech Stack:** Canvas2D for visuals, engine state machine for combo logic

---

### Task 1: Add combo tracking to FormAnalysisEngine

**Files:**
- Modify: `src/utils/formAnalysisEngine.js`

**Step 1: Add combo state to constructor**

In the constructor of `FormAnalysisEngine`, after the line `this._partialRepFlag = false;`, add:

```js
    // Combo tracking
    this.comboCount = 0;          // Consecutive reps with score >= 80
    this.maxCombo = 0;            // Best combo this set
    this.comboJustBroke = false;   // True for one frame when combo breaks
    this.comboJustIncreased = false; // True for one frame when combo grows
    this.COMBO_THRESHOLD = 80;    // Min score to maintain combo
```

**Step 2: Add combo logic in `_completeRep`**

In the `_completeRep` method, AFTER `this.reps.push(repData);` and BEFORE `this.currentRep = null;`, add:

```js
      // Combo tracking
      this.comboJustBroke = false;
      this.comboJustIncreased = false;

      if (repData.score >= this.COMBO_THRESHOLD) {
        this.comboCount++;
        this.comboJustIncreased = true;
        if (this.comboCount > this.maxCombo) {
          this.maxCombo = this.comboCount;
        }
      } else {
        if (this.comboCount > 0) {
          this.comboJustBroke = true;
        }
        this.comboCount = 0;
      }
```

**Step 3: Add combo data to processFrame return object**

In the return object of `processFrame` (around line 541), add these fields:

```js
      comboCount: this.comboCount,
      maxCombo: this.maxCombo,
      comboJustBroke: this.comboJustBroke,
      comboJustIncreased: this.comboJustIncreased,
```

**Step 4: Clear combo flags at start of processFrame**

At the very start of `processFrame` (after `this._partialRepFlag = false;`), add:

```js
    this.comboJustBroke = false;
    this.comboJustIncreased = false;
```

**Step 5: Reset combo in reset()**

In the `reset()` method, add:

```js
    this.comboCount = 0;
    this.maxCombo = 0;
    this.comboJustBroke = false;
    this.comboJustIncreased = false;
```

**Step 6: Add combo to set summary**

Find the `getSetSummary()` method (search for `getSetSummary`). In its return object, add:

```js
      maxCombo: this.maxCombo,
```

**Step 7: Commit**

```bash
git add src/utils/formAnalysisEngine.js
git commit -m "feat: add combo tracking to form analysis engine"
```

---

### Task 2: Add combo counter + streak fire to FormCanvasRenderer

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Add combo animation state to constructor**

In the constructor, after `this.lastFrameTime = Date.now();`, add:

```js
    // Combo
    this.displayedCombo = 0;
    this.comboPulse = 0;          // Pulse on combo increase
    this.comboBreakFlash = 0;     // Flash on combo break
    this.streakParticles = [];    // Fire particles for streak >= 5
```

**Step 2: Add `_drawComboCounter` method**

Add this method to the class (after `_drawPartialRepIndicator`):

```js
  /**
   * Draw combo counter — "3x COMBO" with multiplier glow
   * Shows only when combo >= 2
   */
  _drawComboCounter(ctx, comboCount, w, h) {
    if (comboCount < 2) {
      this.displayedCombo = 0;
      return;
    }

    // Detect combo increase
    if (comboCount > this.displayedCombo) {
      this.comboPulse = 1.0;
      this.displayedCombo = comboCount;
    }

    this.comboPulse *= 0.9;

    const scale = 1 + this.comboPulse * 0.4;
    const x = w / 2;
    const y = 76;

    // Combo color escalates with count
    let color, glowColor;
    if (comboCount >= 10) {
      color = '#f59e0b';       // Gold
      glowColor = 'rgba(245, 158, 11, 0.6)';
    } else if (comboCount >= 5) {
      color = '#a855f7';       // Purple
      glowColor = 'rgba(168, 85, 247, 0.5)';
    } else {
      color = '#3b82f6';       // Blue
      glowColor = 'rgba(59, 130, 246, 0.4)';
    }

    // XP multiplier text
    let multiplier = '1x';
    if (comboCount >= 10) multiplier = '3x';
    else if (comboCount >= 5) multiplier = '2x';
    else if (comboCount >= 3) multiplier = '1.5x';

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);

    // Background pill
    const label = `${comboCount}x COMBO`;
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    const metrics = ctx.measureText(label);
    const pillW = metrics.width + 24;
    const pillH = 28;

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 14);
    ctx.fill();

    // Border glow
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Combo text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);

    // XP multiplier badge (right of pill)
    if (comboCount >= 3) {
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      const mx = x + pillW / 2 + 8;
      const mMetrics = ctx.measureText(multiplier);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(mx - 2, y - 9, mMetrics.width + 8, 18, 4);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.fillText(multiplier, mx + 2, y + 1);
    }

    ctx.restore();
  }

  /**
   * Draw combo break flash — brief red crack effect
   */
  _drawComboBreak(ctx, w, h) {
    if (this.comboBreakFlash <= 0.01) return;

    ctx.save();
    ctx.globalAlpha = this.comboBreakFlash;

    // Red flash at center
    const gradient = ctx.createRadialGradient(w / 2, 76, 0, w / 2, 76, 80);
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.6)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(w / 2 - 80, 76 - 40, 160, 80);

    // "BROKEN" text
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('COMBO BROKEN', w / 2, 100);

    ctx.restore();

    this.comboBreakFlash *= 0.9;
  }
```

**Step 3: Add `_drawStreakFire` method**

Add this method for the fire particle effect along skeleton lines when combo >= 5:

```js
  /**
   * Draw streak fire particles along skeleton lines when combo >= 5
   */
  _drawStreakFire(ctx, keypoints, comboCount, w, h, scaleX, scaleY) {
    if (comboCount < 5) {
      this.streakParticles = [];
      return;
    }

    // Spawn new particles along skeleton connections
    const spawnRate = comboCount >= 10 ? 3 : 1; // More particles at higher combo
    for (let s = 0; s < spawnRate; s++) {
      const connIdx = Math.floor(Math.random() * SKELETON_CONNECTIONS.length);
      const [startIdx, endIdx] = SKELETON_CONNECTIONS[connIdx];
      const start = keypoints[startIdx];
      const end = keypoints[endIdx];
      if (!start || !end || start.score < MIN_CONFIDENCE || end.score < MIN_CONFIDENCE) continue;

      const t = Math.random();
      this.streakParticles.push({
        x: (start.x + (end.x - start.x) * t) * scaleX,
        y: (start.y + (end.y - start.y) * t) * scaleY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 3 - 1, // Float upward
        life: 1.0,
        size: Math.random() * 3 + 2,
      });
    }

    // Update and draw particles
    ctx.save();
    for (let i = this.streakParticles.length - 1; i >= 0; i--) {
      const p = this.streakParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;

      if (p.life <= 0) {
        this.streakParticles.splice(i, 1);
        continue;
      }

      // Color: orange to red as life decreases
      const r = 255;
      const g = Math.floor(165 * p.life); // Orange -> red
      const b = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life * 0.7})`;
      ctx.fill();
    }

    // Cap particles to prevent memory growth
    if (this.streakParticles.length > 100) {
      this.streakParticles = this.streakParticles.slice(-60);
    }

    ctx.restore();
  }
```

**Step 4: Update `drawFrame` to include combo visuals**

In `drawFrame`, AFTER the rep toast draw (step 9, `this._drawRepToast(ctx, w, h);`), add:

```js
    // 9b. Combo counter
    if (analysis.comboCount >= 2) {
      this._drawComboCounter(ctx, analysis.comboCount, w, h);
    }

    // 9c. Combo break flash
    if (analysis.comboJustBroke && this.displayedCombo >= 2) {
      this.comboBreakFlash = 1.0;
      this.displayedCombo = 0;
    }
    this._drawComboBreak(ctx, w, h);

    // 9d. Streak fire particles (combo >= 5)
    if (analysis.comboCount >= 5) {
      this._drawStreakFire(ctx, keypoints, analysis.comboCount, w, h, scaleX, scaleY);
    }
```

**Step 5: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: combo counter, combo break flash, streak fire particles"
```

---

### Task 3: Update rep toast to show combo info

**Files:**
- Modify: `src/utils/formCanvasRenderer.js`

**Step 1: Update `triggerRepToast` to accept combo count**

Modify `triggerRepToast` to accept a second parameter and include combo info:

Change the method signature from:
```js
  triggerRepToast(score) {
```
To:
```js
  triggerRepToast(score, comboCount = 0) {
```

At the end of the method, after `this.edgeGlowIntensity = 1.0;`, add:

```js
    this.activeToast.combo = comboCount;
```

**Step 2: Update the toast call in drawFrame**

In `drawFrame`, find where `triggerRepToast` is called:
```js
        this.triggerRepToast(analysis.score);
```

Change to:
```js
        this.triggerRepToast(analysis.score, analysis.comboCount);
```

**Step 3: Show combo info in toast**

In the `_drawRepToast` method, after the score text line (`ctx.fillText(`Score: ${score}`, x - 12, y + 14);`), add:

```js
    // Combo badge in toast
    if (this.activeToast.combo >= 3) {
      const comboLabel = `${this.activeToast.combo}x`;
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
      ctx.fillText(comboLabel, x - 12, y + 28);
    }
```

**Step 4: Commit**

```bash
git add src/utils/formCanvasRenderer.js
git commit -m "feat: combo info in rep toast"
```

---

### Task 4: Verify build

**Step 1: Run build**

```bash
cd C:/Users/devda/iron-ai
npm run build
```

Expected: Build succeeds.

**Step 2: Verify combo fields in engine output**

```bash
grep -n "comboCount\|maxCombo\|comboJustBroke" src/utils/formAnalysisEngine.js | head -20
```

Expected: Shows combo fields in constructor, processFrame return, reset, and _completeRep.
