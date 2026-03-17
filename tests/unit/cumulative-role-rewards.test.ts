import { describe, it, expect } from 'vitest';
import {
  computeRoleRewardActions,
  type RoleRewardEntry,
} from '../../src/bot/utils/levelUtils';

// ── computeRoleRewardActions ───────────────────────────────────────────────────

describe('computeRoleRewardActions', () => {
  const bronze: RoleRewardEntry = { level: 5, roleId: 'role-bronze', cumulative: false };
  const silver: RoleRewardEntry = { level: 10, roleId: 'role-silver', cumulative: false };
  const gold: RoleRewardEntry = { level: 20, roleId: 'role-gold', cumulative: false };
  const veteran: RoleRewardEntry = { level: 15, roleId: 'role-veteran', cumulative: true };
  const earlyBird: RoleRewardEntry = { level: 3, roleId: 'role-earlybird', cumulative: true };

  describe('adding roles', () => {
    it('should add all earned roles the user does not have', () => {
      const result = computeRoleRewardActions(
        [bronze, silver],
        10,
        new Set<string>(),
      );

      expect(result.toAdd).toContain('role-bronze');
      expect(result.toAdd).toContain('role-silver');
    });

    it('should not add roles the user already has', () => {
      const result = computeRoleRewardActions(
        [bronze, silver],
        10,
        new Set(['role-bronze', 'role-silver']),
      );

      expect(result.toAdd).toHaveLength(0);
    });

    it('should not add roles above the current level', () => {
      const result = computeRoleRewardActions(
        [bronze, silver, gold],
        7,
        new Set<string>(),
      );

      expect(result.toAdd).toContain('role-bronze');
      expect(result.toAdd).not.toContain('role-silver');
      expect(result.toAdd).not.toContain('role-gold');
    });
  });

  describe('non-cumulative removal', () => {
    it('should remove non-cumulative roles below the highest earned', () => {
      const result = computeRoleRewardActions(
        [bronze, silver],
        10,
        new Set(['role-bronze', 'role-silver']),
      );

      expect(result.toRemove).toContain('role-bronze');
      expect(result.toRemove).not.toContain('role-silver');
    });

    it('should remove all non-cumulative roles below highest, not just the previous one', () => {
      const result = computeRoleRewardActions(
        [bronze, silver, gold],
        20,
        new Set(['role-bronze', 'role-silver', 'role-gold']),
      );

      expect(result.toRemove).toContain('role-bronze');
      expect(result.toRemove).toContain('role-silver');
      expect(result.toRemove).not.toContain('role-gold');
      expect(result.toRemove).toHaveLength(2);
    });

    it('should not remove roles when only one non-cumulative role is earned', () => {
      const result = computeRoleRewardActions(
        [bronze, silver],
        5,
        new Set(['role-bronze']),
      );

      expect(result.toRemove).toHaveLength(0);
    });

    it('should not remove any roles when none are earned', () => {
      const result = computeRoleRewardActions(
        [bronze, silver],
        2,
        new Set<string>(),
      );

      expect(result.toRemove).toHaveLength(0);
      expect(result.toAdd).toHaveLength(0);
    });
  });

  describe('cumulative roles', () => {
    it('should never include cumulative roles in toRemove', () => {
      const result = computeRoleRewardActions(
        [earlyBird, bronze, silver, veteran],
        15,
        new Set(['role-earlybird', 'role-bronze', 'role-silver', 'role-veteran']),
      );

      expect(result.toRemove).not.toContain('role-earlybird');
      expect(result.toRemove).not.toContain('role-veteran');
    });

    it('should add cumulative roles like any other role', () => {
      const result = computeRoleRewardActions(
        [veteran],
        15,
        new Set<string>(),
      );

      expect(result.toAdd).toContain('role-veteran');
      expect(result.toRemove).toHaveLength(0);
    });
  });

  describe('mixed cumulative and non-cumulative', () => {
    it('should handle the Bronze/Silver/Veteran scenario correctly', () => {
      // Config: L5=Bronze(non-cum), L10=Silver(non-cum), L15=Veteran(cum)
      // User at level 15: gets Silver + Veteran, loses Bronze
      const result = computeRoleRewardActions(
        [bronze, silver, veteran],
        15,
        new Set(['role-bronze']),
      );

      // Should add Silver and Veteran (user doesn't have them)
      expect(result.toAdd).toContain('role-silver');
      expect(result.toAdd).toContain('role-veteran');

      // Should remove Bronze (non-cumulative, below Silver)
      expect(result.toRemove).toContain('role-bronze');
      expect(result.toRemove).not.toContain('role-veteran');
    });

    it('should keep cumulative roles even when surrounded by non-cumulative ones', () => {
      // L3=EarlyBird(cum), L5=Bronze(non-cum), L10=Silver(non-cum)
      const result = computeRoleRewardActions(
        [earlyBird, bronze, silver],
        10,
        new Set(['role-earlybird', 'role-bronze', 'role-silver']),
      );

      // EarlyBird is cumulative -- never removed
      expect(result.toRemove).not.toContain('role-earlybird');
      // Bronze is non-cumulative and below Silver -- removed
      expect(result.toRemove).toContain('role-bronze');
      expect(result.toRemove).toHaveLength(1);
    });

    it('should handle user with no roles at level 20 with full config', () => {
      // All rewards earned, user starts fresh (e.g. rejoined server)
      const result = computeRoleRewardActions(
        [earlyBird, bronze, silver, veteran, gold],
        20,
        new Set<string>(),
      );

      // All should be added
      expect(result.toAdd).toHaveLength(5);

      // Bronze and Silver should be removed (non-cum below Gold)
      expect(result.toRemove).toContain('role-bronze');
      expect(result.toRemove).toContain('role-silver');
      expect(result.toRemove).not.toContain('role-gold');
      expect(result.toRemove).not.toContain('role-earlybird');
      expect(result.toRemove).not.toContain('role-veteran');
    });
  });

  describe('edge cases', () => {
    it('should return empty actions for empty role rewards', () => {
      const result = computeRoleRewardActions([], 50, new Set<string>());

      expect(result.toAdd).toHaveLength(0);
      expect(result.toRemove).toHaveLength(0);
    });

    it('should handle all-cumulative configs without removing anything', () => {
      const result = computeRoleRewardActions(
        [earlyBird, veteran],
        20,
        new Set(['role-earlybird', 'role-veteran']),
      );

      expect(result.toAdd).toHaveLength(0);
      expect(result.toRemove).toHaveLength(0);
    });

    it('should handle unsorted input correctly', () => {
      // Roles in reverse order
      const result = computeRoleRewardActions(
        [silver, bronze],
        10,
        new Set<string>(),
      );

      expect(result.toAdd).toContain('role-bronze');
      expect(result.toAdd).toContain('role-silver');
      expect(result.toRemove).toContain('role-bronze');
      expect(result.toRemove).not.toContain('role-silver');
    });
  });
});
