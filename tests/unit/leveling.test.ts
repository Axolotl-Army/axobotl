import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLevelFromXp,
  getXpForLevel,
  formatLevelUpMessage,
  isOnCooldown,
  recordXpAwarded,
  clearCooldownStore,
  computeXpUpdate,
  DEFAULT_LEVEL_UP_MESSAGE,
  MAX_LEVEL_UP_ANNOUNCEMENTS,
} from '../../src/bot/utils/levelUtils';

// ── getLevelFromXp ────────────────────────────────────────────────────────────

describe('getLevelFromXp', () => {
  it('should return 0 when xp is 0', () => {
    expect(getLevelFromXp(0)).toBe(0);
  });

  it('should return 0 when xp is below level 1 threshold (< 50)', () => {
    expect(getLevelFromXp(49)).toBe(0);
    expect(getLevelFromXp(1)).toBe(0);
  });

  it('should return 1 when xp equals exactly 50', () => {
    expect(getLevelFromXp(50)).toBe(1);
  });

  it('should return 1 when xp is between level 1 and level 2 thresholds', () => {
    // Level 2 threshold = round(50 * 2^1.7385) ≈ 167
    expect(getLevelFromXp(51)).toBe(1);
    expect(getLevelFromXp(166)).toBe(1);
  });

  it('should return 2 when xp reaches the level 2 threshold (~167)', () => {
    const xpL2 = getXpForLevel(2);
    expect(getLevelFromXp(xpL2)).toBe(2);
  });

  it('should return 5 when xp reaches the level 5 threshold (~674)', () => {
    const xpL5 = getXpForLevel(5);
    expect(getLevelFromXp(xpL5)).toBe(5);
  });

  it('should return 10 when xp reaches the level 10 threshold (~2735)', () => {
    const xpL10 = getXpForLevel(10);
    expect(getLevelFromXp(xpL10)).toBe(10);
  });

  it('should handle negative xp by returning 0', () => {
    expect(getLevelFromXp(-100)).toBe(0);
  });
});

// ── getXpForLevel ─────────────────────────────────────────────────────────────

describe('getXpForLevel', () => {
  it('should return 0 for level 0', () => {
    expect(getXpForLevel(0)).toBe(0);
  });

  it('should return 50 for level 1', () => {
    expect(getXpForLevel(1)).toBe(50);
  });

  it('should return approximately 167 for level 2', () => {
    const xp = getXpForLevel(2);
    expect(xp).toBeGreaterThanOrEqual(165);
    expect(xp).toBeLessThanOrEqual(170);
  });

  it('should return approximately 821 for level 5', () => {
    // 50 * 5^1.7385 ≈ 820.7 → rounds to 821
    const xp = getXpForLevel(5);
    expect(xp).toBeGreaterThanOrEqual(818);
    expect(xp).toBeLessThanOrEqual(825);
  });

  it('should return approximately 2735 for level 10', () => {
    const xp = getXpForLevel(10);
    expect(xp).toBeGreaterThanOrEqual(2730);
    expect(xp).toBeLessThanOrEqual(2740);
  });

  it('should be monotonically increasing (each level requires more total XP)', () => {
    for (let l = 1; l < 50; l++) {
      expect(getXpForLevel(l + 1)).toBeGreaterThan(getXpForLevel(l));
    }
  });
});

// ── Level/XP round-trip ───────────────────────────────────────────────────────

describe('level/xp round-trip', () => {
  it('getLevelFromXp(getXpForLevel(L)) should equal L for levels 1 through 50', () => {
    for (let l = 1; l <= 50; l++) {
      const xp = getXpForLevel(l);
      expect(getLevelFromXp(xp)).toBe(l);
    }
  });
});

// ── formatLevelUpMessage ─────────────────────────────────────────────────────

describe('formatLevelUpMessage', () => {
  it('should replace {user} placeholder with the user mention', () => {
    const result = formatLevelUpMessage('Hello {user}!', '<@123>', 5);
    expect(result).toBe('Hello <@123>!');
  });

  it('should replace {level} placeholder with the level number', () => {
    const result = formatLevelUpMessage('You reached {level}!', '<@123>', 7);
    expect(result).toBe('You reached 7!');
  });

  it('should replace both placeholders in the same template', () => {
    const result = formatLevelUpMessage('GG {user}, level {level}!', '<@456>', 3);
    expect(result).toBe('GG <@456>, level 3!');
  });

  it('should use the default template when template is null', () => {
    const result = formatLevelUpMessage(null, '<@789>', 2);
    expect(result).toBe(DEFAULT_LEVEL_UP_MESSAGE.replace('{user}', '<@789>').replace('{level}', '2'));
  });

  it('should use the default template when template is an empty string', () => {
    const result = formatLevelUpMessage('', '<@789>', 2);
    expect(result).toBe(DEFAULT_LEVEL_UP_MESSAGE.replace('{user}', '<@789>').replace('{level}', '2'));
  });

  it('should produce the default format: "GG @user, you reached **level N**!"', () => {
    const result = formatLevelUpMessage(null, '<@111>', 10);
    expect(result).toBe('GG <@111>, you reached **level 10**!');
  });
});

