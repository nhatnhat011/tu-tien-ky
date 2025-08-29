const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { performAction, updatePlayerState } = require('../services/player.service');
const { getGameData } = require('../services/gameData.service');
const { formatNumber, getGuildNextLevelExp } = require('../utils/formatters');

const router = express.Router();

const getGuildMemberLimit = (level) => {
    if (level <= 0) return 0;
    // Base 10 members at level 1, +2 members for each subsequent level.
    return 10 + (level - 1) * 2;
};

// GET /api/guilds - Lấy danh sách tất cả Tông Môn
router.get('/', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const guilds = await conn.query(`
            SELECT g.id, g.name, g.leaderName, g.level, COUNT(p.name) as memberCount 
            FROM guilds g 
            LEFT JOIN players p ON g.id = p.guildId 
            GROUP BY g.id 
            ORDER BY g.level DESC, memberCount DESC
        `);
        res.status(200).json(guilds);
    } catch (err) {
        console.error("Get Guilds Error:", err.message);
        res.status(500).json({ message: 'Lỗi khi tải danh sách Tông Môn.' });
    } finally {
        if (conn) conn.release();
    }
});

// GET /api/guilds/details/:id - Lấy thông tin chi tiết và thành viên của một Tông Môn
router.get('/details/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        const guilds = await conn.query("SELECT * FROM guilds WHERE id = ?", [id]);
        if (guilds.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy Tông Môn.' });
        }
        const members = await conn.query(
            "SELECT name, realmIndex FROM players WHERE guildId = ? ORDER BY realmIndex DESC, qi DESC",
            [id]
        );
        res.status(200).json({ ...guilds[0], members });
    } catch (err) {
        console.error("Get Guild Details Error:", err.message);
        res.status(500).json({ message: 'Lỗi khi tải thông tin Tông Môn.' });
    } finally {
        if (conn) conn.release();
    }
});

// POST /api/guilds/create - Tạo Tông Môn mới
router.post('/create', authenticateToken, async (req, res) => {
    const { guildName } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        if (!guildName || guildName.length < 3 || guildName.length > 20) {
            throw new Error('Tên Tông Môn phải từ 3 đến 20 ký tự.');
        }
        if (p.guildId) throw new Error('Bạn đã ở trong một Tông Môn.');
        if (p.qi < gameData.GUILD_CREATION_COST) throw new Error(`Cần ${formatNumber(gameData.GUILD_CREATION_COST)} Linh Khí để lập Tông Môn.`);

        const existingGuild = await conn.query("SELECT id FROM guilds WHERE name = ?", [guildName]);
        if (existingGuild.length > 0) throw new Error('Tên Tông Môn đã tồn tại.');

        const result = await conn.query("INSERT INTO guilds (name, leaderName) VALUES (?, ?)", [guildName, p.name]);
        const newGuildId = result.insertId;

        await updatePlayerState(conn, p.name, {
            guildId: newGuildId,
            qi: p.qi - gameData.GUILD_CREATION_COST,
        });

        resRef.log = { message: `Chúc mừng! Bạn đã thành lập ${guildName} thành công!`, type: 'success' };
    });
});

// POST /api/guilds/contribute - Cống hiến cho Tông Môn
router.post('/contribute', authenticateToken, async (req, res) => {
    const { amount } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        if (!p.guildId) throw new Error('Bạn không ở trong Tông Môn nào.');
        if (!amount || amount <= 0) throw new Error('Lượng cống hiến không hợp lệ.');
        if (p.qi < amount) throw new Error('Linh khí không đủ để cống hiến.');

        const guilds = await conn.query("SELECT * FROM guilds WHERE id = ? FOR UPDATE", [p.guildId]);
        if (guilds.length === 0) throw new Error('Tông Môn không tồn tại.');
        const guild = guilds[0];

        await updatePlayerState(conn, p.name, { qi: p.qi - amount });
        let newExp = BigInt(guild.exp) + BigInt(amount);
        let newLevel = guild.level;
        let expForNextLevel = BigInt(getGuildNextLevelExp(newLevel));

        while (newExp >= expForNextLevel) {
            newLevel++;
            newExp -= expForNextLevel;
            expForNextLevel = BigInt(getGuildNextLevelExp(newLevel));
            resRef.log = { message: `Tông Môn đã dốc sức đồng lòng, đột phá tới cấp ${newLevel}!`, type: 'success' };
        }

        await conn.query("UPDATE guilds SET level = ?, exp = ? WHERE id = ?", [newLevel, newExp, p.guildId]);
        
        if (!resRef.log) {
           resRef.log = { message: `Bạn đã cống hiến ${formatNumber(amount)} linh khí cho Tông Môn.`, type: 'info' };
        }
    });
});


// POST /api/guilds/join/:id - Gia nhập Tông Môn
router.post('/join/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    await performAction(req, res, async (conn, p, body, resRef) => {
        if (p.guildId) throw new Error('Bạn đã ở trong một Tông Môn.');
        
        const [guild] = await conn.query("SELECT id, name, level FROM guilds WHERE id = ?", [id]);
        if (!guild) throw new Error('Tông Môn không tồn tại.');

        const [memberCountResult] = await conn.query("SELECT COUNT(*) as count FROM players WHERE guildId = ?", [id]);
        const limit = getGuildMemberLimit(guild.level);
        if (memberCountResult.count >= limit) {
            throw new Error('Tông Môn đã đủ thành viên, không thể gia nhập.');
        }

        await updatePlayerState(conn, p.name, { guildId: id });
        resRef.log = { message: `Bạn đã gia nhập [${guild.name}] thành công.`, type: 'success' };
    });
});

// POST /api/guilds/leave - Rời Tông Môn
router.post('/leave', authenticateToken, async (req, res) => {
     await performAction(req, res, async (conn, p, body, resRef) => {
        if (!p.guildId) throw new Error('Bạn không ở trong Tông Môn nào.');

        const guild = await conn.query("SELECT leaderName FROM guilds WHERE id = ?", [p.guildId]);
        
        if (guild.length > 0 && guild[0].leaderName === p.name) {
            // Leader leaves, dissolves the guild
            await conn.query("DELETE FROM guilds WHERE id = ?", [p.guildId]); // players' guildId is set to NULL by FOREIGN KEY ON DELETE SET NULL
            resRef.log = { message: 'Bạn đã rời đi, Tông Môn theo đó cũng giải tán.', type: 'warning' };
        } else {
            // Member leaves
            await updatePlayerState(conn, p.name, { guildId: null });
            resRef.log = { message: 'Bạn đã rời khỏi Tông Môn.', type: 'info' };
        }
    });
});

module.exports = router;