# Onboarding + Paywall + Battle Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a high-converting 5-screen onboarding flow, redesign the premium paywall for maximum conversion, and create a 30-tier Battle Pass UI.

**Architecture:** Wraps the existing OnboardingView with new aspirational screens (Welcome, AI Demo, Premium Upsell) while preserving the working TDEE/macro calculator. Paywall becomes full-screen takeover with feature comparison table. Battle Pass is a new view with 30-tier vertical track and free/premium reward columns.

**Tech Stack:** React 19, Framer Motion, Tailwind CSS, Lucide icons, existing PremiumContext + paymentService

---

## Task 1: Onboarding — Rewrite OnboardingView with 5-screen flow

**Files:**
- Modify: `src/views/OnboardingView.jsx`

**Context:**
- Current file has steps: `intro`, `goal`, `bio`, `activity`, `intensity`, `analysis`, `complete`
- Uses `GlassCard`-style inline styling, `SFX` for sounds, `motion` not currently imported
- Exports `OnboardingView` as named export
- Parent passes `{ user, onComplete }` props
- `onComplete(data)` receives the bio-metrics + calculated macros

**Step 1: Restructure the step flow**

The new step flow is: `welcome` -> `goal` -> `aidemo` -> `bio` -> `activity` -> `intensity` -> `analysis` -> `upsell`

Update the `STEPS` array and `step` default:
```jsx
const STEPS = ['welcome', 'goal', 'aidemo', 'bio', 'activity', 'intensity', 'analysis', 'upsell'];
// Initial step changes from 'intro' to 'welcome'
const [step, setStep] = useState('welcome');
```

Progress dots now use 5 logical groups (each group can span multiple internal steps):
```
welcome | goal | aidemo | bio+activity+intensity | upsell
```
Show 5 dots. Dot fills based on which group the current step belongs to.

**Step 2: Build the Welcome screen (replaces old `intro`)**

Full-screen hero with:
- Large IronCore logo area (SVG or styled div with "IC" letters)
- Headline: "YOUR PHONE.\nYOUR TRAINER."
- Subtext: "AI-powered form correction. Personalized nutrition. Competitive leagues."
- Single CTA button: "LET'S GO" -> advances to `goal`
- Animated red pulse orb background (reuse existing orb pattern from current `intro`)
- No data collection, no user photo (remove old photo logic from intro)

**Step 3: Elevate the Goal screen**

Keep the existing goal selection logic but upgrade copy:
- Header: "WHAT DRIVES YOU?" instead of "Primary Objective"
- Larger cards with more emotional descriptions:
  - Lose: "SHRED" — "Strip body fat. Reveal what you've built."
  - Maintain: "RECOMP" — "Optimize performance. Fine-tune your machine."
  - Gain: "BUILD" — "Pack on lean mass. Fuel hypertrophy."
- Same `data.goal` state, same `select('goal', value)` handler

**Step 4: Build the AI Demo screen (NEW)**

No user input. Pure pitch screen.
- Header: "YOUR AI WATCHES EVERY REP"
- Center: CSS-animated phone mockup showing pose detection lines
  - A rounded rectangle (phone frame) with a simple stick figure inside
  - Animated dotted lines connecting joints (shoulders, elbows, knees)
  - Lines pulse/glow red on a loop using CSS keyframes
- Below: 3 small feature pills: "Real-Time Feedback" | "Joint Tracking" | "Form Score"
- CTA: "NEXT" -> advances to `bio`

The animation is pure CSS (no video/gif needed):
```css
@keyframes pose-pulse {
  0%, 100% { opacity: 0.4; stroke-width: 2; }
  50% { opacity: 1; stroke-width: 3; }
}
```

**Step 5: Keep bio/activity/intensity steps as-is**

No changes to these screens. They already work perfectly with the TDEE/macro calculator.

Only change: After `analysis` completes (loadingProgress hits 100), transition to `upsell` instead of `complete`.

