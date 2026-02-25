// IronCore Player Identity — Wordlist, Phrase Generation, Hashing
// ~280 themed words for 12-word recovery phrase generation

const IRONCORE_WORDLIST = [
  // Power (40)
  'iron', 'steel', 'forge', 'titan', 'apex', 'blade', 'thunder', 'storm',
  'fury', 'rage', 'wrath', 'valor', 'might', 'force', 'power', 'strike',
  'crush', 'smash', 'break', 'shatter', 'conquer', 'dominate', 'reign',
  'surge', 'charge', 'blast', 'impact', 'havoc', 'chaos', 'rebel',
  'savage', 'brutal', 'fierce', 'wild', 'primal', 'raw', 'core',
  'prime', 'ultra', 'omega',
  // Fitness (40)
  'squat', 'deadlift', 'bench', 'curl', 'press', 'flex', 'pump',
  'grind', 'rep', 'set', 'max', 'lift', 'pull', 'push', 'sprint',
  'endure', 'recover', 'gains', 'bulk', 'shred', 'lean', 'ripped',
  'beast', 'warrior', 'champion', 'athlete', 'legend', 'muscle',
  'sweat', 'hustle', 'drive', 'focus', 'grit', 'resolve', 'peak',
  'summit', 'climb', 'rise', 'ascend', 'evolve',
  // Gaming (40)
  'arena', 'shield', 'quest', 'raid', 'guild', 'loot', 'boss',
  'level', 'rank', 'elite', 'mythic', 'epic', 'rare', 'master',
  'rogue', 'knight', 'mage', 'scout', 'hunter', 'sniper', 'tank',
  'healer', 'spawn', 'combo', 'crit', 'dodge', 'parry', 'block',
  'counter', 'flank', 'siege', 'clash', 'duel', 'bounty', 'trophy',
  'crown', 'throne', 'castle', 'fortress', 'bastion',
  // Elements (40)
  'ember', 'frost', 'shadow', 'flame', 'spark', 'crystal', 'void',
  'pulse', 'bolt', 'flash', 'blaze', 'inferno', 'glacier', 'torrent',
  'quake', 'tremor', 'vortex', 'cyclone', 'typhoon', 'eclipse',
  'nova', 'comet', 'meteor', 'solar', 'lunar', 'astral', 'cosmic',
  'plasma', 'photon', 'neon', 'chrome', 'obsidian', 'onyx', 'cobalt',
  'titanium', 'carbon', 'granite', 'magma', 'vapor', 'aether',
  // Military (40)
  'delta', 'bravo', 'alpha', 'sigma', 'viper', 'falcon',
  'eagle', 'hawk', 'wolf', 'cobra', 'panther', 'lion', 'bear',
  'raptor', 'phoenix', 'dragon', 'hydra', 'kraken', 'golem',
  'sentinel', 'guardian', 'warden', 'marshal', 'general', 'captain',
  'major', 'colonel', 'legion', 'brigade', 'squad', 'platoon',
  'recon', 'stealth', 'tactical', 'ballistic', 'kinetic', 'vector',
  'cipher', 'protocol', 'outpost', 'bunker',
  // Tech (40)
  'binary', 'matrix', 'nexus', 'quantum', 'neural', 'synth', 'cyber',
  'nano', 'turbo', 'nitro', 'rocket', 'missile', 'orbital', 'hyper',
  'sonic', 'warp', 'rift', 'portal', 'beacon', 'signal', 'relay',
  'anchor', 'vertex', 'prism', 'zenith', 'horizon', 'genesis',
  'catalyst', 'fusion', 'reactor', 'dynamo', 'piston', 'torque',
  'voltage', 'circuit', 'grid', 'sector', 'module', 'system', 'deploy',
  // Nature (40)
  'stone', 'river', 'mountain', 'ocean', 'desert', 'jungle', 'ridge',
  'canyon', 'cliff', 'timber', 'cedar', 'oak', 'pine',
  'thorn', 'fang', 'claw', 'talon', 'horn', 'tusk', 'scale',
  'venom', 'sting', 'prowl', 'stalk', 'hunt', 'prey', 'pack',
  'herd', 'swarm', 'den', 'lair', 'nest', 'burrow',
  'vale', 'marsh', 'dune', 'crater', 'trench', 'gorge', 'spire'
];

/**
 * Generate a 12-word recovery phrase using crypto-secure randomness.
 */
export function generatePhrase() {
  const indices = new Uint32Array(12);
  crypto.getRandomValues(indices);
  return Array.from(indices)
    .map(n => IRONCORE_WORDLIST[n % IRONCORE_WORDLIST.length])
    .join(' ');
}

/**
 * SHA-256 hash of a recovery phrase (normalized).
 */
export async function hashPhrase(phrase) {
  const normalized = phrase.toLowerCase().trim().replace(/\s+/g, ' ');
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash of a 6-digit PIN.
 */
export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate username: 3-20 chars, lowercase alphanumeric + underscore, starts with letter.
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return { valid: false, error: 'Username is required' };
  const clean = username.replace(/^@/, '').toLowerCase();
  if (clean.length < 3) return { valid: false, error: 'At least 3 characters' };
  if (clean.length > 20) return { valid: false, error: 'Max 20 characters' };
  if (!/^[a-z][a-z0-9_]*$/.test(clean)) return { valid: false, error: 'Letters, numbers, underscores only. Must start with a letter.' };
  return { valid: true, clean };
}

export { IRONCORE_WORDLIST };
