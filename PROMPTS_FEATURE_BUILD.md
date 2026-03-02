# IronCore Fit — Feature Build Prompts
# Run these IN ORDER. Commit after each. Do not run in parallel.

---

## CONTEXT (read before all prompts)

IronCore Fit is a React 19 + Vite + Firebase fitness app.
- Firebase project: ironcore-f68c2
- React app: src/ (views, components, hooks, services)
- Cloud Functions: functions/index.js (Node.js, Firebase Gen 2)
- Firestore rules: firestore.rules
- Firestore indexes: firestore.indexes.json
- Core data hook: src/hooks/useFitnessData.js
- Tab navigation via `activeTab` state in src/App.jsx
- All views are lazy-loaded with named-export bridge
- Dark/red theme — no light mode touches

---

## PROMPT 1 — Backend Foundation
### Paste this into a fresh Claude Code session. Do this FIRST.

You are working on IronCore Fit, a React + Firebase fitness app at C:\Users\devda\iron-ai.

Build the following backend systems in functions/index.js, firestore.rules, and firestore.indexes.json. Do NOT touch any files in src/. Do NOT delete any existing Cloud Functions. Only add new ones.

---

### 1. `logWeightEntry` — Callable Cloud Function

Anti-cheat rules (all enforced server-side, reject if violated):
- Max 1 entry per 20 hours per user (check last entry timestamp)
- Max ±1.5kg change from previous entry (reject impossible jumps)
- Entry timestamp must be within 60 minutes of server time (no backdating)
- After 2 hours, entries are immutable (no edits possible — enforce via separate update check)

What it does:
1. Validate all anti-cheat rules above
2. Write weight entry to `users/{uid}/progress/{autoId}` with fields: `weight` (number, kg), `date` (ISO string YYYY-MM-DD), `loggedAt` (server timestamp), `userId`
3. Update `users/{uid}/data/profile` with `weight: newWeight`
4. Calculate 7-day rolling average from last 7 progress entries with weight field
5. Compare trend vs user's `goal` field ("cut" / "bulk" / "maintain") from profile:
   - Cut + trending down (avg decreased ≥0.2kg over 7 days): award +50 XP, +75 leaguePoints, write `weightStatus: "on_track"` to user doc
   - Cut + trending up (avg increased ≥0.3kg over 7 days): deduct 75 leaguePoints, write `weightStatus: "off_track"`
   - Bulk + trending up: award +50 XP, +75 leaguePoints, `weightStatus: "on_track"`
   - Bulk + trending down: deduct 75 leaguePoints, `weightStatus: "off_track"`
   - Maintain (within ±0.3kg): award +25 XP, `weightStatus: "on_track"`
   - Less than 3 entries: `weightStatus: "building"` — no penalty/reward yet
6. After XP/leaguePoints update, trigger recalculation of ironScore (see ironScore section below)
7. Return: `{ success: true, weightStatus, xpAwarded, trend7day, ironScore }`

---

### 2. `weeklyWeightAssessment` — Scheduled (every Sunday 11pm UTC)

For every user who has logged at least 3 weight entries in the past 7 days:
1. Calculate 7-day weight trend (first entry vs last entry of the week)
2. Compare to goal (cut/bulk/maintain)
3. Cut + lost weight (≥0.2kg): +100 leaguePoints, +100 XP
4. Cut + gained weight (≥0.3kg): -100 leaguePoints, write notification to `users/{uid}/inbox`
5. Bulk + gained weight (≥0.2kg): +100 leaguePoints, +100 XP
6. Bulk + lost weight (≥0.3kg): -100 leaguePoints, write notification to inbox
7. Maintain (within ±0.3kg): +50 XP
8. Write assessment result to `users/{uid}` as `lastWeightAssessment: { date, result, pointsChanged }`

---

### 3. `calculateIronScore` — Internal helper function (not exported, called by other functions)

Iron Score formula (0–100+):
- League rank contribution (40 pts max):
  - Iron=0, Bronze=8, Silver=16, Gold=28, Platinum=40, Diamond=50, Legend=60
  - Use `leaguePoints` field to determine rank bracket
- Workout consistency (25 pts max):
  - Count workouts logged in last 30 days from `users/{uid}/data` where type="workout"
  - Score = (workoutCount / 20) * 25, capped at 25
- Nutrition adherence (20 pts max):
  - Count days with nutrition logged in last 14 days
  - Score = (loggedDays / 14) * 20
- Arena win rate (10 pts max):
  - wins / (wins + losses) * 10, min 5 battles required else 0
