

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { performAction, updatePlayerState, getFullPlayerQuery } = require('../services/player.service');
const { getGameData } = require('../services/gameData.service');

const router = express.Router();

// GET /api/market/listings - Lấy danh sách vật phẩm đang bán
router.get('/listings', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        // JOIN to get all item details in one query
        // FIX: Replaced MySQL's NOW() with SQLite's datetime('now').
        const listings = await conn.query(`
            SELECT ml.*, pe.equipment_id, e.name, e.description, e.slot, e.bonuses
            FROM market_listings ml
            JOIN player_equipment pe ON ml.item_id = pe.instance_id
            JOIN equipment e ON pe.equipment_id = e.id
            WHERE ml.expires_at > datetime('now') 
            ORDER BY ml.created_at DESC
        `);
        
        const detailedListings = listings.map(listing => ({
            id: listing.id,
            seller_name: listing.seller_name,
            item_id: listing.item_id,
            price: listing.price,
            expires_at: listing.expires_at,
            created_at: listing.created_at,
            item: {
                instance_id: listing.item_id,
                id: listing.equipment_id,
                name: listing.name,
                description: listing.description,
                slot: listing.slot,
                bonuses: typeof listing.bonuses === 'string' ? JSON.parse(listing.bonuses) : (listing.bonuses || []),
            }
        }));

        res.status(200).json(detailedListings);
    } catch (err) {
        console.error("Get Market Listings Error:", err);
        res.status(500).json({ message: 'Lỗi khi tải dữ liệu Chợ Giao Dịch.' });
    } finally {
        if (conn) conn.release();
    }
});

// POST /api/market/list - Đăng bán vật phẩm
router.post('/list', authenticateToken, async (req, res) => {
    const { itemInstanceId, price } = req.body;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        
        const [item] = await conn.query(
            "SELECT * FROM player_equipment WHERE instance_id = ? AND player_name = ? AND is_equipped = 0", // is_equipped is boolean (0/1)
            [itemInstanceId, p.name]
        );
        
        if (!item) {
            throw new Error("Vật phẩm không tồn tại trong túi đồ hoặc đang được trang bị.");
        }
        if (!price || price <= 0) {
            throw new Error("Giá bán không hợp lệ.");
        }

        // Tạo listing mới
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + gameData.MARKET_LISTING_DURATION_HOURS);
        // FIX: Format date for SQLite compatibility
        const expiresAtString = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

        await conn.query(
            "INSERT INTO market_listings (seller_name, item_id, price, expires_at) VALUES (?, ?, ?, ?)",
            [p.name, itemInstanceId, price, expiresAtString]
        );
        
        // Note: The item remains owned by the player but is now "locked" by the listing.
        // We don't remove it from player_equipment.

        const staticItemData = gameData.EQUIPMENT.find(i => i.id === item.equipment_id);
        resRef.log = { message: `Bạn đã đăng bán [${staticItemData?.name}] với giá ${price} Linh Thạch.`, type: 'success' };
    });
});

// POST /api/market/buy/:id - Mua vật phẩm
router.post('/buy/:id', authenticateToken, async (req, res) => {
    const listingId = req.params.id;
    await performAction(req, res, async (conn, p, body, resRef) => {
        const gameData = getGameData();
        // FIX: Replaced NOW() with datetime('now') and removed unsupported FOR UPDATE clause for SQLite.
        const [listing] = await conn.query("SELECT * FROM market_listings WHERE id = ? AND expires_at > datetime('now')", [listingId]);
        
        if (!listing) {
            throw new Error("Vật phẩm không còn tồn tại hoặc đã hết hạn.");
        }
        if (listing.seller_name === p.name) {
            throw new Error("Bạn không thể mua vật phẩm của chính mình.");
        }
        if (p.linh_thach < listing.price) {
            throw new Error("Không đủ Linh Thạch.");
        }

        const tax = Math.floor(listing.price * gameData.MARKET_TAX_RATE);
        const amountToSeller = BigInt(listing.price) - BigInt(tax);

        // 1. Cập nhật người mua: trừ linh thạch
        await updatePlayerState(conn, p.name, {
            linh_thach: BigInt(p.linh_thach) - BigInt(listing.price),
        });

        // 2. Chuyển quyền sở hữu vật phẩm
        await conn.query("UPDATE player_equipment SET player_name = ? WHERE instance_id = ?", [p.name, listing.item_id]);

        // 3. Cập nhật người bán: cộng linh thạch
        await conn.query(
            "UPDATE players SET linh_thach = linh_thach + ? WHERE name = ?",
            [amountToSeller.toString(), listing.seller_name]
        );

        // 4. Xóa listing
        await conn.query("DELETE FROM market_listings WHERE id = ?", [listingId]);
        
        const [equipment] = await conn.query("SELECT e.name FROM player_equipment pe JOIN equipment e ON pe.equipment_id = e.id WHERE pe.instance_id = ?", [listing.item_id]);

        resRef.log = { message: `Mua thành công [${equipment?.name}]!`, type: 'success' };
    });
});

// POST /api/market/cancel/:id - Hủy bán vật phẩm
router.post('/cancel/:id', authenticateToken, async (req, res) => {
    const listingId = req.params.id;
    await performAction(req, res, async (conn, p, body, resRef) => {
        // FIX: Removed unsupported FOR UPDATE clause for SQLite.
        const [listing] = await conn.query("SELECT * FROM market_listings WHERE id = ? AND seller_name = ?", [listingId, p.name]);
        if (!listing) {
            throw new Error("Vật phẩm này không phải của bạn hoặc không tồn tại.");
        }
        
        // Chỉ cần xóa listing, vật phẩm vẫn thuộc sở hữu của người chơi.
        await conn.query("DELETE FROM market_listings WHERE id = ?", [listingId]);
        
        const [equipment] = await conn.query("SELECT e.name FROM player_equipment pe JOIN equipment e ON pe.equipment_id = e.id WHERE pe.instance_id = ?", [listing.item_id]);
        resRef.log = { message: `Bạn đã hủy bán [${equipment?.name}].`, type: 'info' };
    });
});

// GET /api/market/my-listings - Lấy danh sách vật phẩm của tôi
router.get('/my-listings', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const listings = await conn.query(`
            SELECT ml.*, pe.equipment_id, e.name, e.description, e.slot, e.bonuses
            FROM market_listings ml
            JOIN player_equipment pe ON ml.item_id = pe.instance_id
            JOIN equipment e ON pe.equipment_id = e.id
            WHERE ml.seller_name = ? 
            ORDER BY ml.created_at DESC
        `,[req.user.name]);

        const detailedListings = listings.map(listing => ({
            id: listing.id,
            seller_name: listing.seller_name,
            item_id: listing.item_id,
            price: listing.price,
            expires_at: listing.expires_at,
            created_at: listing.created_at,
            item: {
                instance_id: listing.item_id,
                id: listing.equipment_id,
                name: listing.name,
                description: listing.description,
                slot: listing.slot,
                bonuses: typeof listing.bonuses === 'string' ? JSON.parse(listing.bonuses) : (listing.bonuses || []),
            }
        }));

        res.status(200).json(detailedListings);
    } catch (err) {
        console.error("Get My Listings Error:", err);
        res.status(500).json({ message: 'Lỗi khi tải danh sách vật phẩm đang bán.' });
    } finally {
        if (conn) conn.release();
    }
});


module.exports = router;