Update the analysis useEffect:
```jsx
if (prev >= 100) {
    clearInterval(interval);
    setTimeout(() => setStep('upsell'), 500); // was 'complete'
    return 100;
}
```

**Step 6: Build the Premium Upsell screen (replaces old `complete`)**

Soft paywall — not aggressive:
- Top: Macro summary card (same as old `complete` screen's calorie/macro display)
- Middle: "UNLOCK THE FULL PROTOCOL" headline
- 3 premium benefit cards:
  1. "Unlimited AI Form Correction" with Camera icon
  2. "Full League Access" with Trophy icon
  3. "Advanced Analytics" with BarChart3 icon
- Primary CTA: "START 7-DAY FREE TRIAL" (red gradient button)
  - Calls `onComplete(data)` with an extra `{ trialRequested: true }` flag
- Secondary: "CONTINUE WITH FREE" text button
  - Calls `onComplete(data)` without trial flag

Both paths call `handleComplete()` — the parent handles the premium flow separately.

**Step 7: Verify and commit**

Run: `npm run build` to verify no compile errors.
The app should show the new onboarding when a new user signs in (or clear localStorage `ironai_onboarded_` flag for testing).

```bash
git add src/views/OnboardingView.jsx
git commit -m "feat: 5-screen onboarding with welcome, AI demo, and premium upsell"
```

---

## Task 2: Premium Paywall — Full-screen redesign

**Files:**
- Modify: `src/components/PremiumPaywall.jsx`

**Context:**
- Currently a modal (`AnimatePresence` + `motion.div`) triggered by `showPaywall` from `usePremium()`
- Uses `closePaywall`, `purchasePlan`, `restorePurchase`, `plans` from context
- Current pricing: INR (plans.pro_monthly.priceINR, plans.pro_yearly.priceINR)
- CLAUDE.md pricing: $12.99/mo, $79.99/yr — but paymentService has $3.49/mo and $23.99/yr
- Use the values from `plans` object (don't hardcode) so it stays in sync

**Step 1: Replace the modal with full-screen layout**

Change the container from a centered modal to a full-screen scrollable view:
```jsx
<motion.div className="fixed inset-0 z-[100] bg-black overflow-y-auto">
```

Remove the nested modal card. The entire screen IS the paywall.

**Step 2: Build the header section**

- Animated red gradient orb background (same pattern as onboarding)
- Crown icon in a glowing circle
- "IRONCORE PREMIUM" headline
- "The full protocol. Unlocked." subhead
- Social proof: "Trusted by 12,000+ athletes" (static text)
- Contextual line from `paywallFeature` if present

**Step 3: Build the feature comparison table**

Two-column layout showing Free vs Premium:

| Feature | Free | Premium |
|---------|------|---------|
| AI Form Correction | 3/day | Unlimited |
| Workout History | 7 days | Forever |
| League Access | Basic | Full |
| Progress Photos | 5 total | Unlimited |
| Guild Creation | Join only | Create + Manage |
| Analytics | Basic | Predictive AI |
| Data Export | No | CSV anytime |

Use X (red) for free limitations and Check (green) for premium.

**Step 4: Plan selection cards**

Grid of 2 cards:
- Monthly: `$${plans.pro_monthly.price}/mo` — "Cancel anytime"
- Annual: `$${plans.pro_yearly.price}/yr` — "Best Value" badge + "7-day free trial" badge + calculated monthly savings

Annual is pre-selected. Selected card has red border + red glow.

**Step 5: CTA + trust badges**

- Primary CTA: "START FREE TRIAL" or "SUBSCRIBE NOW" based on plan
- Loading state with spinner
- Trust row: Shield icon + "Cancel anytime" | Lock icon + "Secure payment" | Star icon + "Money-back guarantee"
- Bottom links: "MAYBE LATER" | "RESTORE PURCHASE"

**Step 6: Verify and commit**

```bash
git add src/components/PremiumPaywall.jsx
git commit -m "feat: full-screen premium paywall with feature comparison table"
```

---

## Task 3: Battle Pass — New BattlePassView

**Files:**
- Create: `src/views/BattlePassView.jsx`
- Modify: `src/App.jsx` (add lazy import)

**Context:**
- This is a new view accessible from Arena tab (as a sub-screen) or directly
- Uses `usePremium()` for gating premium track rewards
- All styling follows existing patterns: glass cards, red accent, uppercase headings
- No Firestore integration in this task — just UI with static data

**Step 1: Define the 30 tiers of rewards**

Create a `SEASON_TIERS` array with 30 objects:
```jsx
{ tier: 1, xpRequired: 100, freeReward: {...}, premiumReward: {...} }
```

Reward types: `theme`, `border`, `badge`, `voicePack`, `xpBoost`, `template`

Sample tiers:
- Tier 1: Free: 2x XP Boost (1hr) | Premium: "Crimson Night" Theme
- Tier 5: Free: Basic Steel Border | Premium: Animated Flame Border
- Tier 10: Free: "Iron Recruit" Badge | Premium: "Drill Sergeant" AI Voice
- Tier 15: Free: Push Day Template | Premium: "Midnight Blue" Theme
- Tier 20: Free: 3x XP Boost (1hr) | Premium: Animated Lightning Border
- Tier 25: Free: "Warrior" Badge | Premium: "Zen Master" AI Voice
- Tier 30: Free: "Season Veteran" Badge | Premium: "Gold Rush" Theme + Animated Crown Border

Fill remaining tiers with XP boosts, templates, and minor cosmetics.

**Step 2: Build the header**

- "SEASON 1: IRON RISING" title
- Countdown: "24d 12h remaining" (hardcoded placeholder)
- Current tier badge: "TIER 7" (hardcoded placeholder)
- XP progress bar: e.g. "340 / 500 XP" toward next tier

**Step 3: Build the tier track**

Vertical scrollable list. Each tier row:
```
[Free Reward] --- [Tier Number Circle] --- [Premium Reward]
```
- Left column: Free track reward card (small, always accessible)
- Center: Tier number in a circle, connected by a vertical line to next tier
- Right column: Premium track reward card (locked with padlock for free users)

Visual states:
- **Claimed (past):** Dimmed, checkmark overlay
- **Current:** Red glow, pulsing border
- **Locked (future):** Gray, lock icon on premium side

Each reward card shows: icon (based on reward type) + name + "CLAIM" or "LOCKED" button.

**Step 4: Wire premium gating**

When a free user taps a premium track reward:
```jsx
const { requirePremium } = usePremium();
if (!requirePremium('battlePassTrack')) return; // shows paywall
// else: claim the reward
```

**Step 5: Add to App.jsx**

Add lazy import:
```jsx
const BattlePassView = React.lazy(() => import('./views/BattlePassView').then(m => ({ default: m.BattlePassView })));
```

For now, this view will be launched from within ArenaView (as a modal/overlay or sub-navigation). Add a "SEASON PASS" button in the Arena header that sets a local state to show BattlePassView.

Alternatively, it can be added as a new tab or keep it accessible via a button. The simplest integration: add it as an overlay triggered from ArenaView.

**Step 6: Verify and commit**

```bash
npm run build
git add src/views/BattlePassView.jsx src/App.jsx
git commit -m "feat: 30-tier battle pass UI with free/premium reward tracks"
```

---

## Task 4: Integration testing + final polish

**Step 1:** Clear localStorage onboarding flag and test full flow:
```js
localStorage.removeItem('ironai_onboarded_<uid>');
```
Verify all 5 onboarding screens render and complete without errors.

**Step 2:** Test paywall by setting `DEV_FORCE_PREMIUM = false` in PremiumContext and triggering a premium feature.

**Step 3:** Test Battle Pass renders from Arena and premium gating works on reward tap.

**Step 4:** Final commit with any polish fixes.

```bash
git add -A
git commit -m "chore: integration testing fixes for onboarding, paywall, and battle pass"
```
