const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET } = require('../middleware/auth');
const { getGameData } = require('../services/gameData.service');

const router = express.Router();

// [POST] /api/auth/register - Đăng ký tài khoản mới
router.post('/register', async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password || password.length < 6) {
        return res.status(400).json({ message: 'Tên và mật khẩu (tối thiểu 6 ký tự) là bắt buộc.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const existingUser = await conn.query("SELECT name FROM players WHERE name = ?", [name]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Tên đạo hữu này đã tồn tại.' });
        }
        
        const gameData = getGameData();
        // Randomly assign a spiritual root
        const randomRoot = gameData.SPIRITUAL_ROOTS[Math.floor(Math.random() * gameData.SPIRITUAL_ROOTS.length)];
        const assignedRootId = randomRoot.id;

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        await conn.query(
            "INSERT INTO players (name, password, updated_at, karma, learnedTechniques, activeTechniqueId, lastChallengeTime, pills, herbs, spiritualRoot, honorPoints, enlightenmentPoints, unlockedInsights, purchasedHonorItems, explorationStatus, linh_thach, pvpBuff, learned_pvp_skills) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                name,
                hashedPassword,
                now, // updated_at
                0, // karma
                JSON.stringify([]), // learnedTechniques
                null, // activeTechniqueId
                JSON.stringify({}), // lastChallengeTime
                JSON.stringify({}), // pills
                JSON.stringify({}), // herbs
                assignedRootId,
                0, // honorPoints
                0, // enlightenmentPoints
                JSON.stringify([]), // unlockedInsights
                JSON.stringify([]), // purchasedHonorItems
                null, // explorationStatus
                0, // linh_thach
                null, // pvpBuff
                JSON.stringify([]), // learned_pvp_skills
            ]
        );
        res.status(201).json({ message: 'Đăng ký thành công! Giờ bạn có thể đăng nhập.' });
    } catch (err) {
        console.error("Register Error:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký.' });
    } finally {
        if (conn) conn.release();
    }
});

// [POST] /api/auth/login - Đăng nhập
router.post('/login', async (req, res) => {
    const { name, password } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        const users = await conn.query("SELECT * FROM players WHERE name = ?", [name]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Tên hoặc mật khẩu không đúng.' });
        }
        const user = users[0];

        // NEW: Check if player is banned
        if (user.is_banned) {
            return res.status(403).json({ message: `Tài khoản của bạn đã bị khóa. Lý do: ${user.ban_reason || 'Không có lý do cụ thể.'}` });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Tên hoặc mật khẩu không đúng.' });
        }

        const token = jwt.sign({ name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, playerName: user.name });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập.' });
    } finally {
        if (conn) conn.release();
    }
});

module.exports = router;