- Weight goal progress (5 pts max):
  - abs(currentWeight - startingWeight) / abs(targetWeight - startingWeight) * 5, capped at 5
  - 0 if no target set

Write `ironScore: calculatedScore` to `users/{uid}` doc.
Return the score.

---

### 4. `weeklyRankDecay` — Scheduled (every Monday 2am UTC)

For every user:
1. Check if user has logged any workout in the last 7 days
2. If no workout logged: deduct 30 leaguePoints (min 0, never negative)
3. Write `lastDecayApplied: serverTimestamp` to user doc
4. Do NOT decay users who are in Iron league (leaguePoints < 100)
5. Recalculate ironScore after decay

---

### 5. `weeklyGuildWars` — Scheduled (every Monday 3am UTC)

1. For each guild in /guilds collection:
   a. Sum `weeklyXpContribution` from all member user docs (field added when XP is earned)
   b. Write total to `guilds/{guildId}` as `lastWarScore` and `warXpEarned`
   c. Store in subcollection `guilds/{guildId}/warHistory/{weekId}`
2. Rank all guilds by warScore globally
3. Top 10% guilds: write `warReward: "gold"` — distribute +200 XP to all members
4. Top 25% guilds: write `warReward: "silver"` — distribute +100 XP to all members
5. Reset `weeklyXpContribution` to 0 on all user docs
6. Update guild leaderboard in `/global/data/guildLeaderboard` collection

When any XP is awarded anywhere in functions/index.js, also increment `weeklyXpContribution` on the user doc by the same amount.

---

### 6. Forge Shield mechanic (update existing XP/workout logging functions)

When a user earns 500 XP total, grant them 1 Forge Shield stored as `forgeShields: increment(1)` on user doc.
Max 3 shields storable at once.
Add a callable function `useForgeShield` that:
1. Checks user has forgeShields > 0
2. Decrements forgeShields by 1
3. Extends the user's `lastWorkoutDate` by 1 day (preventing Forge break)
4. Returns `{ success: true, shieldsRemaining }`

---

### 7. Firestore Rules — add these collections

Add rules for:
- `users/{uid}/progress/{entryId}`: read by owner, write ONLY via Admin SDK (no client writes — all weight entries go through logWeightEntry function)
- `/global/data/guildLeaderboard/{guildId}`: read by any authenticated user, write = false (server only)
- `users/{uid}` fields `ironScore`, `weeklyXpContribution`, `forgeShields`, `weightStatus`, `lastDecayApplied`, `lastWeightAssessment` — add to serverOnlyFields() set so clients cannot write them

---

### 8. Firestore Indexes — add

- Collection: `users/{uid}/progress` (subcollection), fields: `userId ASC`, `loggedAt DESC`
- Collection: `guilds`, fields: `lastWarScore DESC`

---

After implementing, run: `firebase deploy --only functions,firestore:rules,firestore:indexes`
Then commit: `feat: backend — weight accountability, Iron Score, Forge Shield, Guild Wars, rank decay`

---

## PROMPT 2 — Forge System
### Run after Prompt 1 is committed.

You are working on IronCore Fit at C:\Users\devda\iron-ai.

Replace the "streak" concept with "Forge" throughout the entire React app. The Forge is IronCore's version of a streak — but it sounds like you're forging yourself. Read every file before editing it.

---

### What to change:

1. **Global text replacement** — find every instance of:
   - "streak" → "Forge" (capitalised where appropriate)
   - "Streak" → "Forge"
   - "STREAK" → "FORGE"
   - "streak_count", `streakCount`, `currentStreak`, `streakDays` → `forge`, `forgeCount`, `currentForge`, `forgeDays`
   - "Lost your streak" → "Forge broken"
   - "Keep your streak" → "Keep your Forge alive"
   - "Day streak" → "day Forge"

2. **Firestore field mapping** — in useFitnessData.js and any data fetching:
   - When reading user doc, map both `streak` AND `forge` fields (backwards compat: `forge: userData.forge ?? userData.streak ?? 0`)
   - When writing, always write to `forge` field

3. **Add Forge Shield display** — wherever the Forge count is displayed, show shield count next to it:
   - Small shield icon + number indicating shields available
   - Tapping shield icon calls `useForgeShield` Cloud Function
   - Confirm dialog: "Use 1 Forge Shield to protect today's Forge? (X remaining)"
   - On success: show "Forge protected" toast

4. **Forge status language** — update all notifications, push notification text, and UI labels:
   - "You're on a X day streak" → "Forge: X days active"
   - "Streak broken!" → "Forge broken — restart it today"
   - "New streak record!" → "New Forge record!"

