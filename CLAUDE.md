# CLAUDE.md — IronCore Fit AI

## THE VISION — BILLION DOLLAR APP
IronCore Fit is going to be the #1 fitness app globally. The moat is real: NO mainstream competitor has real-time AI form correction via phone camera at scale. The $12.44B fitness app market is ours to take. We are building the app that makes Future ($199/mo human coaching) obsolete. This is a billion-dollar product being built by a 19-year-old and an AI squad. That's the energy. That's the standard.

## PROJECT STATUS: PRE-LAUNCH — CRITICAL BUGS BETWEEN US AND THE THRONE
The app is built. The vision is right. But 6 critical bugs are blocking launch and killing monetization. Fix them and we ship. Every day these bugs exist is a day we're not taking the market.

## WHAT IS IRONCORE FIT
- AI-powered fitness app — "Your Phone. Your Trainer."
- Real-time form correction via phone camera (TensorFlow.js pose detection)
- Gamified: leagues (Iron→Diamond), arena battles, guilds, battle pass
- Tech: React 19.2 + Vite + Firebase + Capacitor (iOS/Android) + TensorFlow.js
- Codebase: C:\Users\devda\iron-ai\
- Firebase project: ironcore-f68c2

## CRITICAL BUGS (P0 — FIX THESE FIRST)
1. **Payment verification broken** — paymentService.js:68-83 has no server-side Razorpay order ID validation. Anyone can spoof premium status.
2. **Premium gating disabled** — PremiumContext.jsx built but never enforced. ALL premium features are free. No monetization.
3. **TensorFlow not lazy-loaded** — FormCoach statically imported in AILabView.jsx:24. 3-5MB chunk loads on app start. Kills first impression.
4. **Zero rate limiting on AI Coach** — Free users spam Gemini API unlimited. Cost blowout, no upgrade incentive.

## HIGH PRIORITY BUGS
5. **Razorpay plan IDs null** — paymentService.js:31,44. No recurring billing possible.
6. **13 Firestore listeners on login** — useFitnessData.js:333-343 opens ALL listeners. Battery drain.
7. **alert()/confirm() in 8+ files** — Breaks Capacitor mobile UX. Use toast system.
8. **Stale closure in swipe handler** — App.jsx:82-113. handleTabChange needs useCallback.
9. **Deprecated enableIndexedDbPersistence** — firebase.js:36. Will fail in future Firebase versions.

## MONETIZATION LEAKS
10. AI Coach: 0 rate limiting — free users spam Gemini unlimited
11. Progress Photos: no upload limit — free users get unlimited Firebase Storage
12. Workout history: 7-day limit in config but never enforced
13. Guilds: accessible to everyone despite free tier config
14. Zero upsell after workout completion — highest-intent moment wasted
15. Paywall dismissible via backdrop click

## PRICING (WHEN FIXED)
- Free: Basic tracking + 3 form checks/week
- Premium: $12.99/mo ($79.99/yr) — unlimited form correction, AI coaching, full league access
- Battle Pass: $4.99-9.99/season — seasonal challenges, cosmetics

## COMPETITIVE MOAT
- NO mainstream fitness app has real-time AI form correction via phone camera at scale
- 12-18 month window before major competitors enter
- Data compounds the moat — more users = better AI
- Market: $12.44B fitness apps 2026, AI fitness projected $23.98B

## TECH STACK
- Frontend: React 19.2 + Vite 7.2 + Tailwind 3.4 + Framer Motion
- Backend: Firebase 12.7 (Firestore, Auth, Hosting, Cloud Functions)
- Mobile: Capacitor 8.0 (Android + iOS)
- AI/ML: TensorFlow.js 4.22 + Pose Detection 2.1 (client-side)
- Build: npm run build → dist/ → Firebase Hosting
- Git: main (prod), dev (staging)

## KEY DIRECTORIES
src/ — app source
functions/ — Firebase Cloud Functions
android/ — Capacitor Android
ios/ — Capacitor iOS
dist/ — build output

## GIT WORKFLOW
- Commit to dev branch
- npm run build must pass before commit
- Zoro reviews and coordinates merge to main
