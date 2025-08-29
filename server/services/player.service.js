const pool = require('../config/database');
const { getGameData } = require('../services/gameData.service');

// --- Helper Functions ---

/**
 * NEW: A helper function to parse all TEXT fields that should be JSON.
 * This is crucial for the SQLite migration.
 * @param {object} playerRow The raw row object from the SQLite database.
 * @returns {object} A player object with all necessary fields parsed into objects/arrays.
 */
const parsePlayerFromDBRow = (playerRow) => {
    if (!playerRow) return null;
    const p = { ...playerRow };

    try {
        p.pills = typeof p.pills === 'string' ? JSON.parse(p.pills) : (p.pills || {});
        p.herbs = typeof p.herbs === 'string' ? JSON.parse(p.herbs) : (p.herbs || {});
        p.lastChallengeTime = typeof p.lastChallengeTime === 'string' ? JSON.parse(p.lastChallengeTime) : (p.lastChallengeTime || {});
        p.learnedTechniques = typeof p.learnedTechniques === 'string' ? JSON.parse(p.learnedTechniques) : (p.learnedTechniques || []);
        p.unlockedInsights = typeof p.unlockedInsights === 'string' ? JSON.parse(p.unlockedInsights) : (p.unlockedInsights || []);
        p.purchasedHonorItems = typeof p.purchasedHonorItems === 'string' ? JSON.parse(p.purchasedHonorItems) : (p.purchasedHonorItems || []);
        p.explorationStatus = typeof p.explorationStatus === 'string' ? JSON.parse(p.explorationStatus) : (p.explorationStatus || null);
        p.pvpBuff = typeof p.pvpBuff === 'string' ? JSON.parse(p.pvpBuff) : (p.pvpBuff || null);
        p.learned_pvp_skills = typeof p.learned_pvp_skills === 'string' ? JSON.parse(p.learned_pvp_skills) : (p.learned_pvp_skills || []);
    } catch (e) {
        console.error(`Failed to parse JSON for player ${p.name}:`, e);
    }

    return p;
};