5. **Visual** — wherever the streak fire 🔥 emoji is used, keep it or replace with a forge/anvil aesthetic. Do not use streak-related icons from Lucide. Use the existing icon system.

Do NOT touch: functions/index.js, firestore.rules, firestore.indexes.json, any native Android/iOS code.

After implementing, verify the app builds: `npm run build`
Commit: `feat: replace streak with Forge system throughout app`

---

## PROMPT 3 — Iron Score + Daily Weigh-In UI
### Run after Prompt 2 is committed.

You are working on IronCore Fit at C:\Users\devda\iron-ai.

Build two things: the Iron Score display and the daily weigh-in card. Read every file before editing.

---

### Part A: Iron Score Display

Iron Score is a 0–100+ unified score representing a player's overall fitness engagement. It is stored on the user doc as `ironScore` (written by Cloud Functions only — never write it from client).

Display it in these locations:

1. **src/views/DashboardView.jsx** — add an Iron Score card near the top of the dashboard:
   - Large number (the score) with label "IRON SCORE"
   - Small subtitle: "League 40% · Consistency 25% · Nutrition 20% · Wins 10% · Body 5%"
   - Progress ring or bar showing score out of 100
   - Color: below 30 = grey, 30-60 = red (#dc2626), 60-80 = orange, 80+ = gold
   - If score changed since last session (compare to localStorage cached value), show delta: "+3 this week" in small green text

2. **Profile tab** — wherever the user's stats are displayed, show Iron Score prominently with the same ring design

3. **Forge status line** — next to or below Iron Score, show: "Forge: X days · X shields"

---

### Part B: Daily Weigh-In Card

In src/views/DashboardView.jsx, add a daily weigh-in card that appears at the TOP of the dashboard if the user has not logged their weight today.

Card design:
- Dark card with red border accent
- Title: "LOG TODAY'S WEIGHT"
- Subtitle: shows their goal: "You're on a cut — track your progress"
- Large number input (kg) — numeric keyboard, 1 decimal place
- "LOG WEIGHT" button — calls `logWeightEntry` Cloud Function with the weight value
- On success: card disappears, show result toast:
  - If `weightStatus === "on_track"`: "On track 🔥 +50 XP"
  - If `weightStatus === "off_track"`: "Off track — adjust your nutrition"
  - If `weightStatus === "building"`: "Keep logging — trend building"
- On error: show specific error (rate limit, invalid value, etc.)
- Card is dismissible (small X) — dismissal stored in localStorage as `ironcore_weigh_dismissed_YYYY-MM-DD`
- If dismissed today, don't show again until tomorrow
- If already logged today (check progress entries), don't show card at all

Check if logged today by reading from useFitnessData progress array: filter entries where `date === today's ISO date string`.

---

### Part C: Weight Progress Section

In the Progress or Profile tab, add a weight trend section showing:
- Last 7 weigh-in entries as a simple line chart (use recharts, already installed)
- Current weight vs target weight
- Direction indicator: arrow up/down with colour
- `weightStatus` badge: "ON TRACK" (green) / "OFF TRACK" (red) / "BUILDING" (grey)

Do NOT touch: functions/index.js, firestore.rules, native Android/iOS code, any auth flow files.

Build: `npm run build` — must succeed.
Commit: `feat: Iron Score display + daily weigh-in card`

---

## PROMPT 4 — Player Card + Friends
### Run after Prompt 3 is committed.

You are working on IronCore Fit at C:\Users\devda\iron-ai.

Build a shareable Player Card system and a basic friend request system. Read every file before editing.

---

### Player Card (Profile tab)

This is DIFFERENT from the login/recovery card (which is a QR code for account recovery). This is a social identity card.

Create a new component: `src/components/Profile/PlayerCard.jsx`

Card displays:
- Username (large, bold)
- **Archetype** (auto-assigned, displayed as a badge):
  - `THE IRON` — if user's primary workouts are strength-based
  - `THE BLADE` — if cardio sessions dominate
  - `THE HYBRID` — if balanced split
  - `THE CUT` — if goal === "cut" AND weightStatus === "on_track"
  - `THE BUILDER` — if goal === "bulk" AND weightStatus === "on_track"
  - Default to `THE IRON` if insufficient data
  - Determine from workout logs in useFitnessData — count workout types over last 30 days
- Iron Score (large number, coloured by tier)
- League rank (with badge icon)
- Forge count: "Forge: X days"
- Win/Loss ratio from arena
- Guild tag if member of one (e.g. `[GRND]`)
- Level

Card visual variants — border and accent colour changes by league:
- Iron: grey border, `#6b7280`
- Bronze: bronze border, `#92400e`
- Silver: silver border, `#9ca3af`
- Gold: gold border, `#d97706`
- Platinum: teal border, `#0d9488`
- Diamond: cyan glow, `#06b6d4`

Each archetype has a slightly different background pattern (use subtle CSS gradients — keep dark theme).

Card has two buttons:
1. **Share Card** — generates a shareable URL: `https://ironcore.fit/card/{username}` (copy to clipboard, show "Link copied!" toast). Also show the card as a styled image using html2canvas or just display a modal with the card fullscreen for screenshotting.
2. **Add Friend** — only shows when viewing ANOTHER player's card (not your own)

---

### Where to show Player Card

1. In the Profile tab — show YOUR Player Card at the top, above other stats
2. When tapping another player's username anywhere in the app (leaderboard, guild chat, arena) — show their card in a modal with the Add Friend button

---

### Friend System

Create Cloud Function `sendFriendRequest` in functions/index.js:
- Write to `users/{targetUid}/friendRequests/{requestId}` with: `fromUid`, `fromUsername`, `fromIronScore`, `fromLeague`, `sentAt`, `status: "pending"`
- Rate limit: max 20 friend requests per day per user
- Can't send to someone already a friend

Create Cloud Function `respondFriendRequest` in functions/index.js:
- Accepts `requestId` and `response` ("accept" / "decline")
- If accept: write to `users/{uid}/friends/{friendUid}` and `users/{friendUid}/friends/{uid}` (mutual)
- Delete the request doc either way

In the Profile tab, add a "Friends" section:
- List of friends with their archetype, league badge, Iron Score
- Pending friend requests count shown as a badge
- Tapping a friend shows their Player Card modal
- "Challenge to Battle" button on friend's card (hooks into existing arena flow)

Firestore rules — add:
- `users/{uid}/friendRequests/{docId}`: any auth can create (fromUid must match auth), owner can read/delete
- `users/{uid}/friends/{friendId}`: owner can read, write only via Admin SDK (Cloud Function)

Do NOT touch: login/recovery card (LoginScreen.jsx, PinEntryView.jsx), auth flow, native code.

Build: `npm run build` — must succeed.
Commit: `feat: Player Card with archetypes + friend system`

---

## PROMPT 5 — Guild Overhaul + Achievements + PR Tracking
### Run after Prompt 4 is committed. This is the largest prompt — take your time.

You are working on IronCore Fit at C:\Users\devda\iron-ai.

Build three things: complete guild system overhaul, achievement system, and PR tracking. Read every file before editing.

---

### Part A: Guild Creation Flow

Currently there is NO way to create a guild in the app. Add a "Create Guild" button in the Guild section (src/components/Gamification/GuildDashboard.jsx or src/components/Arena/Guilds.jsx — read first to find where guilds are displayed).

Only show "Create Guild" button if:
- User is not already in a guild (no `guildId` on user doc)
- User is Level 10 or above (show locked state with "Reach Level 10 to create a guild" if below)

Guild creation flow (modal/screen):
1. **Guild Name** — text input, 3-30 chars, alphanumeric + spaces only
2. **Guild Tag** — 2-4 capital letters shown in brackets e.g. `[IRON]` — auto-suggested from name, editable
3. **Focus Type** — selector: Strength / Cardio / Mixed
4. **Membership** — toggle: Open (anyone can join) / Invite Only
5. **Min Level to Join** — slider: 1 to 20 (default 5)
6. Preview card showing how guild will look
7. "CREATE GUILD" button — calls existing Firestore guild create (or wrap in a Cloud Function `createGuild` if needed for validation)

On creation:
- Write guild doc to /guilds with: name, tag, focusType, membershipType, minJoinLevel, ownerId, ownerUsername, memberCount: 1, memberIds: [uid], guildLevel: 1, guildXp: 0, weeklyXpContribution: 0, createdAt
- Write `guildId` and `guildTag` to user doc
- Show success screen: "Guild [TAG] created — invite your first members"

---

### Part B: Guild Features UI

In the Guild section, add these panels for guild members:

1. **Forge Accountability Wall** — list of all guild members with:
   - Username, archetype badge, league badge
   - Forge status: "Forge: X days" (green if active, grey/red if 0)
   - Last workout: "X days ago" or "Today"
   - Sort by Forge count descending (most consistent at top)

2. **Guild War Status** — weekly war panel:
   - "Week's Guild War" header
   - Total XP earned by guild this week (from `weeklyXpContribution` sum)
   - Guild rank on leaderboard this week
   - Time remaining until war ends (Monday 3am UTC reset)
   - Last week's result: "Rank #X — Gold Reward / Silver Reward / No Reward"
   - Each member's contribution this week (bar chart, small)

3. **Guild Level + Perks** — progress panel:
   - Current guild level (1-30)
   - XP to next level (guildXp / threshold)
   - Active perks list:
     - Level 5: All members get +1 Forge Shield per month
     - Level 10: +15% XP multiplier for all members
     - Level 15: Access to Guild Boss (exclusive community boss variant)
     - Level 20: Exclusive Player Card border for all members
     - Level 25: +25% XP multiplier
   - Locked perks greyed out with level requirement shown

4. **Guild Leaderboard** — read from `/global/data/guildLeaderboard`, show top 20 guilds with rank, name, tag, war score, member count

Apply guild XP multiplier client-side display: if user is in a guild with Level 10+, show "+15% XP active" badge on XP earn notifications.

---

### Part C: Achievement System

Create a new component: `src/components/Gamification/Achievements.jsx`

Achievement definitions (hardcode these — check against user data to determine unlocked):

**Workout Achievements:**
- "First Blood" — log first workout
- "10 Strong" — log 10 workouts total
- "Century" — log 100 workouts total
- "Consistent" — maintain 7-day Forge
- "Unbreakable" — maintain 30-day Forge
- "Iron Will" — maintain 60-day Forge

**Weight Achievements:**
- "First Step" — log first weight entry
- "On Track" — 4 consecutive weeks on_track weight assessment
- "Transformation" — reach target weight

**Arena Achievements:**
- "First Blood (Arena)" — win first arena battle
- "Warrior" — win 10 arena battles
- "Champion" — win 50 arena battles
- "Undefeated" — win 5 battles in a row

**Social Achievements:**
- "Recruited" — join a guild
- "Leader" — create a guild
- "Squad Goals" — guild reaches Level 5

**Iron Score Achievements:**
- "Rising" — reach Iron Score 30
- "Forged" — reach Iron Score 60
- "Elite" — reach Iron Score 80+

Each achievement has:
- Name, description, icon (use Lucide icons — match thematically)
- `unlockedAt` timestamp or null
- XP reward shown (awarded by Cloud Function when triggered — for now just display)

Read `achievements` array from user doc (written by Cloud Functions). Display in Profile tab as a grid of badges — locked ones are greyed out with a lock icon.

Add a Cloud Function `checkAndAwardAchievements(uid)` — internal helper called after any XP event. Checks all achievement conditions against user data, awards any newly unlocked ones, writes to `users/{uid}` achievements array.

---

### Part D: PR (Personal Record) Tracking

When a workout is logged with exercise data, detect if any lift is a new personal record.

In the workout logging flow (src/views/WorkoutView.jsx — read first):
- After logging a set, compare weight × reps to previous best for that exercise
- If new PR: trigger a celebration animation (framer-motion pop/confetti-style)
- Show "NEW PR 🏆 — Bench Press 100kg" toast
- Store PR in `users/{uid}/data/prs` document as a map: `{ "Bench Press": { weight: 100, reps: 5, date: "2026-02-28" } }`
- Award +25 XP for each new PR (call Cloud Function or write to Firestore directly with XP increment — check existing XP pattern in codebase)

Display PRs in Profile tab:
- "Personal Records" section
- List of all exercises with current PR (weight × reps)
- Date achieved
- Sorted by most recently set

Do NOT touch: auth flow files, LoginScreen.jsx, PinEntryView.jsx, native Android/iOS code.

Build: `npm run build` — must succeed with zero errors.
Commit: `feat: guild creation + forge wall + guild wars UI + achievements + PR tracking`

---

## AFTER ALL 5 PROMPTS

Run: `firebase deploy --only functions,firestore:rules,firestore:indexes`
Then run: `npm run build && npx cap sync android`
Then build APK: `cd android && ./gradlew assembleDebug`

The features that are now complete:
- Weight accountability (anti-cheat, daily weigh-in, consequences)
- Iron Score (unified identity score)
- Forge system (replaces streak)
- Rank decay (weekly, inactive users)
- Guild Wars (weekly competition)
- Player Card (shareable, archetypes, friend system)
- Guild creation + accountability wall + perks
- Achievements
- PR tracking
