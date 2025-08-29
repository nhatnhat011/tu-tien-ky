const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');
const { performAction, updatePlayerState, calculateCombatStats } = require('../services/player.service');
const { getGameData } = require('../services/gameData.service');

const router = express.Router();

// NEW PUBLIC ENDPOINT to serve static game data
router.get('/game-data', (req, res) => {
    try {
        const gameData = getGameData();
        if (Object.keys(gameData).length === 0) {
            return res.status(503).json({ message: 'Dữ liệu game chưa sẵn sàng, vui lòng thử lại sau.' });
        }
        res.status(200).json(gameData);
    } catch (err) {
        console.error("Error serving game data:", err);
        res.status(500).json({ message: 'Lỗi khi tải dữ liệu game.' });
    }
});


router.post('/breakthrough', authenticateToken, async (req, res) => {
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const currentRealm = gameData.REALMS[p.realmIndex];
        if (p.qi < currentRealm.qiThreshold) throw new Error('Linh khí của bạn chưa đủ để đột phá.');
        if (p.realmIndex >= gameData.REALMS.length - 1) throw new Error('Bạn đã đạt đến cảnh giới tối cao.');

        // Logic Thiên Phạt dựa trên Ác Nghiệp
        const punishmentChance = (p.karma / 10) * 0.001;
        if (Math.random() < punishmentChance) {
            const newRealmIndex = Math.max(0, p.realmIndex - 1);
            const updates = { 
                qi: 0, 
                karma: 0, // Ác nghiệp được xóa bỏ sau khi bị phạt
                realmIndex: newRealmIndex 
            };
            await updatePlayerState(conn, p.name, updates);
            resRef.log = { message: `Trời cao nổi giận! Ác nghiệp của bạn đã chiêu mời Thiên Phạt! Lôi kiếp giáng xuống, bạn bị đánh rớt xuống ${gameData.REALMS[newRealmIndex].name}!`, type: 'danger' };
            return;
        }

        // Vượt qua Thiên Phạt, tiến hành đột phá
        const nextRealm = gameData.REALMS[p.realmIndex + 1];
        const bonuses = await require('../services/player.service').calculateTotalBonuses(conn, p);
        const breakthroughChance = Number(currentRealm.breakthroughChance) + bonuses.breakthroughBonus;
        
        if (Math.random() <= breakthroughChance) { // SUCCESS
            const newlyLearned = gameData.TECHNIQUES.filter(tech => tech.requiredRealmIndex === p.realmIndex + 1).map(tech => tech.id);
            const allTechniques = [...new Set([...(p.learnedTechniques || []), ...newlyLearned])];
            const pointsGained = 1 + p.realmIndex; // Earn 1 point for Luyen Khi, 2 for Truc Co, etc.
            const updates = { 
                realmIndex: p.realmIndex + 1, 
                qi: 0, 
                learnedTechniques: JSON.stringify(allTechniques),
                enlightenmentPoints: (p.enlightenmentPoints || 0) + pointsGained,
            };
            let logMessage = `Đột phá thành công! Chúc mừng bạn đã đạt tới ${nextRealm.name}. Bạn nhận được ${pointsGained} điểm Lĩnh Ngộ!`;
            if (newlyLearned.length > 0) logMessage += ` Bạn đã lĩnh ngộ công pháp mới!`;
            resRef.log = { message: logMessage, type: 'success' };
            await updatePlayerState(conn, p.name, updates);
        } else { // FAIL
            const updates = { qi: Math.floor(currentRealm.qiThreshold * 0.5) };
            resRef.log = { message: 'Linh khí bạo động, không thể phá vỡ bình cảnh. Đột phá thất bại, linh khí tổn thất nặng nề!', type: 'danger' };
            await updatePlayerState(conn, p.name, updates);
        }
    });
});

