const express = require('express');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateAdmin, JWT_SECRET } = require('../middleware/auth');
const { reloadGameData, getGameData } = require('../services/gameData.service');
const { processRound } = require('../services/guildWar.service'); // Import processRound
const router = express.Router();

// --- PUBLIC ROUTES (No Auth Required) ---

// POST /api/admin/auth/login - Admin login
router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Tên đăng nhập và mật khẩu là bắt buộc.' });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        const [admin] = await conn.query("SELECT * FROM admins WHERE username = ?", [username]);
        if (!admin) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        // Create a specific admin token with an isAdmin flag
        const adminToken = jwt.sign(
            { username: admin.username, isAdmin: true },
            JWT_SECRET,
            { expiresIn: '1d' } // Admin sessions last 1 day
        );
        
        res.status(200).json({ admin_token: adminToken, username: admin.username });

    } catch (err) {
        console.error("Admin Login Error:", err);
        res.status(500).json({ message: 'Lỗi máy chủ khi đăng nhập quản trị viên.' });
    } finally {
        if (conn) conn.release();
    }
});


// --- PROTECTED ROUTES (Auth Required for all routes below) ---

// POST /api/admin/reload-gamedata - Reload game data cache
router.post('/reload-gamedata', authenticateAdmin, async (req, res) => {
    try {
        await reloadGameData();
        console.log("Admin triggered game data reload.");
        res.status(200).json({ message: "Dữ liệu game đã được làm mới thành công!" });
    } catch (err) {
        console.error("Failed to reload game data via admin API:", err);
        res.status(500).json({ message: "Lỗi khi làm mới dữ liệu game." });
    }
});

// --- Dashboard Stats ---
router.get('/stats', authenticateAdmin, async (req, res) => {
     let conn;
    try {
        conn = await pool.getConnection();
        const [playerCount] = await conn.query("SELECT COUNT(*) as count FROM players");
        const [guildCount] = await conn.query("SELECT COUNT(*) as count FROM guilds");
        res.status(200).json({
            playerCount: playerCount.count,
            guildCount: guildCount.count
        });
    } catch(err) {
        res.status(500).json({ message: `Error getting stats: ${err.message}` });
    } finally {
        if (conn) conn.release();
    }
});


// --- METADATA ENDPOINTS FOR ADMIN PANEL ---
router.get('/metadata/bonus-types', authenticateAdmin, (req, res) => {
    // A centralized place for all bonus types
    const bonusTypes = [
        'qi_per_second_multiplier', 'breakthrough_chance_add', 'hp_add', 'atk_add', 'def_add',
        'hp_mul', 'atk_mul', 'def_mul', 'qi_per_second_base_add', 'body_temper_eff_add', 
        'alchemy_success_base_add', 'speed_add', 'crit_rate_add', 'crit_damage_add', 
        'dodge_rate_add', 'lifesteal_rate_add', 'counter_rate_add'
    ];
    const equipmentSlots = ['weapon', 'armor', 'accessory'];
    res.json({ bonusTypes, equipmentSlots });
});

router.get('/metadata/item-ids', authenticateAdmin, (req, res) => {
    // Provides all item IDs for dropdowns
    const gameData = getGameData();
    res.json({
        pills: gameData.PILLS.map(p => ({ id: p.id, name: p.name })),
        herbs: gameData.HERBS.map(h => ({ id: h.id, name: h.name })),
        equipment: gameData.EQUIPMENT.map(e => ({ id: e.id, name: e.name })),
    });
});


// --- Player Management ---
router.get('/players', authenticateAdmin, async (req, res) => {
    const { search = '' } = req.query;
    let conn;
    try {
        conn = await pool.getConnection();
        const players = await conn.query(
            "SELECT * FROM players WHERE name LIKE ? ORDER BY realmIndex DESC LIMIT 50",
            [`%${search}%`]
        );
        res.status(200).json(players);
    } catch (err) {
        res.status(500).json({ message: `Error searching players: ${err.message}` });
    } finally {
        if (conn) conn.release();
    }
});

