import { describe, it, expect, beforeEach } from 'vitest';
import {
  getLevelFromXp,
  getXpForLevel,
  formatLevelUpMessage,
  formatRewardMessage,
  isOnCooldown,
  recordXpAwarded,
  clearCooldownStore,
  computeXpUpdate,
  computeRoleMultiplier,
  DEFAULT_LEVEL_UP_MESSAGE,
  DEFAULT_REWARD_MESSAGE,
  MAX_LEVEL_UP_ANNOUNCEMENTS,
  XP_MAX_VALUE,
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
  const ctx = (overrides = {}) => ({
    userMention: '<@123>',
    level: 5,
    oldLevel: 4,
    xp: 821,
    oldXp: 810,
    ...overrides,
  });

  it('should replace {user} placeholder with the user mention', () => {
    const result = formatLevelUpMessage('Hello {user}!', ctx());
    expect(result).toBe('Hello <@123>!');
  });

  it('should replace {level} placeholder with the level number', () => {
    const result = formatLevelUpMessage('You reached {level}!', ctx({ level: 7 }));
    expect(result).toBe('You reached 7!');
  });

  it('should replace {old_level} placeholder with the previous level', () => {
    const result = formatLevelUpMessage('{old_level} -> {level}', ctx({ oldLevel: 44, level: 45 }));
    expect(result).toBe('44 -> 45');
  });

  it('should replace {xp} and {old_xp} placeholders', () => {
    const result = formatLevelUpMessage('{old_xp} -> {xp}', ctx({ oldXp: 1330, xp: 1345 }));
    expect(result).toBe('1330 -> 1345');
  });

  it('should replace all placeholders together', () => {
    const result = formatLevelUpMessage(
      '{user} went from {old_level} ({old_xp}) to {level} ({xp})',
      ctx({ userMention: '<@456>', oldLevel: 4, level: 5, oldXp: 810, xp: 821 }),
    );
    expect(result).toBe('<@456> went from 4 (810) to 5 (821)');
  });

  it('should not treat {level} inside {old_level} as a separate replacement', () => {
    // {old_level} must be replaced before {level} to avoid partial corruption
    const result = formatLevelUpMessage('{old_level}/{level}', ctx({ oldLevel: 4, level: 5 }));
    expect(result).toBe('4/5');
  });

  it('should use the default template when template is null', () => {
    const result = formatLevelUpMessage(null, ctx({ userMention: '<@789>', level: 2 }));
    expect(result).toBe('GG <@789>, you reached **level 2**!');
  });

  it('should use the default template when template is an empty string', () => {
    const result = formatLevelUpMessage('', ctx({ userMention: '<@789>', level: 2 }));
    expect(result).toBe('GG <@789>, you reached **level 2**!');
  });

  it('should produce the default format', () => {
    const result = formatLevelUpMessage(null, ctx({ userMention: '<@111>', level: 10 }));
    expect(result).toBe('GG <@111>, you reached **level 10**!');
  });

  it('exposes DEFAULT_LEVEL_UP_MESSAGE matching the actual default', () => {
    expect(DEFAULT_LEVEL_UP_MESSAGE).toBe('GG {user}, you reached **level {level}**!');
  });
});

// ── formatRewardMessage ──────────────────────────────────────────────────────

