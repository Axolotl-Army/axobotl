// Shared leveling formula constants and pure functions.
// Used by both the bot (levelUtils.ts) and the dashboard (settings preview).

export const XP_COEFFICIENT = 50;
export const XP_EXPONENT = 1.7385;

/** Total XP required to reach the given level. Returns 0 for level <= 0. */
export function getXpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.round(XP_COEFFICIENT * Math.pow(level, XP_EXPONENT));
}

/** Current level derived from total accumulated XP. Returns 0 if below level 1 threshold. */
export function getLevelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 0;
  let l = Math.floor(Math.pow(totalXp / XP_COEFFICIENT, 1 / XP_EXPONENT));
  while (getXpForLevel(l + 1) <= totalXp) l++;
  while (l > 0 && getXpForLevel(l) > totalXp) l--;
  return l;
}
