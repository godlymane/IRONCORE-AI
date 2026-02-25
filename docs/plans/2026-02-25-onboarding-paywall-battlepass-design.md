# Design: Onboarding Flow, Premium Paywall, Battle Pass UI

**Date:** 2026-02-25
**Status:** Approved

---

## 1. Onboarding Flow (5 Screens)

### Approach
Wrap the existing OnboardingView with new aspirational screens. The working TDEE/macro calculator stays intact.

### Screen Flow

1. **Welcome** — Full-screen hero. "Your Phone. Your Trainer." IronCore branding, animated pulse background, single CTA. No data collection.

2. **Fitness Goal Selection** — Elevated version of existing goal step. Bigger cards, emotional copy: "What drives you?" Options: Lose Fat / Build Muscle / Stay Sharp.

3. **AI Form Correction Demo** — NEW. Looping CSS animation of phone with pose detection lines. Copy: "Your AI coach watches every rep." No user input, just "Next".

4. **App Setup** — Existing bio-metrics + activity + intensity collapsed into scrollable form. Weight, height, age, gender, activity level. TDEE/macro engine unchanged. Includes the analysis/loading animation.

5. **Premium Upsell** — Soft paywall. "Start with 7 days free" or "Continue with Free". 3 key premium benefits. Not aggressive — new user soft sell.

### Files Modified
- `src/views/OnboardingView.jsx` — Add welcome, AI demo, and upsell screens around existing steps.

---

## 2. Premium Paywall Redesign

### Changes from Current
- Full-screen takeover instead of centered modal (higher conversion)
- Social proof line: "Join 12,000+ athletes on Premium"
- 2-column feature comparison table (Free | Premium) with checkmarks
- Annual plan pre-selected, "7-day free trial" badge
- USD pricing: $12.99/mo, $79.99/yr (per CLAUDE.md spec)
- Trust badges: cancel anytime, no contracts, money-back

### Connection to PremiumContext
- Uses existing `usePremium()` — `showPaywall`, `closePaywall`, `purchasePlan`
- Adds `paywallSource` tracking for analytics

### Files Modified
- `src/components/PremiumPaywall.jsx` — Full redesign

---

## 3. Battle Pass / Season Pass UI

### New File
`src/views/BattlePassView.jsx`

### Layout
- Header: Season name + countdown timer + current tier
- XP progress bar toward next tier
- 30-tier vertical scrollable track (connected path)
- Two columns per tier: Free Track | Premium Track
- Current tier glows red, past tiers dimmed

### 30 Tiers (Sample)
- **Free Track:** XP boosts, basic borders, standard themes, workout templates
- **Premium Track:** Exclusive themes (Crimson Night, Midnight Blue, Gold Rush), AI voice text placeholders ("Coach Drill Sergeant", "Zen Master"), animated profile borders, rare badges, cosmetic animations

### Data Model
- `battlePass` subcollection under user doc: `{ tier, xp, claimedRewards[] }`
- Additive — no existing schema changes

### Premium Integration
- Premium track rewards call `requirePremium('battlePassTrack')` for free users
- Triggers existing paywall flow

### Files Created/Modified
- `src/views/BattlePassView.jsx` — NEW
- `src/App.jsx` — Add lazy import + route for Battle Pass (accessible from Arena or nav)