router.post('/temper-body', authenticateToken, async (req, res) => {
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const cost = Math.floor(gameData.BODY_STRENGTH_COST.base * Math.pow(gameData.BODY_STRENGTH_COST.multiplier, p.bodyStrength));
        if (p.qi < cost) throw new Error(`Cần ${cost} linh khí để tôi luyện thân thể.`);
        
        const bonuses = await require('../services/player.service').calculateTotalBonuses(conn, p);
        let bodyStrengthGain = 1;
        // Base bonus from spiritual root
        if (bonuses.bodyTemperMultiplier) {
            bodyStrengthGain *= bonuses.bodyTemperMultiplier;
        }
        // Additive bonus from insights
        bodyStrengthGain *= (1 + (bonuses.bodyTemperEffectAdd || 0));

        const updates = { qi: p.qi - cost, bodyStrength: p.bodyStrength + bodyStrengthGain };
        await updatePlayerState(conn, p.name, updates);
        resRef.log = { message: `Bạn đã tiêu hao ${cost} linh khí để rèn luyện thân thể.`, type: 'success' };
    });
});

router.post('/start-exploration', authenticateToken, async (req, res) => {
    const { locationId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        if (p.explorationStatus) throw new Error('Bạn đang trong một cuộc thám hiểm khác.');
        const location = gameData.EXPLORATION_LOCATIONS.find(l => l.id === locationId);
        if (!location) throw new Error('Địa điểm không hợp lệ.');
        if (p.realmIndex < location.requiredRealmIndex) throw new Error('Tu vi không đủ.');
        if (p.bodyStrength < location.requiredBodyStrength) throw new Error('Thân thể không đủ cường tráng.');

        const updates = {
            explorationStatus: JSON.stringify({
                locationId: location.id,
                endTime: Date.now() + location.durationSeconds * 1000,
            }),
        };
        await updatePlayerState(conn, p.name, updates);
        resRef.log = { message: `Bạn bắt đầu thám hiểm ${location.name}... Việc tu luyện sẽ tạm dừng.`, type: 'info' };
    });
});

router.post('/challenge', authenticateToken, async (req, res) => {
    const { zoneId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const zone = gameData.TRIAL_ZONES.find(z => z.id === zoneId);
        if (!zone) throw new Error('Khu vực thử luyện không hợp lệ.');
        if (p.realmIndex < zone.requiredRealmIndex) throw new Error('Cảnh giới của bạn không đủ để vào khu vực này.');

        const lastChallengeTime = p.lastChallengeTime || {};
        const lastTime = lastChallengeTime[zoneId] || 0;
        if (Date.now() - lastTime < zone.cooldownSeconds * 1000) {
            throw new Error('Khu vực đang trong thời gian hồi, chưa thể khiêu chiến.');
        }
        
        const bonuses = await require('../services/player.service').calculateTotalBonuses(conn, p);
        const playerStats = calculateCombatStats(p, bonuses);

        let playerHealth = playerStats.hp;
        let playerAttack = playerStats.atk;

        let monsterHealth = zone.monster.health;
        let monsterAttack = zone.monster.attack;
        const combatLog = [];
        let playerTurn = true;

        while (playerHealth > 0 && monsterHealth > 0) {
            if (playerTurn) {
                const damage = playerAttack + Math.floor(Math.random() * playerAttack * 0.2);
                monsterHealth -= damage;
                combatLog.push({ message: `Bạn tấn công ${zone.monster.name}, gây ${damage.toFixed(0)} sát thương.`, type: 'info' });
            } else {
                const damage = monsterAttack + Math.floor(Math.random() * monsterAttack * 0.2);
                const damageReduction = playerStats.def / (playerStats.def + 500); // K=500 for PvE
                const actualDamage = Math.max(1, Math.floor(damage * (1 - damageReduction)));
                playerHealth -= actualDamage;
                combatLog.push({ message: `${zone.monster.name} tấn công, bạn nhận ${actualDamage.toFixed(0)} sát thương.`, type: 'warning' });
            }
            playerTurn = !playerTurn;
        }

        const updates = {};
        let rewardLogs = [];
        if (playerHealth > 0) { // WIN
            combatLog.push({ message: `Bạn đã đánh bại ${zone.monster.name}!`, type: 'success' });
            
            for (const reward of zone.rewards) {
                if (reward.type === 'qi') {
                    p.qi = Number(p.qi) + reward.amount;
                    rewardLogs.push(`${reward.amount} Linh Khí`);
                }
                if (reward.type === 'herb') {
                    p.herbs[reward.herbId] = (p.herbs[reward.herbId] || 0) + reward.amount;
                    const herb = gameData.HERBS.find(h => h.id === reward.herbId);
                    rewardLogs.push(`${herb?.name} x${reward.amount}`);
                }
                if (reward.type === 'equipment') {
                    await conn.query(
                        "INSERT INTO player_equipment (player_name, equipment_id) VALUES (?, ?)",
                        [p.name, reward.equipmentId]
                    );
                    const equipment = gameData.EQUIPMENT.find(t => t.id === reward.equipmentId);
                    rewardLogs.push(`[${equipment.name}]`);
                }
            }
            updates.qi = p.qi;
            updates.herbs = JSON.stringify(p.herbs);

            if(rewardLogs.length > 0) {
                 combatLog.push({ message: `Phần thưởng: ${rewardLogs.join(', ')}.`, type: 'success' });
            }
        } else { // LOSE
            const qiPenalty = Math.floor(p.qi * 0.05);
            p.qi -= qiPenalty;
            updates.qi = p.qi;
            combatLog.push({ message: `Bạn đã bị ${zone.monster.name} đánh bại! Bị thương nhẹ và mất ${qiPenalty} linh khí.`, type: 'danger' });
        }

        const newCooldowns = { ...lastChallengeTime, [zoneId]: Date.now() };
        updates.lastChallengeTime = JSON.stringify(newCooldowns);

        await updatePlayerState(conn, p.name, updates);
        resRef.combatLog = combatLog;
    });
});