// ── XP cooldown logic ─────────────────────────────────────────────────────────

describe('XP cooldown (isOnCooldown / recordXpAwarded)', () => {
  beforeEach(() => {
    clearCooldownStore();
  });

  it('should not be on cooldown for a new guild+user pair', () => {
    expect(isOnCooldown('guild1', 'user1')).toBe(false);
  });

  it('should be on cooldown immediately after XP is awarded', () => {
    const now = Date.now();
    recordXpAwarded('guild1', 'user1', now);
    expect(isOnCooldown('guild1', 'user1', now + 1)).toBe(true);
  });

  it('should not be on cooldown after the 60-second window has passed', () => {
    const now = Date.now();
    recordXpAwarded('guild1', 'user1', now);
    expect(isOnCooldown('guild1', 'user1', now + 60_001)).toBe(false);
  });

  it('should track cooldowns independently per guild', () => {
    const now = Date.now();
    recordXpAwarded('guild1', 'user1', now);
    expect(isOnCooldown('guild2', 'user1', now + 1)).toBe(false);
  });

  it('should track cooldowns independently per user within the same guild', () => {
    const now = Date.now();
    recordXpAwarded('guild1', 'user1', now);
    expect(isOnCooldown('guild1', 'user2', now + 1)).toBe(false);
  });
});

// ── computeXpUpdate ──────────────────────────────────────────────────────────

describe('computeXpUpdate', () => {
  it('should increase xp by the given amount', () => {
    const result = computeXpUpdate(100, 50);
    expect(result.newXp).toBe(150);
    expect(result.oldLevel).toBe(getLevelFromXp(100));
    expect(result.newLevel).toBe(getLevelFromXp(150));
  });

  it('should detect a level-up when XP crosses a level threshold', () => {
    // Level 1 starts at 50 XP; start just below and add enough to cross it
    const result = computeXpUpdate(40, 20);
    // 40 + 20 = 60 XP → level 1
    expect(result.newXp).toBe(60);
    expect(result.oldLevel).toBe(0);
    expect(result.newLevel).toBe(1);
    expect(result.shouldNotify).toBe(true);
    expect(result.levelsGained).toEqual([1]);
  });

  it('should return leveledUp: false when XP increase does not cross a threshold', () => {
    // Start at level 1 (50 XP), add a small amount that stays within level 1
    const result = computeXpUpdate(50, 5);
    expect(result.shouldNotify).toBe(false);
    expect(result.levelsGained).toEqual([]);
  });

  it('should detect multiple level-ups in a single large XP gain', () => {
    // Level 5 requires ~821 XP; add enough to jump from 0 to level 5+
    const xpL5 = getXpForLevel(5);
    const result = computeXpUpdate(0, xpL5);
    expect(result.newLevel).toBeGreaterThanOrEqual(5);
    expect(result.levelsGained.length).toBeGreaterThanOrEqual(5);
    expect(result.shouldNotify).toBe(true);
  });

  it('should not allow xp to go below 0 on subtraction (floor at 0)', () => {
    const result = computeXpUpdate(30, -100);
    expect(result.newXp).toBe(0);
    expect(result.newLevel).toBe(0);
  });

  it('should set xp to exactly the given value when using set mode', () => {
    const result = computeXpUpdate(999, 500, 'set');
    expect(result.newXp).toBe(500);
    expect(result.newLevel).toBe(getLevelFromXp(500));
  });

  it('should not trigger level-up notification when XP decreases', () => {
    // Start at level 5, reduce to level 2
    const xpL5 = getXpForLevel(5);
    const result = computeXpUpdate(xpL5, -getXpForLevel(3));
    expect(result.shouldNotify).toBe(false);
    expect(result.levelsGained).toEqual([]);
  });
});

// ── Business rules ────────────────────────────────────────────────────────────

describe('business rules', () => {
  it('should cap level-up notifications at 5 when multiple levels are skipped', () => {
    // Give enough XP to skip many levels at once (e.g. jump from 0 to level 20)
    const xpL20 = getXpForLevel(20);
    const result = computeXpUpdate(0, xpL20);
    // levelsGained should be 20 levels (1–20), but levelsToAnnounce should be just [20]
    expect(result.levelsGained.length).toBeGreaterThan(MAX_LEVEL_UP_ANNOUNCEMENTS);
    expect(result.levelsToAnnounce).toEqual([result.newLevel]);
    expect(result.levelsToAnnounce.length).toBe(1);
  });

  it('should not allow XP to exceed Number.MAX_SAFE_INTEGER', () => {
    const result = computeXpUpdate(Number.MAX_SAFE_INTEGER, 1);
    expect(result.newXp).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
  });
});
