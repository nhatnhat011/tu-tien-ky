const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { performAction, updatePlayerState, getFullPlayerQuery, calculateTotalBonuses, calculateCombatStats } = require('../services/player.service');
const { getGameData } = require('../services/gameData.service');
const { PVP_WIN_SUMMARIES, PVP_LOSE_SUMMARIES } = require('../utils/combatMessages');

const router = express.Router();

// GET /api/pvp/opponents - Tìm đối thủ
router.get('/opponents', authenticateToken, async (req, res) => {
    const playerName = req.user.name;
    let conn;
    try {
        conn = await pool.getConnection();
        const [player] = await conn.query("SELECT realmIndex FROM players WHERE name = ?", [playerName]);
        if (!player) {
            return res.status(404).json({ message: 'Không tìm thấy người chơi.' });
        }

        const opponents = await conn.query(
            "SELECT name, realmIndex FROM players WHERE realmIndex BETWEEN ? AND ? AND name != ? ORDER BY RANDOM() LIMIT 5",
            [Math.max(0, player.realmIndex - 2), player.realmIndex + 2, playerName]
        );
        res.status(200).json(opponents);
    } catch (err) {
        console.error("Find Opponents Error:", err);
        res.status(500).json({ message: 'Lỗi máy chủ khi tìm đối thủ.' });
    } finally {
        if (conn) conn.release();
    }
});

// GET /api/pvp/history - Lấy lịch sử đấu
router.get('/history', authenticateToken, async (req, res) => {
    const playerName = req.user.name;
    let conn;
    try {
        conn = await pool.getConnection();
        const history = await conn.query(
            `SELECT 
                id, 
                CASE WHEN attacker_name = ? THEN defender_name ELSE attacker_name END as opponent,
                (winner_name = ?) as won,
                funny_summary as summary,
                combat_log as log,
                strftime('%s', timestamp) * 1000 as timestamp
            FROM pvp_history 
            WHERE attacker_name = ? OR defender_name = ? 
            ORDER BY timestamp DESC 
            LIMIT 20`,
            [playerName, playerName, playerName, playerName]
        );
        res.status(200).json(history.map(h => ({ ...h, log: (typeof h.log === 'string' ? JSON.parse(h.log) : (h.log || [])) })));
    } catch (err) {
        console.error("Get History Error:", err);
        res.status(500).json({ message: 'Lỗi máy chủ khi tải lịch sử đấu.' });
    } finally {
        if (conn) conn.release();
    }
});