router.post('/activate-technique', authenticateToken, async (req, res) => {
    await performAction(req, res, async (conn, p, body, resRef) => {
        const { techniqueId } = body;
        const gameData = getGameData();
        const technique = gameData.TECHNIQUES.find(t => t.id === techniqueId);
        if (!technique) throw new Error('Công pháp không tồn tại.');
        if (p.realmIndex < technique.requiredRealmIndex) throw new Error('Cảnh giới của bạn chưa đủ để vận chuyển công pháp này.');

        const newActiveId = p.activeTechniqueId === techniqueId ? null : techniqueId;
        await updatePlayerState(conn, p.name, { activeTechniqueId: newActiveId });
        
        if (newActiveId) resRef.log = { message: `Bạn bắt đầu vận chuyển ${technique.name}.`, type: 'success' };
        else resRef.log = { message: `Bạn đã ngừng vận chuyển ${technique.name}.`, type: 'warning' };
    });
});

router.post('/equip-item', authenticateToken, async (req, res) => {
    const { itemInstanceId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const [itemToEquip] = await conn.query(
            "SELECT pe.instance_id, e.slot, e.name FROM player_equipment pe JOIN equipment e ON pe.equipment_id = e.id WHERE pe.instance_id = ? AND pe.player_name = ?",
            [itemInstanceId, p.name]
        );

        if (!itemToEquip) {
            throw new Error('Vật phẩm không tồn tại hoặc không phải của bạn.');
        }

        const [itemCurrentlyEquipped] = await conn.query(
            "SELECT instance_id FROM player_equipment WHERE player_name = ? AND slot = ? AND is_equipped = TRUE",
            [p.name, itemToEquip.slot]
        );
        
        // Unequip item in the same slot if there is one
        if (itemCurrentlyEquipped) {
            if (itemCurrentlyEquipped.instance_id === itemToEquip.instance_id) {
                // The clicked item is the one equipped, so unequip it
                await conn.query("UPDATE player_equipment SET is_equipped = FALSE, slot = NULL WHERE instance_id = ?", [itemToEquip.instance_id]);
                resRef.log = { message: `Bạn đã tháo [${itemToEquip.name}].`, type: 'info' };
                return; // Action finished
            } else {
                // Unequip the other item
                await conn.query("UPDATE player_equipment SET is_equipped = FALSE, slot = NULL WHERE instance_id = ?", [itemCurrentlyEquipped.instance_id]);
            }
        }
        
        // Equip the new item
        await conn.query("UPDATE player_equipment SET is_equipped = TRUE, slot = ? WHERE instance_id = ?", [itemToEquip.slot, itemToEquip.instance_id]);
        resRef.log = { message: `Bạn đã trang bị [${itemToEquip.name}].`, type: 'success' };
    });
});