router.put('/players/:name', authenticateAdmin, async (req, res) => {
    const { name } = req.params;
    const updates = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        
        // FIX: Let the database handle the updated_at column automatically
        delete updates.updated_at;

        // Special handling for inventory: it's an array of objects like {itemId: '...'}
        if (updates.inventory && Array.isArray(updates.inventory)) {
             updates.inventory = JSON.stringify(updates.inventory.map(item => item.itemId).filter(Boolean));
        }

        const columns = Object.keys(updates);
        const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
        const values = columns.map(col => {
            const value = updates[col];
            // Sanitize and stringify JSON fields
            if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value);
            }
             // Handle boolean
            if (typeof value === 'boolean') {
                return value ? 1 : 0;
            }
            return value;
        });

        if (columns.length > 0) {
            await conn.query(`UPDATE players SET ${setClause} WHERE name = ?`, [...values, name]);
        }
        res.status(200).json({ message: `Cập nhật người chơi ${name} thành công.` });
    } catch (err) {
        res.status(500).json({ message: `Lỗi khi cập nhật người chơi: ${err.message}` });
    } finally {
        if (conn) conn.release();
    }
});

// Helper function to format JS dates/ISO strings to MySQL DATETIME format
const formatDateTimeForDB = (dateString) => {
    if (typeof dateString === 'string' && dateString.includes('T')) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            // Converts to 'YYYY-MM-DD HH:MM:SS' format
            return date.toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
            return dateString;
        }
    }
    return dateString;
};


// --- Generic CRUD Helper ---
const createCrudEndpoints = (tableName, primaryKey = 'id') => {
    // GET /api/admin/{tableName} - Get all items
    router.get(`/${tableName}`, authenticateAdmin, async (req, res) => {
        let conn;
        try {
            conn = await pool.getConnection();
            let query = `SELECT * FROM ${tableName}`;
            if (tableName === 'guilds') {
                query = `
                    SELECT g.*, COUNT(p.name) as memberCount 
                    FROM guilds g 
                    LEFT JOIN players p ON g.id = p.guildId 
                    GROUP BY g.id
                `;
            }
            const items = await conn.query(query);
            res.status(200).json(items);
        } catch (err) {
            res.status(500).json({ message: `Lỗi khi lấy dữ liệu ${tableName}: ${err.message}` });
        } finally {
            if (conn) conn.release();
        }
    });

    // POST /api/admin/{tableName} - Create a new item
    router.post(`/${tableName}`, authenticateAdmin, async (req, res) => {
        let conn;
        try {
            conn = await pool.getConnection();
            const itemData = { ...req.body };

            // If the primary key is sent for an auto-increment column but is empty, remove it
            // so the database can generate the ID. For non-auto-increment keys, the frontend
            // should enforce that a value is provided.
            if (primaryKey in itemData && (itemData[primaryKey] === '' || itemData[primaryKey] === null)) {
                const [pkColumnInfo] = await conn.query(
                    `SELECT EXTRA FROM INFORMATION_SCHEMA.COLUMNS 
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                    [tableName, primaryKey]
                );
                if (pkColumnInfo && pkColumnInfo.EXTRA.includes('auto_increment')) {
                     delete itemData[primaryKey];
                }
            }
            
            const columns = Object.keys(itemData);
            if (columns.length === 0) {
                throw new Error("Không có dữ liệu để tạo mục.");
            }

            const escapedColumns = columns.map(col => `\`${col}\``).join(', ');
            const placeholders = columns.map(() => '?').join(', ');
            const values = columns.map(col => {
                let value = itemData[col];
                if (typeof value === 'object' && value !== null) {
                     return JSON.stringify(value);
                }
                return formatDateTimeForDB(value);
            });

            await conn.query(`INSERT INTO ${tableName} (${escapedColumns}) VALUES (${placeholders})`, values);
            res.status(201).json({ message: `Tạo mục ${tableName} thành công.` });
        } catch (err) {
            console.error(`Error creating item in ${tableName}:`, err);
            res.status(500).json({ message: `Lỗi khi tạo mục ${tableName}: ${err.message}` });
        } finally {
            if (conn) conn.release();
        }
    });

    // PUT /api/admin/{tableName}/:id - Update an item
    router.put(`/${tableName}/:key`, authenticateAdmin, async (req, res) => {
        const { key } = req.params;
        let conn;
        try {
            conn = await pool.getConnection();
            const updates = { ...req.body };
            delete updates[primaryKey]; 
            const columns = Object.keys(updates);
            const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
            const values = columns.map(col => {
                let value = updates[col];
                if (typeof value === 'object' && value !== null) {
                     return JSON.stringify(value);
                }
                return formatDateTimeForDB(value);
            });

            await conn.query(`UPDATE ${tableName} SET ${setClause} WHERE \`${primaryKey}\` = ?`, [...values, key]);
            res.status(200).json({ message: `Cập nhật mục ${tableName} thành công.` });
        } catch (err) {
            res.status(500).json({ message: `Lỗi khi cập nhật ${tableName}: ${err.message}` });
        } finally {
            if (conn) conn.release();
        }
    });

    // DELETE /api/admin/{tableName}/:id - Delete an item
    router.delete(`/${tableName}/:key`, authenticateAdmin, async (req, res) => {
        const { key } = req.params;
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.query(`DELETE FROM ${tableName} WHERE \`${primaryKey}\` = ?`, [key]);
            res.status(200).json({ message: `Xóa mục ${tableName} thành công.` });
        } catch (err) {
            res.status(500).json({ message: `Lỗi khi xóa ${tableName}: ${err.message}` });
        } finally {
            if (conn) conn.release();
        }
    });
};

