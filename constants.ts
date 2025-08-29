import type { Player } from './types';

export const BODY_STRENGTH_REALMS: { [key: number]: string } = {
  0: 'Phàm Thân',
  10: 'Cương Thân',
  50: 'Ngọc Thân',
  200: 'Lưu Ly Thân',
  1000: 'Kim Cương Bất Hoại Thân',
};

export const BODY_STRENGTH_COST = {
  base: 100,
  multiplier: 1.1,
};

export const INITIAL_PLAYER: Player = {
  name: 'Đạo Hữu',
  qi: 0,
  realmIndex: 0,
  bodyStrength: 0,
  karma: 0, 
  honorPoints: 0,
  linh_thach: 0,
  learnedTechniques: [],
  activeTechniqueId: null,
  pills: {},
  herbs: {},
  spiritualRoot: null,
  inventory: [],
  equipment: [],
  enlightenmentPoints: 0,
  unlockedInsights: [],
  purchasedHonorItems: [],
  pvpBuff: null,
  // FIX: Added missing 'learned_pvp_skills' property to match the Player type.
  learned_pvp_skills: [],
  guildId: null,
  guildName: null,
  guildLevel: null,
  guildExp: null,
};

export const GAME_TICK_MS = 1000;
export const GUILD_CREATION_COST = 100000; // Chi phí tạo Tông Môn
export const PVP_COOLDOWN_SECONDS = 300; // 5 minutes cooldown for PvP
export const MARKET_TAX_RATE = 0.05; // 5% tax
export const MARKET_LISTING_DURATION_HOURS = 24;


export const getGuildNextLevelExp = (currentLevel: number): number => {
    // Starts at 1,000,000 for level 1->2, and increases by 50% each level
    return Math.floor(500000 * Math.pow(1.5, currentLevel));
};

/**
 * NEW: Calculates the maximum number of members a guild can have at a certain level.
 * @param level The guild's level.
 * @returns The maximum number of members.
 */
export const getGuildMemberLimit = (level: number): number => {
    if (level <= 0) return 0;
    // Base 10 members at level 1, +2 members for each subsequent level.
    return 10 + (level - 1) * 2;
};


/**
 * Formats a large number into a readable string with suffixes (K, Triệu, Tỷ).
 * @param num The number to format.
 * @returns A formatted string.
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const n = Math.floor(num);

  if (n < 1000) {
    return n.toLocaleString('vi-VN');
  }
  if (n >= 1_000_000_000) {
    // Show up to 3 decimal places for billions, e.g. 1.234 Tỷ
    return `${parseFloat((n / 1_000_000_000).toFixed(3))} Tỷ`;
  }
  if (n >= 1_000_000) {
    // Show up to 2 decimal places for millions, e.g. 1.23 Triệu
    return `${parseFloat((n / 1_000_000).toFixed(2))} Triệu`;
  }
  // Show up to 1 decimal place for thousands, e.g. 1.2K
  return `${parseFloat((n / 1000).toFixed(1))}K`;
};


export const getGuildBonuses = (guildLevel: number | null) => {
    if (!guildLevel || guildLevel <= 1) return { qiBonus: 0, breakthroughBonus: 0 };
    // Example: +1% Qi gain and +0.2% breakthrough chance per level after level 1
    const levelBonus = guildLevel - 1;
    return {
        qiBonus: levelBonus * 0.01,
        breakthroughBonus: levelBonus * 0.002,
    };
};