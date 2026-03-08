// ── Constants ─────────────────────────────────────────────────────────────────

const XP_COEFFICIENT = 50;
const XP_EXPONENT = 1.7385;
const COOLDOWN_MS = 60_000;
const XP_MIN = 7;
const XP_MAX = 13;
const DEFAULT_LEVEL_UP_MESSAGE = 'GG {user}, you reached **level {level}**!';
const MAX_LEVEL_UP_ANNOUNCEMENTS = 5;

// ── Leveling formula ──────────────────────────────────────────────────────────

/** Total XP required to reach the given level. Returns 0 for level <= 0. */
export function getXpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.round(XP_COEFFICIENT * Math.pow(level, XP_EXPONENT));
}

/** Current level derived from total accumulated XP. Returns 0 if below level 1 threshold. */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 0;
  // Continuous approximation as starting point
  let l = Math.floor(Math.pow(totalXp / XP_COEFFICIENT, 1 / XP_EXPONENT));
  // Adjust for rounding in getXpForLevel: step up while the next threshold is still reachable
  while (getXpForLevel(l + 1) <= totalXp) l++;
  // Guard against overshoot
  while (l > 0 && getXpForLevel(l) > totalXp) l--;
  return l;
}

// ── Message formatting ────────────────────────────────────────────────────────

/** Formats the level-up message, substituting {user} and {level} placeholders. */
export function formatLevelUpMessage(
  template: string | null | undefined,
  userMention: string,
  level: number,
): string {
  const tpl = template?.trim() || DEFAULT_LEVEL_UP_MESSAGE;
  return tpl.replace(/\{user\}/g, userMention).replace(/\{level\}/g, String(level));
}

// ── XP update computation ─────────────────────────────────────────────────────

export interface XpUpdateResult {
  newXp: number;
  oldLevel: number;
  newLevel: number;
  /** Levels crossed (ascending). Empty when XP decreases or no level-up occurred. */
  levelsGained: number[];
  /** Whether to post level-up notifications (true only when levels were gained). */
  shouldNotify: boolean;
  /**
   * Levels to actually announce. Equals levelsGained when <= MAX_LEVEL_UP_ANNOUNCEMENTS,
   * otherwise contains only [newLevel] to avoid flooding.
   */
  levelsToAnnounce: number[];
}

/**
 * Computes the result of adding `delta` XP to `currentXp`.
 * Pass a negative delta for removal, or use mode='set' with a non-negative `delta` to overwrite.
 */
export function computeXpUpdate(
  currentXp: number,
  delta: number,
  mode: 'add' | 'set' = 'add',
): XpUpdateResult {
  const oldLevel = getLevelFromXp(currentXp);

  let newXp: number;
  if (mode === 'set') {
    newXp = Math.max(0, Math.min(delta, Number.MAX_SAFE_INTEGER));
  } else {
    newXp = Math.max(0, Math.min(currentXp + delta, Number.MAX_SAFE_INTEGER));
  }

  const newLevel = getLevelFromXp(newXp);
  const levelsGained: number[] = [];

  if (newLevel > oldLevel) {
    for (let l = oldLevel + 1; l <= newLevel; l++) {
      levelsGained.push(l);
    }
  }

  const shouldNotify = levelsGained.length > 0;
  const levelsToAnnounce =
    levelsGained.length > MAX_LEVEL_UP_ANNOUNCEMENTS ? [newLevel] : levelsGained;

  return { newXp, oldLevel, newLevel, levelsGained, shouldNotify, levelsToAnnounce };
}

// ── Cooldown tracking ────────────────────────────────────────────────────────

/** In-memory cooldown store: key = `${guildId}:${userId}`, value = timestamp of last award */
const cooldownStore = new Map<string, number>();

function cooldownKey(guildId: string, userId: string): string {
  return `${guildId}:${userId}`;
}

/** Returns true if the user is still within the XP cooldown window for this guild. */
export function isOnCooldown(guildId: string, userId: string, now = Date.now()): boolean {
  const last = cooldownStore.get(cooldownKey(guildId, userId));
  if (last === undefined) return false;
  return now - last < COOLDOWN_MS;
}

/** Records that XP was just awarded to this user in this guild. */
export function recordXpAwarded(guildId: string, userId: string, now = Date.now()): void {
  cooldownStore.set(cooldownKey(guildId, userId), now);
}

/** Clears the cooldown store — exposed for testing only. */
export function clearCooldownStore(): void {
  cooldownStore.clear();
}

// ── Random XP per message ─────────────────────────────────────────────────────

/** Returns a random integer in [XP_MIN, XP_MAX] inclusive. */
export function randomXp(): number {
  return XP_MIN + Math.floor(Math.random() * (XP_MAX - XP_MIN + 1));
}

export { DEFAULT_LEVEL_UP_MESSAGE, COOLDOWN_MS, XP_MIN, XP_MAX, MAX_LEVEL_UP_ANNOUNCEMENTS };