// POST /api/pvp/challenge - Khiêu chiến
router.post('/challenge', authenticateToken, async (req, res) => {
    const attackerName = req.user.name;
    const { opponentName } = req.body;

    await performAction(req, res, async (conn, attacker, body, resRef) => {
        const gameData = getGameData();
        
        const defender = await getFullPlayerQuery(conn, opponentName);
        if (!defender) throw new Error("Không tìm thấy đối thủ.");

        const lastChallengeTime = attacker.lastChallengeTime || {};
        const lastPvpTime = lastChallengeTime['pvp'] || 0;
        if (Date.now() - lastPvpTime < gameData.PVP_COOLDOWN_SECONDS * 1000) {
            throw new Error('Bạn đang trong thời gian hồi, chưa thể khiêu chiến.');
        }

        const attackerBonuses = await calculateTotalBonuses(conn, attacker);
        const defenderBonuses = await calculateTotalBonuses(conn, defender);
        const attackerStats = calculateCombatStats(attacker, attackerBonuses);
        const defenderStats = calculateCombatStats(defender, defenderBonuses);

        let combatants = {
            [attackerName]: { hp: attackerStats.hp, maxHp: attackerStats.hp, energy: 0, maxEnergy: 100, shield: 0, shield_duration: 0, dot: null },
            [opponentName]: { hp: defenderStats.hp, maxHp: defenderStats.hp, energy: 0, maxEnergy: 100, shield: 0, shield_duration: 0, dot: null },
        };
        
        const structuredCombatLog = [];
        let turn = 0;

        const addLog = (text, type = 'action', damage = 0, shield = 0) => {
             structuredCombatLog.push({
                turn, text, type, damage, shield,
                state: {
                    [attackerName]: { hp: Math.max(0, combatants[attackerName].hp), maxHp: combatants[attackerName].maxHp, energy: combatants[attackerName].energy, maxEnergy: combatants[attackerName].maxEnergy },
                    [opponentName]: { hp: Math.max(0, combatants[opponentName].hp), maxHp: combatants[opponentName].maxHp, energy: combatants[opponentName].energy, maxEnergy: combatants[opponentName].maxEnergy }
                }
            });
        };

        addLog(`Trận đấu giữa ${attackerName} và ${opponentName} bắt đầu!`, 'info');
        const turnOrder = attackerStats.speed >= defenderStats.speed ? [attackerName, opponentName] : [opponentName, attackerName];
        addLog(`${turnOrder[0]} có tốc độ cao hơn, ra đòn trước!`, 'info');

        while (combatants[attackerName].hp > 0 && combatants[opponentName].hp > 0 && turn < 50) {
            turn++;
            
            if (turn === 16) {
                addLog(`Sau 15 hiệp, sát khí trên chiến trường trở nên nồng đậm, các đòn tấn công trở nên uy lực hơn!`, 'info');
            }

            for (const combatantName of turnOrder) {
                 const currentStats = combatantName === attackerName ? attackerStats : defenderStats;
                 const opponentStats = combatantName === attackerName ? defenderStats : attackerStats;
                 const current = combatants[combatantName];
                 const opponent = combatants[combatantName === attackerName ? opponentName : attackerName];
                 const opponentActualName = combatantName === attackerName ? opponentName : attackerName;

                 current.energy = Math.min(current.maxEnergy, current.energy + 15);
                 if (current.shield_duration > 0) {
                     current.shield_duration--;
                     if(current.shield_duration === 0) current.shield = 0;
                 }
                
                // --- PVP Skill Logic ---
                const availableSkills = (combatantName === attackerName ? attacker.learned_pvp_skills : defender.learned_pvp_skills)
                    .map(id => gameData.PVP_SKILLS.find(s => s.id === id))
                    .filter(s => s && current.energy >= s.energy_cost)
                    .sort((a,b) => b.cost - a.cost); // Prioritize stronger skills
                
                let usedSkill = false;
                if (availableSkills.length > 0) {
                    const skill = availableSkills[0]; // Use the best available skill
                    current.energy -= skill.energy_cost;
                    usedSkill = true;
                    addLog(`${combatantName} vận sức, thi triển tuyệt kỹ [${skill.name}]!`, 'skill');

                    if (skill.effect.type === 'damage') {
                        let damage = currentStats.atk * skill.effect.multiplier;
                        const armorPierce = skill.effect.armor_pierce || 0;
                        const damageReduction = opponentStats.def * (1 - armorPierce) / (opponentStats.def * (1 - armorPierce) + 1000);
                        let actualDamage = Math.max(1, Math.floor(damage * (1 - damageReduction)));
                        opponent.hp -= actualDamage;
                        addLog(`${skill.name} gây ${actualDamage} sát thương lên ${opponentActualName}.`, 'action', actualDamage);
                    } else if (skill.effect.type === 'shield') {
                        const shieldAmount = Math.floor(current.maxHp * skill.effect.hp_percent);
                        current.shield += shieldAmount;
                        current.shield_duration = skill.effect.duration;
                        addLog(`${combatantName} tạo ra một tấm khiên hấp thụ ${shieldAmount} sát thương.`, 'skill', 0, shieldAmount);
                    }
                }
                
                // --- Basic Attack if no skill used ---
                if (!usedSkill) {
                    const effectiveDodgeRate = Math.max(0.01, opponentStats.dodgeRate - currentStats.hitRate);
                    if (Math.random() < effectiveDodgeRate) {
                        addLog(`${opponentActualName} thân pháp ảo diệu, đã NÉ TRÁNH đòn tấn công của ${combatantName}!`, 'info');
                    } else {
                        let damage = currentStats.atk;
                        let isCrit = false;
                        const effectiveCritRate = Math.max(0, currentStats.critRate - opponentStats.critResist);
                        if (Math.random() < effectiveCritRate) {
                            damage *= currentStats.critDamage; isCrit = true;
                        }
                        const damageReduction = opponentStats.def / (opponentStats.def + 1000);
                        let actualDamage = Math.max(1, Math.floor(damage * (1 - damageReduction)));
                        
                        if (opponent.shield > 0) {
                            const absorbed = Math.min(opponent.shield, actualDamage);
                            opponent.shield -= absorbed;
                            actualDamage -= absorbed;
                            if (absorbed > 0) addLog(`${opponentActualName} dùng khiên đỡ ${absorbed} sát thương.`, 'info');
                        }
                        opponent.hp -= actualDamage;
                        let logMessage = isCrit 
                            ? `${combatantName} xuất chiêu CHÍ MẠNG, gây ${actualDamage} sát thương lên ${opponentActualName}!`
                            : `${combatantName} tấn công, gây ${actualDamage} sát thương cho ${opponentActualName}.`;
                        addLog(logMessage, 'action', actualDamage);
                    }
                }
                 if (opponent.hp <= 0) break;
            }
             if (combatants[attackerName].hp <= 0 || combatants[opponentName].hp <= 0) break;
        }

        const attackerWon = combatants[attackerName].hp > 0 && combatants[opponentName].hp <= 0;
        const winnerName = attackerWon ? attackerName : (combatants[opponentName].hp > 0 && combatants[attackerName].hp <= 0 ? opponentName : null);
        
        let summary;
        if (winnerName) {
            addLog(`Trận đấu kết thúc! ${winnerName} là người chiến thắng!`, 'info');
            summary = attackerWon ? PVP_WIN_SUMMARIES[Math.floor(Math.random() * PVP_WIN_SUMMARIES.length)] : PVP_LOSE_SUMMARIES[Math.floor(Math.random() * PVP_LOSE_SUMMARIES.length)];
        } else {
            addLog(`Hết 50 hiệp! Trận đấu kết thúc với kết quả hòa!`, 'info');
            summary = "Hai vị đạo hữu bất phân thắng bại, hẹn ngày tái đấu.";
        }
        
        const attackerUpdates = { honorPoints: attacker.honorPoints, karma: attacker.karma };
        
        if (winnerName) {
            if (attackerWon) {
                attackerUpdates.honorPoints += 2;
                if (attacker.realmIndex > defender.realmIndex) attackerUpdates.karma += (attacker.realmIndex - defender.realmIndex);
            } else {
                attackerUpdates.honorPoints = Math.max(0, attackerUpdates.honorPoints - 1);
                await updatePlayerState(conn, opponentName, { honorPoints: defender.honorPoints + 1 });
            }
        }

        attackerUpdates.lastChallengeTime = JSON.stringify({ ...lastChallengeTime, pvp: Date.now() });

        await conn.query( "INSERT INTO pvp_history (attacker_name, defender_name, winner_name, funny_summary, combat_log) VALUES (?, ?, ?, ?, ?)", [attackerName, opponentName, winnerName || 'Hòa', summary, JSON.stringify(structuredCombatLog)] );
        await updatePlayerState(conn, attackerName, attackerUpdates);

        resRef.structuredCombatLog = structuredCombatLog;
        resRef.log = { message: `Trận đấu kết thúc. ${summary}`, type: winnerName ? (attackerWon ? 'success' : 'danger') : 'info' };
    });
});


