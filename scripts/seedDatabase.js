// Database Seeding Script for IronCore Arena
// Run with: node scripts/seedDatabase.js

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, Timestamp } from 'firebase/firestore';

// Firebase config - using your ironcore-f68c2 project
const firebaseConfig = {
    apiKey: "AIzaSyBwOV4sukr-gFzehsL0Ae4M0baC8g-v0U8",
    authDomain: "ironcore-f68c2.firebaseapp.com",
    projectId: "ironcore-f68c2",
    storageBucket: "ironcore-f68c2.firebasestorage.app",
    messagingSenderId: "723716819080",
    appId: "1:723716819080:web:106648775eeeb79431b73d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample users data
const sampleUsers = [
    { id: 'demo_user_001', username: 'IronWarrior', level: 42, xp: 8500, wins: 15, losses: 8, currentStreak: 5, league: 'Diamond' },
    { id: 'user_002', username: 'IronTitan', level: 60, xp: 15400, wins: 45, losses: 12, currentStreak: 12, league: 'Champion' },
    { id: 'user_003', username: 'SarahLift', level: 58, xp: 14200, wins: 38, losses: 15, currentStreak: 8, league: 'Champion' },
    { id: 'user_004', username: 'GymRat99', level: 55, xp: 13800, wins: 32, losses: 18, currentStreak: 3, league: 'Diamond' },
    { id: 'user_005', username: 'PowerLifter', level: 50, xp: 12000, wins: 28, losses: 14, currentStreak: 6, league: 'Diamond' },
    { id: 'user_006', username: 'CyberGladiator', level: 48, xp: 11200, wins: 25, losses: 16, currentStreak: 4, league: 'Platinum' },
    { id: 'user_007', username: 'IronMaiden', level: 45, xp: 10500, wins: 22, losses: 12, currentStreak: 7, league: 'Platinum' },
    { id: 'user_008', username: 'BeastMode', level: 43, xp: 9800, wins: 20, losses: 15, currentStreak: 2, league: 'Platinum' },
    { id: 'user_009', username: 'MuscleMan', level: 40, xp: 8200, wins: 18, losses: 14, currentStreak: 0, league: 'Gold' },
    { id: 'user_010', username: 'FitQueen', level: 38, xp: 7500, wins: 16, losses: 10, currentStreak: 5, league: 'Gold' },
];

// Seed users collection
async function seedUsers() {
    console.log('🌱 Seeding users...');

    for (const user of sampleUsers) {
        await setDoc(doc(db, 'users', user.id), {
            username: user.username,
            level: user.level,
            xp: user.xp,
            workoutsCompleted: Math.floor(user.xp / 100),
            wins: user.wins,
            losses: user.losses,
            currentStreak: user.currentStreak,
            league: user.league,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
            createdAt: Timestamp.now()
        });
        console.log(`  ✅ Created user: ${user.username}`);
    }
}

// Seed leaderboard collection
async function seedLeaderboard() {
    console.log('🏆 Seeding leaderboard...');

    // Sort by XP descending
    const sortedUsers = [...sampleUsers].sort((a, b) => b.xp - a.xp);

    for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        await setDoc(doc(db, 'leaderboard', user.id), {
            username: user.username,
            xp: user.xp,
            level: user.level,
            league: user.league,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
            rank: i + 1,
            lastUpdated: Timestamp.now()
        });
        console.log(`  ✅ Leaderboard entry: #${i + 1} ${user.username}`);
    }
}

// Seed community boss
async function seedCommunityBoss() {
    console.log('👹 Seeding community boss...');

    await setDoc(doc(db, 'community_boss', 'current'), {
        bossId: 'titan_100ton',
        name: 'The 100-Ton Titan',
        totalHP: 100000,
        currentHP: 55000,
        contributors: [
            { userId: 'user_002', username: 'IronTitan', damageDealt: 12500, joinedAt: new Date().toISOString() },
            { userId: 'user_003', username: 'SarahLift', damageDealt: 10200, joinedAt: new Date().toISOString() },
            { userId: 'user_004', username: 'GymRat99', damageDealt: 8800, joinedAt: new Date().toISOString() },
            { userId: 'demo_user_001', username: 'IronWarrior', damageDealt: 5500, joinedAt: new Date().toISOString() },
        ],
        status: 'active',
        startedAt: Timestamp.now(),
        defeatedAt: null
    });

    console.log('  ✅ Created community boss: The 100-Ton Titan');
}

// Seed sample battles
async function seedBattles() {
    console.log('⚔️ Seeding battles...');

    const battles = [
        {
            challenger: { userId: 'user_002', username: 'IronTitan', xp: 15400 },
            opponent: { userId: 'demo_user_001', username: 'IronWarrior', xp: 8500 },
            status: 'pending',
            battleType: 'ranked'
        },
        {
            challenger: { userId: 'demo_user_001', username: 'IronWarrior', xp: 8500 },
            opponent: { userId: 'user_006', username: 'CyberGladiator', xp: 11200 },
            status: 'completed',
            winnerId: 'demo_user_001',
            battleType: 'ranked'
        },
        {
            challenger: { userId: 'user_007', username: 'IronMaiden', xp: 10500 },
            opponent: { userId: 'demo_user_001', username: 'IronWarrior', xp: 8500 },
            status: 'pending',
            battleType: 'casual'
        }
    ];

    for (const battle of battles) {
        await addDoc(collection(db, 'battles'), {
            ...battle,
            createdAt: Timestamp.now(),
            completedAt: battle.status === 'completed' ? Timestamp.now() : null
        });
        console.log(`  ✅ Created battle: ${battle.challenger.username} vs ${battle.opponent.username} (${battle.status})`);
    }
}

// Seed chat messages
async function seedChatMessages() {
    console.log('💬 Seeding chat messages...');

    const messages = [
        { userId: 'user_002', username: 'IronTitan', message: 'Who\'s ready to take down the Titan today? 💪' },
        { userId: 'user_003', username: 'SarahLift', message: 'Just finished a killer leg day! Let\'s raid!' },
        { userId: 'demo_user_001', username: 'IronWarrior', message: 'Count me in! Let\'s crush this boss!' },
        { userId: 'user_006', username: 'CyberGladiator', message: 'Challenge accepted @IronWarrior! 🔥' },
    ];

    for (const msg of messages) {
        await addDoc(collection(db, 'chat_messages'), {
            ...msg,
            timestamp: Timestamp.now()
        });
        console.log(`  ✅ Chat: ${msg.username}: "${msg.message}"`);
    }
}

// Main seeding function
async function seedDatabase() {
    console.log('\n🚀 Starting database seeding...\n');
    console.log('====================================\n');

    try {
        await seedUsers();
        console.log('');

        await seedLeaderboard();
        console.log('');

        await seedCommunityBoss();
        console.log('');

        await seedBattles();
        console.log('');

        await seedChatMessages();
        console.log('');

        console.log('====================================');
        console.log('✅ Database seeding complete!\n');
        console.log('📊 Summary:');
        console.log(`   - ${sampleUsers.length} users created`);
        console.log(`   - ${sampleUsers.length} leaderboard entries`);
        console.log('   - 1 community boss');
        console.log('   - 3 sample battles');
        console.log('   - 4 chat messages\n');

        console.log('🔗 View data at: https://console.firebase.google.com/project/ironcore-f68c2/firestore\n');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run seeding
seedDatabase();
