import { create } from 'zustand';

// IMPORTANT: Always use selectors (e.g., `useStore(selectUser)`) instead of
// calling `useStore()` without arguments. Subscribing to the full store causes
// every state change to re-render the consuming component. See selector exports
// at the bottom of this file.
export const useStore = create((set, get) => ({
    user: null,
    profileLoaded: false,
    profileExists: false,
    dataLoaded: false,
    error: null,
    loading: true,
    activeTab: 'dashboard',

    // Data State
    meals: [],
    progress: [],
    burned: [],
    workouts: [],
    photos: [],
    profile: {},
    userDoc: {},  // Root user doc (users/{uid}) — has ironScore, weightStatus
    leaderboard: [],
    chat: [],
    following: [],
    posts: [],
    inbox: [],
    globalFeed: [],
    battles: [],
    friendRequests: [],
    friends: [],

    // Selectors / Actions
    setActiveTab: (tab) => set({ activeTab: tab }),
    setUser: (u) => set({ user: u, loading: false }),
    setError: (err) => set({ error: err }),
    setLoading: (l) => set({ loading: l }),

    // Auth & Teardown
    clearStore: () => set({
        user: null,
        profileLoaded: false,
        profileExists: false,
        dataLoaded: false,
        meals: [], progress: [], burned: [], workouts: [], photos: [],
        profile: {}, userDoc: {}, leaderboard: [], chat: [], following: [], posts: [],
        inbox: [], globalFeed: [], battles: [],
        friendRequests: [], friends: []
    }),

    // Shallow Merge Update Utility — only merges top-level keys.
    // Nested objects (e.g., profile sub-fields) are replaced, not deep-merged.
    updateState: (payload) => set((state) => ({ ...state, ...payload }))
}));

// ── Memoized Selectors ─────────────────────────────────────────────────
// Use these instead of destructuring the whole store to prevent unnecessary re-renders.
// Example: const user = useStore(selectUser);
export const selectUser = (s) => s.user;
export const selectProfile = (s) => s.profile;
export const selectUserDoc = (s) => s.userDoc;
export const selectMeals = (s) => s.meals;
export const selectProgress = (s) => s.progress;
export const selectBurned = (s) => s.burned;
export const selectWorkouts = (s) => s.workouts;
export const selectPhotos = (s) => s.photos;
export const selectLeaderboard = (s) => s.leaderboard;
export const selectChat = (s) => s.chat;
export const selectPosts = (s) => s.posts;
export const selectInbox = (s) => s.inbox;
export const selectGlobalFeed = (s) => s.globalFeed;
export const selectBattles = (s) => s.battles;
export const selectFriendRequests = (s) => s.friendRequests;
export const selectFriends = (s) => s.friends;
export const selectActiveTab = (s) => s.activeTab;
export const selectLoading = (s) => s.loading;
export const selectError = (s) => s.error;
export const selectDataLoaded = (s) => s.dataLoaded;
export const selectProfileLoaded = (s) => s.profileLoaded;
export const selectProfileExists = (s) => s.profileExists;
export const selectFollowing = (s) => s.following;