// POST /api/pvp/shop/buy - Mua vật phẩm từ cửa hàng vinh dự
router.post('/shop/buy', authenticateToken, async (req, res) => {
    const { itemId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const shopItems = gameData.HONOR_SHOP_ITEMS || [];
        const item = shopItems.find(i => i.id === itemId);

        if (!item) throw new Error("Vật phẩm không tồn tại.");

        if (item.isUnique && (p.purchasedHonorItems || []).includes(item.id)) {
            throw new Error("Bạn đã mua vật phẩm này rồi.");
        }
        if (p.honorPoints < item.cost) {
            throw new Error("Không đủ điểm vinh dự.");
        }

        const updates = {
            honorPoints: p.honorPoints - item.cost,
        };

        if (item.isUnique) {
            updates.purchasedHonorItems = JSON.stringify([...(p.purchasedHonorItems || []), item.id]);
        }
        
        if (item.type === 'equipment') {
            await conn.query( "INSERT INTO player_equipment (player_name, equipment_id) VALUES (?, ?)", [p.name, item.itemId] );
        } else if (item.type === 'pill') {
            const newPills = { ...p.pills };
            newPills[item.itemId] = (newPills[item.itemId] || 0) + 1;
            updates.pills = JSON.stringify(newPills);
        }

        await updatePlayerState(conn, p.name, updates);
        resRef.log = { message: `Mua thành công [${item.name}]!`, type: 'success' };
    });
});

// NEW: Endpoint to learn a PvP skill
router.post('/learn-skill', authenticateToken, async (req, res) => {
    const { skillId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const skill = gameData.PVP_SKILLS.find(s => s.id === skillId);

        if (!skill) throw new Error("Tuyệt kỹ không tồn tại.");
        if ((p.learned_pvp_skills || []).includes(skillId)) throw new Error("Bạn đã lĩnh ngộ tuyệt kỹ này rồi.");
        if (p.honorPoints < skill.cost) throw new Error(`Không đủ Điểm Vinh Dự. Cần ${skill.cost}.`);

        const newPoints = p.honorPoints - skill.cost;
        const newSkills = [...(p.learned_pvp_skills || []), skillId];

        await updatePlayerState(conn, p.name, {
            honorPoints: newPoints,
            learned_pvp_skills: JSON.stringify(newSkills),
        });

        resRef.log = { message: `Lĩnh ngộ thành công [${skill.name}]!`, type: 'success' };
    });
});


module.exports = router;