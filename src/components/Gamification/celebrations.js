/**
 * Celebration Engine — Coordinates confetti + haptics for gamification events.
 * Each celebration is a choreographed sequence of visual + physical feedback.
 */
import confetti from 'canvas-confetti';
import { hapticHeavy, hapticSuccess, hapticMedium, hapticLight } from '../../utils/haptics';

const BRAND_COLORS = ['#dc2626', '#ef4444', '#f87171', '#ffffff'];
const FIRE_COLORS = ['#dc2626', '#ff6b00', '#ff9500', '#ffcc00'];

/**
 * Level Up — Big double-burst celebration
 */
export const celebrateLevelUp = () => {
  hapticHeavy();

  // Center burst
  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 },
    colors: BRAND_COLORS,
    gravity: 0.8,
    ticks: 200,
  });

  // Side cannons after 200ms
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors: BRAND_COLORS,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors: BRAND_COLORS,
    });
    hapticMedium();
  }, 250);
};

/**
 * Workout Complete — Satisfying single burst
 */
export const celebrateWorkoutComplete = () => {
  hapticSuccess();
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { y: 0.7 },
    colors: BRAND_COLORS,
    gravity: 1,
    ticks: 150,
  });
};

/**
 * Forge Milestone — Fire-themed burst (every 7 days)
 */
export const celebrateForgeMilestone = () => {
  hapticMedium();
  confetti({
    particleCount: 45,
    spread: 45,
    origin: { y: 0.5 },
    colors: FIRE_COLORS,
    shapes: ['circle'],
    gravity: 0.6,
    ticks: 180,
  });
};

/**
 * Achievement Unlocked — Elegant upward spray
 */
export const celebrateAchievement = () => {
  hapticSuccess();
  confetti({
    particleCount: 35,
    spread: 70,
    origin: { y: 0.8 },
    colors: ['#dc2626', '#ef4444', '#b91c1c', '#fbbf24'],
    gravity: 0.9,
    ticks: 160,
  });
};

/**
 * Ghost Match Victory — Sustained side-cannon barrage
 */
export const celebrateVictory = () => {
  hapticHeavy();
  const end = Date.now() + 1500;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: BRAND_COLORS,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: BRAND_COLORS,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
};

/**
 * XP Gain — Subtle micro-celebration for small XP awards
 */
export const celebrateXPGain = () => {
  hapticLight();
  confetti({
    particleCount: 8,
    spread: 30,
    origin: { y: 0.3, x: 0.85 },
    colors: ['#dc2626', '#ef4444'],
    gravity: 1.5,
    ticks: 80,
    scalar: 0.6,
  });
};

/**
 * Ghost Match Defeat — Somber single puff (no confetti, just haptic)
 */
export const acknowledgeDefeat = () => {
  hapticMedium();
};