const calculateTotalBonuses = async (conn, player) => {
    const gameData = getGameData();
    const bonuses = { 
      qiMultiplier: 1, 
      breakthroughBonus: 0, 
      qiBonus: 0, 
      qiPerSecondAdd: 0,
      hpAdd: 0,
      atkAdd: 0,
      defAdd: 0,
      hpMul: 1,
      atkMul: 1,
      defMul: 1,
      bodyTemperMultiplier: 1,
      bodyTemperEffectAdd: 0, 
      alchemySuccessAdd: 0,
      speed_add: 0,
      crit_rate_add: 0,
      crit_damage_add: 0,
      dodge_rate_add: 0,
      lifesteal_rate_add: 0,
      counter_rate_add: 0,
      hit_rate_add: 0,
      crit_resist_add: 0,
      lifesteal_resist_add: 0,
      counter_resist_add: 0,
    };

    // Technique bonuses
    if (player.activeTechniqueId) {
        const technique = gameData.TECHNIQUES.find(t => t.id === player.activeTechniqueId);
        technique?.bonuses.forEach(bonus => {
            if (bonus.type === 'qi_per_second_multiplier') bonuses.qiMultiplier *= bonus.value;
            else if (bonus.type === 'breakthrough_chance_add') bonuses.breakthroughBonus += bonus.value;
        });
    }

    // Guild bonuses
    if (player.guildId && player.guildLevel) {
        if (player.guildLevel > 1) {
            const levelBonus = player.guildLevel - 1;
            bonuses.qiBonus += levelBonus * 0.01;
            bonuses.breakthroughBonus += levelBonus * 0.002;
        }
    }
    
    // Spiritual Root bonuses
    if (player.spiritualRoot) {
        const root = gameData.SPIRITUAL_ROOTS.find(r => r.id === player.spiritualRoot);
        if (root?.bonus.type === 'qi_per_second_add') bonuses.qiPerSecondAdd = root.bonus.value;
        if (root?.bonus.type === 'hp_mul') bonuses.hpMul *= root.bonus.value;
        if (root?.bonus.type === 'atk_mul') bonuses.atkMul *= root.bonus.value;
        if (root?.bonus.type === 'def_mul') bonuses.defMul *= root.bonus.value;
        if (root?.bonus.type === 'body_temper_eff_mul') bonuses.bodyTemperMultiplier = root.bonus.value;
        if (root?.bonus.type === 'alchemy_success_add') bonuses.alchemySuccessAdd += root.bonus.value;
    }

    if (player.equipment) {
        player.equipment.forEach(item => {
            item.bonuses.forEach(bonus => {
                if (bonus.type === 'qi_per_second_multiplier') bonuses.qiMultiplier *= bonus.value;
                if (bonus.type === 'breakthrough_chance_add') bonuses.breakthroughBonus += bonus.value;
                if (bonus.type === 'hp_add') bonuses.hpAdd += bonus.value;
                if (bonus.type === 'atk_add') bonuses.atkAdd += bonus.value;
                if (bonus.type === 'def_add') bonuses.defAdd += bonus.value;
                if (bonus.type === 'hp_mul') bonuses.hpMul *= bonus.value;
                if (bonus.type === 'atk_mul') bonuses.atkMul *= bonus.value;
                if (bonus.type === 'def_mul') bonuses.defMul *= bonus.value;
                if (bonus.type === 'speed_add') bonuses.speed_add += bonus.value;
                if (bonus.type === 'crit_rate_add') bonuses.crit_rate_add += bonus.value;
                if (bonus.type === 'crit_damage_add') bonuses.crit_damage_add += bonus.value;
                if (bonus.type === 'dodge_rate_add') bonuses.dodge_rate_add += bonus.value;
                if (bonus.type === 'lifesteal_rate_add') bonuses.lifesteal_rate_add += bonus.value;
                if (bonus.type === 'counter_rate_add') bonuses.counter_rate_add += bonus.value;
                if (bonus.type === 'hit_rate_add') bonuses.hit_rate_add += bonus.value;
                if (bonus.type === 'crit_resist_add') bonuses.crit_resist_add += bonus.value;
                if (bonus.type === 'lifesteal_resist_add') bonuses.lifesteal_resist_add += bonus.value;
                if (bonus.type === 'counter_resist_add') bonuses.counter_resist_add += bonus.value;
            });
        });
    }

    // Unlocked Insights bonuses
    if (player.unlockedInsights) {
        player.unlockedInsights.forEach(insightId => {
            const insight = gameData.INSIGHTS.find(i => i.id === insightId);
            if (insight?.bonus.type === 'qi_per_second_base_add') bonuses.qiPerSecondAdd += insight.bonus.value;
            if (insight?.bonus.type === 'body_temper_eff_add') bonuses.bodyTemperEffectAdd += insight.bonus.value;
            if (insight?.bonus.type === 'alchemy_success_base_add') bonuses.alchemySuccessAdd += insight.bonus.value;
        });
    }
    
    if (conn) {
      const activeEvents = await conn.query("SELECT bonus_type, bonus_value FROM events WHERE is_active = 1 AND starts_at <= datetime('now') AND expires_at >= datetime('now')");
      activeEvents.forEach(event => {
          if (event.bonus_type === 'qi_multiplier') {
              bonuses.qiMultiplier *= event.bonus_value;
          } else if (event.bonus_type === 'breakthrough_add') {
              bonuses.breakthroughBonus += event.bonus_value;
          }
      });
    }

    return bonuses;
};
  
