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
            "SELECT name, realmIndex FROM players WHERE realmIndex BETWEEN ? AND ? AND name != ? ORDER BY RAND() LIMIT 5",
            [Math.max(0, player.realmIndex - 1), player.realmIndex + 1, playerName]
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
                IF(attacker_name = ?, defender_name, attacker_name) as opponent,
                (winner_name = ?) as won,
                funny_summary as summary,
                combat_log as log,
                UNIX_TIMESTAMP(timestamp) as timestamp
            FROM pvp_history 
            WHERE attacker_name = ? OR defender_name = ? 
            ORDER BY timestamp DESC 
            LIMIT 20`,
            [playerName, playerName, playerName, playerName]
        );
        res.status(200).json(history.map(h => ({ ...h, log: h.log || [], timestamp: h.timestamp * 1000 })));
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
            [attackerName]: { hp: attackerStats.hp, maxHp: attackerStats.hp, energy: 0, maxEnergy: 100, shield: 0, shield_duration: 0 },
            [opponentName]: { hp: defenderStats.hp, maxHp: defenderStats.hp, energy: 0, maxEnergy: 100, shield: 0, shield_duration: 0 },
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
        if(attackerStats.speed === defenderStats.speed) {
            turnOrder[0] = attackerName;
            turnOrder[1] = opponentName;
        }
        addLog(`${turnOrder[0]} có tốc độ cao hơn, ra đòn trước!`, 'info');

        while (combatants[attackerName].hp > 0 && combatants[opponentName].hp > 0 && turn < 50) {
            turn++;
            
            if (turn === 16) {
                addLog(`Sau 15 hiệp, sát khí trên chiến trường trở nên nồng đậm, các đòn tấn công trở nên uy lực hơn!`, 'info');
            }

            for (const combatantName of turnOrder) {
                 const opponent = combatantName === attackerName ? opponentName : attackerName;
                 const current = combatants[combatantName];
                 const currentStats = combatantName === attackerName ? attackerStats : defenderStats;
                 const opponentState = combatants[opponent];
                 const opponentStats = combatantName === attackerName ? defenderStats : attackerStats;

                 let damageMultiplier = 1;
                 if (turn > 15) {
                    damageMultiplier = 1 + (turn - 15) * 0.20; 
                 }

                 current.energy = Math.min(current.maxEnergy, current.energy + 15);
                 if (current.shield_duration > 0) {
                     current.shield_duration--;
                     if(current.shield_duration === 0) current.shield = 0;
                 }
                
                // --- COMBAT LOGIC WITH RESISTS ---
                const effectiveDodgeRate = Math.max(0.01, opponentStats.dodgeRate - currentStats.hitRate);
                if (Math.random() < effectiveDodgeRate) {
                    addLog(`${opponent} thân pháp ảo diệu, đã NÉ TRÁNH đòn tấn công của ${combatantName}!`, 'info');
                    if (opponentState.hp <= 0) break;
                    continue;
                }
                
                let damage = currentStats.atk + Math.floor(Math.random() * currentStats.atk * 0.2);
                let isCrit = false;
                
                const effectiveCritRate = Math.max(0, currentStats.critRate - opponentStats.critResist);
                if (Math.random() < effectiveCritRate) {
                    damage *= currentStats.critDamage;
                    isCrit = true;
                }
                
                damage *= damageMultiplier;
                const damageReduction = opponentStats.def / (opponentStats.def + 1000);
                let actualDamage = Math.max(1, Math.floor(damage * (1 - damageReduction)));
                
                if (opponentState.shield > 0) {
                    const absorbed = Math.min(opponentState.shield, actualDamage);
                    opponentState.shield -= absorbed;
                    actualDamage -= absorbed;
                    addLog(`${opponent} dùng khiên đỡ ${absorbed} sát thương.`, 'info');
                }

                opponentState.hp -= actualDamage;

                let logMessage = isCrit 
                    ? `${combatantName} xuất chiêu CHÍ MẠNG, gây ${actualDamage} sát thương khủng khiếp lên ${opponent}!`
                    : `${combatantName} tấn công, gây ${actualDamage} sát thương cho ${opponent}.`;
                addLog(logMessage, 'action', actualDamage);
                
                const effectiveLifestealRate = Math.max(0, currentStats.lifestealRate - opponentStats.lifestealResist);
                if (actualDamage > 0 && effectiveLifestealRate > 0) {
                    const healed = Math.floor(actualDamage * effectiveLifestealRate);
                    current.hp = Math.min(current.maxHp, current.hp + healed);
                    addLog(`${combatantName} HÚT MÁU, hồi lại ${healed} sinh lực.`, 'info');
                }

                const effectiveCounterRate = Math.max(0, opponentStats.counterRate - currentStats.counterResist);
                if (actualDamage > 0 && Math.random() < effectiveCounterRate) {
                    const counterDamage = Math.floor(opponentStats.atk * 0.5);
                    current.hp -= counterDamage;
                    addLog(`${opponent} PHẢN ĐÒN, gây ${counterDamage} sát thương ngược lại cho ${combatantName}!`, 'action', counterDamage);
                }
                 if (opponentState.hp <= 0 || current.hp <= 0) break;
            }
             if (combatants[attackerName].hp <= 0 || combatants[opponentName].hp <= 0) break;
        }

        let winnerName = null;
        let attackerWon = false;
        
        if (combatants[attackerName].hp > 0 && combatants[opponentName].hp <= 0) {
            winnerName = attackerName;
            attackerWon = true;
        } else if (combatants[opponentName].hp > 0 && combatants[attackerName].hp <= 0) {
            winnerName = opponentName;
            attackerWon = false;
        } else if (combatants[attackerName].hp > 0 && combatants[opponentName].hp > 0) {
            const attackerHpPercent = combatants[attackerName].hp / combatants[attackerName].maxHp;
            const defenderHpPercent = combatants[opponentName].hp / combatants[opponentName].maxHp;
            winnerName = attackerHpPercent > defenderHpPercent ? attackerName : (defenderHpPercent > attackerHpPercent ? opponentName : null);
            attackerWon = winnerName === attackerName;
        }
        
        let summary;
        if (winnerName) {
            addLog(`Trận đấu kết thúc! ${winnerName} là người chiến thắng!`, 'info');
            summary = attackerWon 
                ? PVP_WIN_SUMMARIES[Math.floor(Math.random() * PVP_WIN_SUMMARIES.length)] 
                : PVP_LOSE_SUMMARIES[Math.floor(Math.random() * PVP_LOSE_SUMMARIES.length)];
        } else {
            addLog(`Hết 50 hiệp! Trận đấu kết thúc với kết quả hòa!`, 'info');
            summary = "Hai vị đạo hữu bất phân thắng bại, hẹn ngày tái đấu.";
        }
        
        const attackerUpdates = { honorPoints: attacker.honorPoints, karma: attacker.karma };
        const defenderUpdates = { honorPoints: defender.honorPoints };
        
        if (winnerName) {
            if (attackerWon) {
                attackerUpdates.honorPoints += 2;
                if (attacker.realmIndex > defender.realmIndex) {
                    const karmaGain = attacker.realmIndex - defender.realmIndex;
                    attackerUpdates.karma += karmaGain;
                }
            } else {
                attackerUpdates.honorPoints = Math.max(0, attackerUpdates.honorPoints - 1);
                defenderUpdates.honorPoints += 1;
            }
        }

        attackerUpdates.lastChallengeTime = JSON.stringify({ ...lastChallengeTime, pvp: Date.now() });

        await conn.query( "INSERT INTO pvp_history (attacker_name, defender_name, winner_name, funny_summary, combat_log) VALUES (?, ?, ?, ?, ?)", [attackerName, opponentName, winnerName, summary, JSON.stringify(structuredCombatLog)] );
        await updatePlayerState(conn, attackerName, attackerUpdates);
        if(winnerName) {
            await updatePlayerState(conn, opponentName, defenderUpdates);
        }

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

        if (item.isUnique && p.purchasedHonorItems.includes(item.id)) {
            throw new Error("Bạn đã mua vật phẩm này rồi.");
        }
        if (p.honorPoints < item.cost) {
            throw new Error("Không đủ điểm vinh dự.");
        }

        const updates = {
            honorPoints: p.honorPoints - item.cost,
        };

        if (item.isUnique) {
            updates.purchasedHonorItems = JSON.stringify([...p.purchasedHonorItems, item.id]);
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