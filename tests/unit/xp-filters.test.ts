import { describe, it, expect } from 'vitest';
import { passesRoleFilter, passesChannelFilter } from '../../src/bot/utils/levelUtils';

describe('XP Filters', () => {
  describe('passesRoleFilter', () => {
    it('should return true when filterIds is empty (no filtering) regardless of mode', () => {
      const memberRoles = new Set(['role1', 'role2']);
      expect(passesRoleFilter(memberRoles, 'include', [])).toBe(true);
      expect(passesRoleFilter(memberRoles, 'exclude', [])).toBe(true);
      expect(passesRoleFilter(new Set(), 'include', [])).toBe(true);
      expect(passesRoleFilter(new Set(), 'exclude', [])).toBe(true);
    });

    it('should return true in include mode when user has at least one listed role', () => {
      const memberRoles = new Set(['role1', 'role2', 'role3']);
      expect(passesRoleFilter(memberRoles, 'include', ['role2'])).toBe(true);
      expect(passesRoleFilter(memberRoles, 'include', ['role1', 'role99'])).toBe(true);
    });

    it('should return false in include mode when user has none of the listed roles', () => {
      const memberRoles = new Set(['role1', 'role2']);
      expect(passesRoleFilter(memberRoles, 'include', ['role99'])).toBe(false);
      expect(passesRoleFilter(memberRoles, 'include', ['role88', 'role99'])).toBe(false);
      expect(passesRoleFilter(new Set(), 'include', ['role1'])).toBe(false);
    });

    it('should return true in exclude mode when user has none of the listed roles', () => {
      const memberRoles = new Set(['role1', 'role2']);
      expect(passesRoleFilter(memberRoles, 'exclude', ['role99'])).toBe(true);
      expect(passesRoleFilter(memberRoles, 'exclude', ['role88', 'role99'])).toBe(true);
      expect(passesRoleFilter(new Set(), 'exclude', ['role1'])).toBe(true);
    });

    it('should return false in exclude mode when user has at least one listed role', () => {
      const memberRoles = new Set(['role1', 'role2', 'role3']);
      expect(passesRoleFilter(memberRoles, 'exclude', ['role2'])).toBe(false);
      expect(passesRoleFilter(memberRoles, 'exclude', ['role1', 'role99'])).toBe(false);
    });
  });

  describe('passesChannelFilter', () => {
    it('should return true when filterIds is empty (no filtering) regardless of mode', () => {
      expect(passesChannelFilter('ch1', 'include', [])).toBe(true);
      expect(passesChannelFilter('ch1', 'exclude', [])).toBe(true);
    });

    it('should return true in include mode when channel is in the list', () => {
      expect(passesChannelFilter('ch1', 'include', ['ch1', 'ch2'])).toBe(true);
      expect(passesChannelFilter('ch2', 'include', ['ch1', 'ch2'])).toBe(true);
    });

    it('should return false in include mode when channel is not in the list', () => {
      expect(passesChannelFilter('ch3', 'include', ['ch1', 'ch2'])).toBe(false);
      expect(passesChannelFilter('ch99', 'include', ['ch1'])).toBe(false);
    });

    it('should return true in exclude mode when channel is not in the list', () => {
      expect(passesChannelFilter('ch3', 'exclude', ['ch1', 'ch2'])).toBe(true);
      expect(passesChannelFilter('ch99', 'exclude', ['ch1'])).toBe(true);
    });

    it('should return false in exclude mode when channel is in the list', () => {
      expect(passesChannelFilter('ch1', 'exclude', ['ch1', 'ch2'])).toBe(false);
      expect(passesChannelFilter('ch2', 'exclude', ['ch1', 'ch2'])).toBe(false);
    });
  });

  describe('combined filters (AND logic)', () => {
    it('should pass when both role and channel filters pass', () => {
      const memberRoles = new Set(['role1']);
      expect(
        passesRoleFilter(memberRoles, 'include', ['role1']) &&
          passesChannelFilter('ch1', 'include', ['ch1']),
      ).toBe(true);
    });

    it('should fail when role filter passes but channel filter fails', () => {
      const memberRoles = new Set(['role1']);
      expect(
        passesRoleFilter(memberRoles, 'include', ['role1']) &&
          passesChannelFilter('ch99', 'include', ['ch1']),
      ).toBe(false);
    });

    it('should fail when channel filter passes but role filter fails', () => {
      const memberRoles = new Set(['role1']);
      expect(
        passesRoleFilter(memberRoles, 'include', ['role99']) &&
          passesChannelFilter('ch1', 'include', ['ch1']),
      ).toBe(false);
    });

    it('should pass when both filter lists are empty (no restrictions)', () => {
      const memberRoles = new Set(['role1']);
      expect(
        passesRoleFilter(memberRoles, 'include', []) &&
          passesChannelFilter('ch1', 'include', []),
      ).toBe(true);
      expect(
        passesRoleFilter(memberRoles, 'exclude', []) &&
          passesChannelFilter('ch1', 'exclude', []),
      ).toBe(true);
    });
  });

  describe('API config validation', () => {
    // Validators extracted for testability
    const validators: Record<string, (v: unknown) => boolean> = {
      roleFilterMode: (v) => v === 'include' || v === 'exclude',
      roleFilterIds: (v) =>
        Array.isArray(v) &&
        v.length <= 50 &&
        v.every((s) => typeof s === 'string' && s.length >= 1 && s.length <= 20),
      channelFilterMode: (v) => v === 'include' || v === 'exclude',
      channelFilterIds: (v) =>
        Array.isArray(v) &&
        v.length <= 50 &&
        v.every((s) => typeof s === 'string' && s.length >= 1 && s.length <= 20),
    };

    it('should accept valid roleFilterMode values (include/exclude)', () => {
      expect(validators.roleFilterMode('include')).toBe(true);
      expect(validators.roleFilterMode('exclude')).toBe(true);
    });

    it('should reject invalid roleFilterMode values', () => {
      expect(validators.roleFilterMode('both')).toBe(false);
      expect(validators.roleFilterMode(123)).toBe(false);
      expect(validators.roleFilterMode(null)).toBe(false);
      expect(validators.roleFilterMode('')).toBe(false);
    });

    it('should accept valid roleFilterIds (array of snowflake strings)', () => {
      expect(validators.roleFilterIds([])).toBe(true);
      expect(validators.roleFilterIds(['123456789'])).toBe(true);
      expect(validators.roleFilterIds(['1', '22', '333'])).toBe(true);
    });

    it('should reject roleFilterIds with more than 50 entries', () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => String(i));
      expect(validators.roleFilterIds(tooMany)).toBe(false);
    });

    it('should reject roleFilterIds that are not arrays', () => {
      expect(validators.roleFilterIds('not-array')).toBe(false);
      expect(validators.roleFilterIds(123)).toBe(false);
      expect(validators.roleFilterIds(null)).toBe(false);
    });

    it('should accept valid channelFilterMode values (include/exclude)', () => {
      expect(validators.channelFilterMode('include')).toBe(true);
      expect(validators.channelFilterMode('exclude')).toBe(true);
    });

    it('should accept valid channelFilterIds (array of snowflake strings)', () => {
      expect(validators.channelFilterIds([])).toBe(true);
      expect(validators.channelFilterIds(['123456789012345'])).toBe(true);
    });

    it('should reject channelFilterIds with more than 50 entries', () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => String(i));
      expect(validators.channelFilterIds(tooMany)).toBe(false);
    });
  });
});