// --- Create all CRUD endpoints for game data ---
createCrudEndpoints('herbs');
createCrudEndpoints('pills');
createCrudEndpoints('recipes');
createCrudEndpoints('techniques');
createCrudEndpoints('equipment');
createCrudEndpoints('insights');
createCrudEndpoints('exploration_locations');
createCrudEndpoints('trial_zones');
createCrudEndpoints('realms', 'realmIndex');
createCrudEndpoints('spiritual_roots');
createCrudEndpoints('honor_shop_items');
createCrudEndpoints('events');
createCrudEndpoints('gift_codes', 'code');
createCrudEndpoints('guilds');
createCrudEndpoints('market_listings');
createCrudEndpoints('guild_wars'); 
createCrudEndpoints('pvp_skills'); 

// --- Guild War Management Endpoints ---

// GET /api/admin/guild_war_details - Get comprehensive details of the active war
router.get('/guild_war_details', authenticateAdmin, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const [active_war] = await conn.query("SELECT * FROM guild_wars WHERE status != 'COMPLETED' ORDER BY start_time ASC LIMIT 1");
        if (!active_war) {
            return res.status(200).json({ active_war: null, matches: [] });
        }

        const matches = await conn.query(`
            SELECT 
                m.*,
                g1.name as guild1_name,
                g2.name as guild2_name
            FROM guild_war_matches m
            JOIN guilds g1 ON m.guild1_id = g1.id
            JOIN guilds g2 ON m.guild2_id = g2.id
            WHERE m.war_id = ?
        `, [active_war.id]);
        
        for (const match of matches) {
            const lineups = await conn.query("SELECT * FROM guild_war_lineups WHERE match_id = ? AND round_number = ?", [match.id, match.current_round]);
            match.guild1_lineup = lineups.find(l => l.guild_id === match.guild1_id) || null;
            match.guild2_lineup = lineups.find(l => l.guild_id === match.guild2_id) || null;
        }

        res.status(200).json({ active_war, matches });

    } catch (err) {
        res.status(500).json({ message: `Lỗi khi lấy chi tiết Tông Môn Chiến: ${err.message}` });
    } finally {
        if (conn) conn.release();
    }
});

// POST /api/admin/guild_war/force_process/:matchId - Manually trigger round processing
router.post('/guild_war/force_process/:matchId', authenticateAdmin, async (req, res) => {
    const { matchId } = req.params;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        
        await processRound(conn, matchId);
        
        await conn.commit();
        res.status(200).json({ message: `Đã xử lý vòng đấu cho trận ${matchId}.` });
    } catch (err) {
        if(conn) await conn.rollback();
        res.status(500).json({ message: `Lỗi khi xử lý vòng đấu: ${err.message}` });
    } finally {
        if (conn) conn.release();
    }
});


module.exports = router;