describe('formatRewardMessage', () => {
  const ctx = (overrides = {}) => ({
    userMention: '<@123>',
    level: 5,
    roleMention: '<@&999>',
    roleName: 'Veteran',
    reward: '',
    ...overrides,
  });

  it('should use the default template when template is null', () => {
    const result = formatRewardMessage(null, ctx());
    expect(result).toBe('<@123> earned a new role reward: **<@&999>**');
  });

  it('should append reward description with em-dash when present', () => {
    const result = formatRewardMessage(null, ctx({ reward: 'access to #veterans' }));
    expect(result).toBe('<@123> earned a new role reward: **<@&999>** — access to #veterans');
  });

  it('should replace {user}, {level}, {role}, {reward} in custom template', () => {
    const result = formatRewardMessage(
      '{user} at level {level}: {role}{reward}',
      ctx({ level: 10, reward: 'can post pics' }),
    );
    expect(result).toBe('<@123> at level 10: <@&999> — can post pics');
  });

  it('should replace {reward} with empty string when no description', () => {
    const result = formatRewardMessage(
      '{user} got {role}{reward}!',
      ctx({ reward: '' }),
    );
    expect(result).toBe('<@123> got <@&999>!');
  });

  it('should fall back to role name when role mention is empty', () => {
    const result = formatRewardMessage('{role}', ctx({ roleMention: '', roleName: 'Veteran' }));
    expect(result).toBe('Veteran');
  });

  it('should use default when template is empty string', () => {
    const result = formatRewardMessage('', ctx({ reward: 'access' }));
    expect(result).toBe('<@123> earned a new role reward: **<@&999>** — access');
  });

  it('exposes DEFAULT_REWARD_MESSAGE matching the actual default', () => {
    expect(DEFAULT_REWARD_MESSAGE).toBe('{user} earned a new role reward: **{role}**{reward}');
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

  it('should not allow XP to exceed the PostgreSQL INTEGER max (2,147,483,647)', () => {
    const result = computeXpUpdate(XP_MAX_VALUE, 1);
    expect(result.newXp).toBe(XP_MAX_VALUE);
  });
});

// ── computeRoleMultiplier ────────────────────────────────────────────────────

describe('computeRoleMultiplier', () => {
  const multipliers = [
    { roleId: 'booster', multiplier: 1.5 },
    { roleId: 'vip', multiplier: 2.0 },
    { roleId: 'patron', multiplier: 3.0 },
  ];

  it('should return 1.0 when no roles match', () => {
    const memberRoles = new Set(['other']);
    expect(computeRoleMultiplier(memberRoles, multipliers, 'highest')).toBe(1.0);
  });

  it('should return 1.0 when multipliers array is empty', () => {
    const memberRoles = new Set(['booster']);
    expect(computeRoleMultiplier(memberRoles, [], 'highest')).toBe(1.0);
  });

  it('should return the single matching multiplier', () => {
    const memberRoles = new Set(['booster']);
    expect(computeRoleMultiplier(memberRoles, multipliers, 'highest')).toBe(1.5);
  });

  describe('highest mode', () => {
    it('should return the highest multiplier among matched roles', () => {
      const memberRoles = new Set(['booster', 'vip']);
      expect(computeRoleMultiplier(memberRoles, multipliers, 'highest')).toBe(2.0);
    });

    it('should return the highest even with all roles', () => {
      const memberRoles = new Set(['booster', 'vip', 'patron']);
      expect(computeRoleMultiplier(memberRoles, multipliers, 'highest')).toBe(3.0);
    });
  });

  describe('multiply mode', () => {
    it('should multiply matched multipliers together', () => {
      const memberRoles = new Set(['booster', 'vip']);
      expect(computeRoleMultiplier(memberRoles, multipliers, 'multiply')).toBeCloseTo(3.0);
    });

    it('should multiply all three', () => {
      const memberRoles = new Set(['booster', 'vip', 'patron']);
      expect(computeRoleMultiplier(memberRoles, multipliers, 'multiply')).toBeCloseTo(9.0);
    });
  });

  describe('additive mode', () => {
    it('should sum the bonus portions', () => {
      // 1 + (1.5-1) + (2.0-1) = 1 + 0.5 + 1.0 = 2.5
      const memberRoles = new Set(['booster', 'vip']);
      expect(computeRoleMultiplier(memberRoles, multipliers, 'additive')).toBeCloseTo(2.5);
    });

    it('should sum all three bonus portions', () => {
      // 1 + 0.5 + 1.0 + 2.0 = 4.5
      const memberRoles = new Set(['booster', 'vip', 'patron']);
      expect(computeRoleMultiplier(memberRoles, multipliers, 'additive')).toBeCloseTo(4.5);
    });
  });

  it('should default to highest mode when mode is omitted', () => {
    const memberRoles = new Set(['booster', 'vip']);
    expect(computeRoleMultiplier(memberRoles, multipliers)).toBe(2.0);
  });
});