const calculateCombatStats = (player, bonuses) => {
  const gameData = getGameData();
  const realm = gameData.REALMS[player.realmIndex];
  if (!realm) {
      return { hp: 0, atk: 0, def: 0, speed: 0, critRate: 0, critDamage: 0, dodgeRate: 0, lifestealRate: 0, counterRate: 0, hitRate: 0, critResist: 0, lifestealResist: 0, counterResist: 0 };
  }

  const baseHp = realm.baseHp + (player.bodyStrength * 10);
  const baseAtk = realm.baseAtk + (player.bodyStrength * 0.5);
  const baseDef = realm.baseDef + (player.bodyStrength * 1.5);
  
  const totalHp = (baseHp + bonuses.hpAdd) * bonuses.hpMul;
  const totalAtk = (baseAtk + bonuses.atkAdd) * bonuses.atkMul;
  const totalDef = (baseDef + bonuses.defAdd) * bonuses.defMul;
  const totalSpeed = realm.baseSpeed + bonuses.speed_add;
  const totalCritRate = realm.baseCritRate + bonuses.crit_rate_add;
  const totalCritDamage = realm.baseCritDamage + bonuses.crit_damage_add;
  const totalDodgeRate = realm.baseDodgeRate + bonuses.dodge_rate_add;
  const totalLifestealRate = bonuses.lifesteal_rate_add;
  const totalCounterRate = bonuses.counter_rate_add;
  const totalHitRate = realm.baseHitRate + bonuses.hit_rate_add;
  const totalCritResist = realm.baseCritResist + bonuses.crit_resist_add;
  const totalLifestealResist = realm.baseLifestealResist + bonuses.lifesteal_resist_add;
  const totalCounterResist = realm.baseCounterResist + bonuses.counter_resist_add;

  return {
      hp: Math.floor(totalHp),
      atk: Math.floor(totalAtk),
      def: Math.floor(totalDef),
      speed: Math.floor(totalSpeed),
      critRate: totalCritRate,
      critDamage: totalCritDamage,
      dodgeRate: totalDodgeRate,
      lifestealRate: totalLifestealRate,
      counterRate: totalCounterRate,
      hitRate: totalHitRate,
      critResist: totalCritResist,
      lifestealResist: totalLifestealResist,
      counterResist: totalCounterResist,
  };
};

const updatePlayerState = async (conn, name, updates) => {
    // Automatically add the updated_at timestamp to every update
    const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };

    const fields = Object.keys(updatesWithTimestamp);
    const values = Object.values(updatesWithTimestamp);
    if (fields.length === 0) return;

    // Stringify any object/array values before updating
    const processedValues = values.map(val => {
        if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
        }
        return val;
    });

    const setClause = fields.map(field => `\`${field}\` = ?`).join(', ');
    const query = `UPDATE players SET ${setClause} WHERE name = ?`;
    await conn.query(query, [...processedValues, name]);
};


const getFullPlayerQuery = async (conn, name) => {
    // 1. Get base player data
    const [playerRow] = await conn.query(`
        SELECT 
            p.*,
            g.name as guildName, g.level as guildLevel, g.exp as guildExp
        FROM players p 
        LEFT JOIN guilds g ON p.guildId = g.id 
        WHERE p.name = ?
    `, [name]);
    
    if (!playerRow) return null;

    // 2. Get all owned equipment instances THAT ARE NOT on the market
    const ownedEquipment = await conn.query(`
        SELECT
            pe.instance_id,
            pe.is_equipped,
            pe.slot,
            e.id,
            e.name,
            e.description,
            e.bonuses
        FROM player_equipment pe
        JOIN equipment e ON pe.equipment_id = e.id
        LEFT JOIN market_listings ml ON pe.instance_id = ml.item_id
        WHERE pe.player_name = ? AND ml.id IS NULL
    `, [name]);

    // 3. Process and combine data
    const finalPlayer = parsePlayerFromDBRow(playerRow);
    finalPlayer.inventory = [];
    finalPlayer.equipment = [];

    ownedEquipment.forEach(item => {
        // Combine static data from `equipment` table with instance data
        const itemInstance = {
            ...item,
            bonuses: typeof item.bonuses === 'string' ? JSON.parse(item.bonuses) : (item.bonuses || []), // Ensure bonuses is an array
        };
        if (item.is_equipped) {
            finalPlayer.equipment.push(itemInstance);
        } else {
            finalPlayer.inventory.push(itemInstance);
        }
    });

    return finalPlayer;
}


