const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { processOfflineGains, calculateTotalBonuses, calculateCombatStats } = require('../services/player.service');

const router = express.Router();

// [GET] /api/load - Tải/Đồng bộ trạng thái người chơi
router.get('/load', authenticateToken, async (req, res) => {
    const name = req.user.name;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const data = await processOfflineGains(conn, name);

        await conn.commit();
        
        res.status(200).json(data);

    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Load/Sync Error:", err.message);
        res.status(500).json({ message: 'Lỗi khi đồng bộ dữ liệu từ máy chủ.' });
    } finally {
        if (conn) conn.release();
    }
});


// [GET] /api/leaderboard - Lấy Bảng Xếp Hạng
router.get('/leaderboard', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const leaderboard = await conn.query(
            "SELECT name, realmIndex FROM players ORDER BY realmIndex DESC, qi DESC, bodyStrength DESC LIMIT 20"
        );
        res.status(200).json(leaderboard);
    } catch (err) {
        console.error("Leaderboard Error:", err.message);
        res.status(500).json({ message: 'Lỗi khi tải bảng xếp hạng.' });
    } finally {
        if (conn) conn.release();
    }
});

// [GET] /api/player/:name - Lấy thông tin của người chơi khác để quan sát
router.get('/player/:name', authenticateToken, async (req, res) => {
    const { name } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const players = await conn.query(
            "SELECT * FROM players WHERE name = ?", // Get all data needed for calculation
            [name]
        );

        if (players.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy đạo hữu này.' });
        }
        
        const player = await require('../services/player.service').getFullPlayerQuery(conn, name);

        const bonuses = await calculateTotalBonuses(conn, player);
        const stats = calculateCombatStats(player, bonuses);

        const inspectData = {
            name: player.name,
            realmIndex: player.realmIndex,
            bodyStrength: player.bodyStrength,
            karma: player.karma,
            activeTechniqueId: player.activeTechniqueId,
            spiritualRoot: player.spiritualRoot,
            calculatedHp: stats.hp,
            calculatedAtk: stats.atk,
            calculatedDef: stats.def,
            calculatedSpeed: stats.speed,
            calculatedCritRate: stats.critRate,
            calculatedCritDamage: stats.critDamage,
            calculatedDodgeRate: stats.dodgeRate,
            calculatedLifesteal: stats.lifestealRate,
            calculatedCounter: stats.counterRate,
            calculatedHitRate: stats.hitRate,
            calculatedCritResist: stats.critResist,
            calculatedLifestealResist: stats.lifestealResist,
            calculatedCounterResist: stats.counterResist,
        };
        
        res.status(200).json(inspectData);

    } catch (err) {
        console.error("Inspect Player Error:", err.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin người chơi.' });
    } finally {
        if (conn) conn.release();
    }
});


module.exports = router;