router.post('/unlock-insight', authenticateToken, async (req, res) => {
    const { insightId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const insight = gameData.INSIGHTS.find(i => i.id === insightId);
        if (!insight) throw new Error("Thiên phú không tồn tại.");
        if ((p.unlockedInsights || []).includes(insightId)) throw new Error("Bạn đã lĩnh ngộ thiên phú này rồi.");
        if ((p.enlightenmentPoints || 0) < insight.cost) throw new Error("Không đủ Điểm Lĩnh Ngộ.");

        const prereqsMet = insight.requiredInsightIds.every(reqId => (p.unlockedInsights || []).includes(reqId));
        if (!prereqsMet) throw new Error("Chưa đáp ứng điều kiện tiên quyết.");

        const newPoints = (p.enlightenmentPoints || 0) - insight.cost;
        const newInsights = [...(p.unlockedInsights || []), insightId];

        await updatePlayerState(conn, p.name, {
            enlightenmentPoints: newPoints,
            unlockedInsights: JSON.stringify(newInsights),
        });

        resRef.log = { message: `Lĩnh ngộ thành công [${insight.name}]!`, type: 'success' };
    });
});


router.post('/reset', authenticateToken, async (req, res) => {
     await performAction(req, res, async (conn, p, body, resRef) => {
        // Reset player stats
        const updates = {
            qi: 0, 
            realmIndex: 0, 
            bodyStrength: 0, 
            karma: 0,
            honorPoints: 0,
            enlightenmentPoints: 0,
            unlockedInsights: JSON.stringify([]),
            learnedTechniques: JSON.stringify([]), 
            activeTechniqueId: null, 
            explorationStatus: null,
            guildId: null, 
            lastChallengeTime: JSON.stringify({}), 
            pills: JSON.stringify({}), 
            herbs: JSON.stringify({}),
            // spiritualRoot is kept on reset
        };
        await updatePlayerState(conn, p.name, updates);
        // Delete all owned equipment
        await conn.query("DELETE FROM player_equipment WHERE player_name = ?", [p.name]);

        resRef.log = { message: 'Trò chơi đã được đặt lại. Một hành trình mới bắt đầu.', type: 'warning' };
     });
});

router.post('/alchemy/craft', authenticateToken, async (req, res) => {
    const { recipeId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const recipe = gameData.RECIPES.find(r => r.id === recipeId);
        if (!recipe) throw new Error('Đan phương không tồn tại.');
        if (p.realmIndex < recipe.requiredRealmIndex) throw new Error('Cảnh giới không đủ để luyện chế.');
        if (p.qi < recipe.qiCost) throw new Error('Không đủ linh khí để luyện đan.');

        for (const herbId in recipe.herbCosts) {
            const requiredAmount = recipe.herbCosts[herbId];
            const playerAmount = p.herbs[herbId] || 0;
            if (playerAmount < requiredAmount) {
                 const herb = gameData.HERBS.find(h => h.id === herbId);
                throw new Error(`Không đủ [${herb?.name || 'Linh Thảo'}]. Cần ${requiredAmount}, có ${playerAmount}.`);
            }
        }

        const newQi = p.qi - recipe.qiCost;
        for (const herbId in recipe.herbCosts) {
            p.herbs[herbId] -= recipe.herbCosts[herbId];
        }

        let logMessage;
        let logType = 'info';
        
        const bonuses = await require('../services/player.service').calculateTotalBonuses(conn, p);
        let successChance = recipe.successChance + (bonuses.alchemySuccessAdd || 0);

        if (Math.random() <= successChance) {
            const currentPillCount = p.pills[recipe.pillId] || 0;
            p.pills[recipe.pillId] = currentPillCount + 1;
            const pill = gameData.PILLS.find(pi => pi.id === recipe.pillId);
            logMessage = `Luyện đan thành công! Bạn nhận được 1 viên [${pill?.name || 'Đan Dược'}].`;
            logType = 'success';
        } else {
            logMessage = `Luyện đan thất bại, lò đan phát nổ, linh khí và dược liệu tiêu tán.`;
            logType = 'danger';
        }

        await updatePlayerState(conn, p.name, {
            qi: newQi,
            pills: JSON.stringify(p.pills),
            herbs: JSON.stringify(p.herbs),
        });
        resRef.log = { message: logMessage, type: logType };
    });
});