const processOfflineGains = async (conn, name) => {
    const gameData = getGameData();
    const [p_raw] = await conn.query("SELECT *, strftime('%s', updated_at) as last_update FROM players WHERE name = ?", [name]);
    if (!p_raw) throw new Error('Không tìm thấy đạo hữu này.');

    const p = parsePlayerFromDBRow(p_raw);
    const now = Date.now();
    const lastUpdate = new Date(p.updated_at.replace(' ', 'T') + 'Z').getTime(); // Parse as UTC
    const deltaTime = Math.max(0, (now - lastUpdate) / 1000);
    const offlineGains = { qi: 0 };
    let explorationLog;

    // Complete offline exploration
    if (p.explorationStatus && p.explorationStatus.endTime <= now) {
        const location = gameData.EXPLORATION_LOCATIONS.find(l => l.id === p.explorationStatus.locationId);
        if (location) {
            let rewardsLog = [];
            const root = gameData.SPIRITUAL_ROOTS.find(r => r.id === p.spiritualRoot);
            const yieldMultiplier = (root && root.bonus.type === 'alchemy_success_add') ? 1.1 : 1; 

            for (const reward of location.rewards) {
                if (reward.type === 'qi') {
                    p.qi = Number(p.qi) + reward.amount;
                }
                if (reward.type === 'herb') {
                    const amountGained = Math.floor(reward.amount * yieldMultiplier);
                    p.herbs[reward.herbId] = (p.herbs[reward.herbId] || 0) + amountGained;
                    const herb = gameData.HERBS.find(h => h.id === reward.herbId);
                    rewardsLog.push(`${herb?.name} x${amountGained}`);
                }
                if (reward.type === 'equipment') {
                    await conn.query(
                        "INSERT INTO player_equipment (player_name, equipment_id) VALUES (?, ?)",
                        [name, reward.equipmentId]
                    );
                    const equipment = gameData.EQUIPMENT.find(t => t.id === reward.equipmentId);
                    rewardsLog.push(`[${equipment.name}]`);
                }
            }
            explorationLog = { message: `Thám hiểm ${location.name} hoàn tất! Bạn nhận được: ${rewardsLog.join(', ')}.`, type: 'success' };
        }
        p.explorationStatus = null;
    }

    // Calculate offline cultivation only if not exploring
    if (p.explorationStatus === null && deltaTime > 1) { // Only calc for more than 1s offline
        const currentRealm = gameData.REALMS[p.realmIndex];
        const playerWithEquipment = await getFullPlayerQuery(conn, name);

        const bonuses = await calculateTotalBonuses(conn, playerWithEquipment);
        const qiPerSecond = (currentRealm.baseQiPerSecond * bonuses.qiMultiplier * (1 + bonuses.qiBonus)) + bonuses.qiPerSecondAdd;
        const gainedQi = qiPerSecond * deltaTime;
        
        const newQi = Number(p.qi) + gainedQi;
        const qiCap = currentRealm.qiThreshold === Infinity ? newQi : currentRealm.qiThreshold;
        const finalQi = Math.min(newQi, qiCap);
        
        offlineGains.qi = finalQi - Number(p.qi);
        p.qi = finalQi;
    }
    
    // Persist changes
    await updatePlayerState(conn, name, {
        qi: p.qi,
        explorationStatus: p.explorationStatus, // Already parsed/nulled
        herbs: p.herbs, // Already an object
    });

    const finalPlayerData = await getFullPlayerQuery(conn, name);
    
    return {
        player: finalPlayerData,
        explorationStatus: finalPlayerData.explorationStatus,
        lastChallengeTime: finalPlayerData.lastChallengeTime,
        offlineGains,
        explorationLog,
    };
};

// A wrapper for all player actions to ensure consistency
const performAction = async (req, res, actionLogic) => {
    const name = req.user.name;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Process any offline progress before the action
        const offlineData = await processOfflineGains(conn, name);
        if (offlineData.explorationLog) {
            // If an exploration finished, add its log to the response
            res.log = offlineData.explorationLog;
        }
        
        // 2. Get the fresh player state after offline processing
        const player = await getFullPlayerQuery(conn, name);
        if (!player) throw new Error("Không tìm thấy người chơi.");

        // 3. Execute the specific action logic
        // The logic function can attach a 'log' or 'combatLog' to the `res` object
        const resRef = {}; // Use a reference object to pass logs back
        await actionLogic(conn, player, req.body, resRef);

        await conn.commit();

        // 4. Get the final updated state to return to client
        const finalPlayerState = await getFullPlayerQuery(conn, name);
        
        res.status(200).json({
            player: finalPlayerState,
            explorationStatus: finalPlayerState.explorationStatus,
            lastChallengeTime: finalPlayerState.lastChallengeTime,
            log: resRef.log || res.log, // Prioritize log from action logic
            combatLog: resRef.combatLog,
            structuredCombatLog: resRef.structuredCombatLog, // NEW: for pvp replay
        });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Action Error:", err.message, err.stack);
        res.status(400).json({ message: err.message || 'Hành động không hợp lệ.' });
    } finally {
        if (conn) conn.release();
    }
};

module.exports = {
    calculateTotalBonuses,
    calculateCombatStats,
    updatePlayerState,
    getFullPlayerQuery,
    processOfflineGains,
    performAction,
};