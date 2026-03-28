// Social Sharing Utilities
// Share achievements and progress to social platforms

/**
 * Generate shareable achievement text
 */
export const generateAchievementText = (achievement) => {
    const templates = {
        forge: (days) => `🔥 ${days}-day Forge on IronCore AI! Consistency is the key to success! #FitnessGoals #IronCore`,
        workout: (count) => `💪 Completed ${count} workouts this week on IronCore AI! Who's with me? #WorkoutComplete #IronCore`,
        level: (level) => `⬆️ Just hit Level ${level} on IronCore AI! The grind never stops 💯 #LevelUp #IronCore`,
        calories: (cals) => `🔥 Burned ${cals.toLocaleString()} calories this week with IronCore AI! #CalorieBurn #IronCore`,
        boss: (name) => `⚔️ Helped defeat ${name} in the IronCore Arena! Community power! #BossRaid #IronCore`,
        battle: (wins) => `🏆 ${wins} battle victories in the IronCore Arena! Who wants to challenge me? #ArenaChamp #IronCore`,
        guild: (name) => `🛡️ Joined ${name} guild in IronCore AI! Stronger together! #FitnessGuild #IronCore`,
    };

    return templates[achievement.type]?.(achievement.value) ||
        `🎯 Achievement unlocked on IronCore AI! ${achievement.title} #IronCore`;
};

/**
 * Share to native share API or fallback
 */
export const shareAchievement = async (achievement) => {
    const text = generateAchievementText(achievement);
    const shareData = {
        title: 'IronCore AI Achievement',
        text: text,
        url: 'https://ironcore.ai',
    };

    try {
        // Try native share API (mobile)
        if (navigator.share && navigator.canShare?.(shareData)) {
            await navigator.share(shareData);
            return { success: true, method: 'native' };
        }
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Share failed:', err);
        }
    }

    // Fallback: copy to clipboard
    try {
        await navigator.clipboard.writeText(text);
        return { success: true, method: 'clipboard' };
    } catch (err) {
        console.error('Clipboard failed:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Generate Twitter/X share URL
 */
export const getTwitterShareUrl = (text) => {
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
};

/**
 * Generate Facebook share URL
 */
export const getFacebookShareUrl = (url = 'https://ironcore.ai') => {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
};

/**
 * Generate WhatsApp share URL
 */
export const getWhatsAppShareUrl = (text) => {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

/**
 * Open share picker with options
 */
export const openSharePicker = async (achievement) => {
    const text = generateAchievementText(achievement);

    // Return share URLs for display in a modal
    return {
        text,
        twitter: getTwitterShareUrl(text),
        facebook: getFacebookShareUrl(),
        whatsapp: getWhatsAppShareUrl(text),
        canNativeShare: typeof navigator.share === 'function',
    };
};

/**
 * Share progress photo with caption
 */
export const shareProgressPhoto = async (photoUrl, caption) => {
    const text = `📸 Progress update: ${caption} #IronCore #TransformationTuesday`;

    try {
        if (navigator.share) {
            // Try to fetch and share the actual image
            const response = await fetch(photoUrl);
            const blob = await response.blob();
            const mimeType = blob.type || 'image/jpeg';
            const ext = mimeType.includes('png') ? 'png' : 'jpg';
            const file = new File([blob], `progress.${ext}`, { type: mimeType });

            await navigator.share({
                title: 'My Fitness Progress',
                text: text,
                files: [file],
            });
            return { success: true };
        }
    } catch (err) {
        // User cancelled share — silent exit
        if (err.name === 'AbortError') return { success: false, cancelled: true };
        console.error('Photo share failed:', err);
    }

    // Fallback to text only
    return shareAchievement({ type: 'custom', title: caption });
};