router.post('/alchemy/use', authenticateToken, async (req, res) => {
    const { pillId } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        const pill = gameData.PILLS.find(pi => pi.id === pillId);
        if (!pill) throw new Error('Loại đan dược này không tồn tại.');
        
        const currentPillCount = p.pills[pillId] || 0;
        if (currentPillCount <= 0) throw new Error('Bạn không sở hữu đan dược này.');
        
        const updates = {};
        p.pills[pillId] = currentPillCount - 1;
        updates.pills = JSON.stringify(p.pills);

        if (pill.effect.type === 'instant_qi') {
            p.qi = Number(p.qi) + pill.effect.amount;
            updates.qi = p.qi;
        } else if (pill.effect.type === 'pvp_attack_buff') {
            updates.pvpBuff = JSON.stringify({
                multiplier: pill.effect.value,
                matchesLeft: pill.effect.duration_matches,
            });
        }

        await updatePlayerState(conn, p.name, updates);
        resRef.log = { message: `Bạn đã sử dụng [${pill.name}], ${pill.description}`, type: 'success' };
    });
});

// === NEW ROUTES for Events & Giftcodes ===

// [GET] /api/events/active - Get all active server-wide events
router.get('/events/active', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const events = await conn.query(
            "SELECT id, title, description, bonus_type, bonus_value, expires_at FROM events WHERE is_active = TRUE AND starts_at <= NOW() AND expires_at >= NOW() ORDER BY expires_at ASC"
        );
        res.status(200).json(events);
    } catch (err) {
        console.error("Get Active Events Error:", err.message);
        res.status(500).json({ message: 'Lỗi khi tải sự kiện.' });
    } finally {
        if (conn) conn.release();
    }
});

// [POST] /api/redeem-code - Redeem a giftcode
router.post('/redeem-code', authenticateToken, async (req, res) => {
    const { code } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            throw new Error("Vui lòng nhập mã hợp lệ.");
        }
        const upperCaseCode = code.trim().toUpperCase();

        const [giftCode] = await conn.query("SELECT * FROM gift_codes WHERE code = ? FOR UPDATE", [upperCaseCode]);
        if (!giftCode) throw new Error("Mã không tồn tại.");
        if (giftCode.expires_at && new Date(giftCode.expires_at) < new Date()) throw new Error("Mã đã hết hạn.");
        if (giftCode.max_uses !== null && giftCode.uses >= giftCode.max_uses) throw new Error("Mã đã hết lượt sử dụng.");

        const [alreadyRedeemed] = await conn.query("SELECT * FROM player_redeemed_codes WHERE player_name = ? AND code = ?", [p.name, upperCaseCode]);
        if (alreadyRedeemed) throw new Error("Bạn đã sử dụng mã này rồi.");

        // All checks pass, apply rewards
        let rewardsLog = [];
        const rewards = giftCode.rewards || [];
        const playerUpdates = {};

        for (const reward of rewards) {
            if (reward.type === 'qi') {
                p.qi = Number(p.qi) + reward.amount;
                playerUpdates.qi = p.qi;
                rewardsLog.push(`${reward.amount} Linh Khí`);
            }
            if (reward.type === 'herb') {
                p.herbs[reward.herbId] = (p.herbs[reward.herbId] || 0) + reward.amount;
                playerUpdates.herbs = JSON.stringify(p.herbs);
                const herb = gameData.HERBS.find(h => h.id === reward.herbId);
                rewardsLog.push(`${herb?.name} x${reward.amount}`);
            }
            if (reward.type === 'equipment') {
                 await conn.query("INSERT INTO player_equipment (player_name, equipment_id) VALUES (?, ?)", [p.name, reward.equipmentId]);
                 const equipment = gameData.EQUIPMENT.find(t => t.id === reward.equipmentId);
                 rewardsLog.push(`[${equipment.name}]`);
            }
        }
        
        // Update player state
        if (Object.keys(playerUpdates).length > 0) {
            await updatePlayerState(conn, p.name, playerUpdates);
        }

        // Update gift code usage
        await conn.query("UPDATE gift_codes SET uses = uses + 1 WHERE code = ?", [upperCaseCode]);
        await conn.query("INSERT INTO player_redeemed_codes (player_name, code) VALUES (?, ?)", [p.name, upperCaseCode]);

        resRef.log = { message: `Đổi quà thành công! Bạn nhận được: ${rewardsLog.join(', ')}.`, type: 'success' };
    });
});


module.exports = router;
