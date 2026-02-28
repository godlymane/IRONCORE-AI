import { create } from 'zustand';

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

    // Deep Merge Update Utility
    updateState: (payload) => set((state) => ({ ...state, ...payload }))
}));
