-- ==========================================
-- Tu Tiên Ký: Hư Vô Lộ - Database Schema (SQLite Version)
-- ==========================================

-- Bật hỗ trợ khóa ngoại
PRAGMA foreign_keys = ON;

-- ==========================================
-- CORE GAME DATA TABLES
-- ==========================================

-- Realms Table
CREATE TABLE IF NOT EXISTS `realms` (
  `realmIndex` INTEGER NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `qiThreshold` INTEGER NOT NULL,
  `baseQiPerSecond` REAL NOT NULL,
  `breakthroughChance` REAL NOT NULL,
  `baseHp` INTEGER NOT NULL,
  `baseAtk` INTEGER NOT NULL,
  `baseDef` INTEGER NOT NULL,
  `baseSpeed` INTEGER NOT NULL DEFAULT 10,
  `baseCritRate` REAL NOT NULL DEFAULT 0.05,
  `baseCritDamage` REAL NOT NULL DEFAULT 1.5,
  `baseDodgeRate` REAL NOT NULL DEFAULT 0.01,
  `baseHitRate` REAL NOT NULL DEFAULT 0.0,
  `baseCritResist` REAL NOT NULL DEFAULT 0.0,
  `baseLifestealResist` REAL NOT NULL DEFAULT 0.0,
  `baseCounterResist` REAL NOT NULL DEFAULT 0.0
);

-- Spiritual Roots Table
CREATE TABLE IF NOT EXISTS `spiritual_roots` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `bonus` TEXT NOT NULL -- JSON stored as TEXT
);

-- Herbs Table
CREATE TABLE IF NOT EXISTS `herbs` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT
);

-- Pills Table
CREATE TABLE IF NOT EXISTS `pills` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `effect` TEXT NOT NULL -- JSON stored as TEXT
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS `recipes` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `pillId` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INTEGER NOT NULL,
  `qiCost` INTEGER NOT NULL,
  `herbCosts` TEXT NOT NULL, -- JSON stored as TEXT
  `successChance` REAL NOT NULL,
  FOREIGN KEY (`pillId`) REFERENCES `pills`(`id`) ON DELETE CASCADE
);

-- Techniques Table
CREATE TABLE IF NOT EXISTS `techniques` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INTEGER NOT NULL,
  `bonuses` TEXT NOT NULL -- JSON stored as TEXT
);

-- Equipment Table
CREATE TABLE IF NOT EXISTS `equipment` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `slot` TEXT NOT NULL, -- 'weapon', 'armor', 'accessory'
  `bonuses` TEXT NOT NULL -- JSON stored as TEXT
);

-- Insights Table
CREATE TABLE IF NOT EXISTS `insights` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `cost` INTEGER NOT NULL,
  `requiredInsightIds` TEXT NOT NULL, -- JSON stored as TEXT
  `bonus` TEXT NOT NULL -- JSON stored as TEXT
);

-- Exploration Locations Table
CREATE TABLE IF NOT EXISTS `exploration_locations` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INTEGER NOT NULL,
  `requiredBodyStrength` INTEGER NOT NULL,
  `durationSeconds` INTEGER NOT NULL,
  `rewards` TEXT NOT NULL -- JSON stored as TEXT
);

-- Trial Zones Table
CREATE TABLE IF NOT EXISTS `trial_zones` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INTEGER NOT NULL,
  `cooldownSeconds` INTEGER NOT NULL,
  `monster` TEXT NOT NULL, -- JSON stored as TEXT
  `rewards` TEXT NOT NULL -- JSON stored as TEXT
);

-- Honor Shop Items Table
CREATE TABLE IF NOT EXISTS `honor_shop_items` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `type` TEXT NOT NULL,
  `itemId` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `cost` INTEGER NOT NULL,
  `isUnique` INTEGER NOT NULL DEFAULT 0 -- 0 for false, 1 for true
);

-- PvP Skills Table
CREATE TABLE IF NOT EXISTS `pvp_skills` (
  `id` TEXT NOT NULL PRIMARY KEY,
  `name` TEXT NOT NULL,
  `description` TEXT,
  `cost` INTEGER NOT NULL,
  `energy_cost` INTEGER NOT NULL,
  `effect` TEXT NOT NULL -- JSON stored as TEXT
);


-- Game Configuration Table
CREATE TABLE IF NOT EXISTS `game_config` (
  `config_key` TEXT NOT NULL PRIMARY KEY,
  `config_value` TEXT NOT NULL -- JSON stored as TEXT
);

-- ==========================================
-- PLAYER AND SYSTEM TABLES
-- ==========================================

-- Guilds Table
CREATE TABLE IF NOT EXISTS `guilds` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL UNIQUE,
  `leaderName` TEXT NOT NULL,
  `level` INTEGER NOT NULL DEFAULT 1,
  `exp` INTEGER NOT NULL DEFAULT 0,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Players Table
CREATE TABLE IF NOT EXISTS `players` (
  `name` TEXT NOT NULL PRIMARY KEY,
  `password` TEXT NOT NULL,
  `qi` REAL NOT NULL DEFAULT 0,
  `realmIndex` INTEGER NOT NULL DEFAULT 0,
  `bodyStrength` REAL NOT NULL DEFAULT 0,
  `updated_at` TEXT NOT NULL,
  `guildId` INTEGER NULL,
  `karma` INTEGER NOT NULL DEFAULT 0,
  `lastChallengeTime` TEXT NULL DEFAULT '{}',
  `pills` TEXT NULL DEFAULT '{}',
  `herbs` TEXT NULL DEFAULT '{}',
  `spiritualRoot` TEXT NULL,
  `honorPoints` INTEGER NOT NULL DEFAULT 0,
  `learnedTechniques` TEXT NULL DEFAULT '[]',
  `activeTechniqueId` TEXT NULL,
  `enlightenmentPoints` INTEGER NOT NULL DEFAULT 0,
  `unlockedInsights` TEXT NULL DEFAULT '[]',
  `explorationStatus` TEXT NULL,
  `purchasedHonorItems` TEXT NULL DEFAULT '[]',
  `is_banned` INTEGER NOT NULL DEFAULT 0,
  `ban_reason` TEXT NULL,
  `linh_thach` INTEGER NOT NULL DEFAULT 0,
  `pvpBuff` TEXT NULL,
  `learned_pvp_skills` TEXT NULL DEFAULT '[]',
  FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE SET NULL
);
-- Trigger to auto-update updated_at timestamp REMOVED. Logic is now handled by the application server.


-- Player Equipment Table (Instance-based items)
CREATE TABLE IF NOT EXISTS `player_equipment` (
  `instance_id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `player_name` TEXT NOT NULL,
  `equipment_id` TEXT NOT NULL,
  `is_equipped` INTEGER NOT NULL DEFAULT 0,
  `slot` TEXT NULL,
  FOREIGN KEY (`player_name`) REFERENCES `players`(`name`) ON DELETE CASCADE,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_player_equipment` ON `player_equipment` (`player_name`, `is_equipped`);


-- Chat Messages Table
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `playerName` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `timestamp` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_timestamp` ON `chat_messages` (`timestamp`);

-- PvP History Table
CREATE TABLE IF NOT EXISTS `pvp_history` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `attacker_name` TEXT NOT NULL,
  `defender_name` TEXT NOT NULL,
  `winner_name` TEXT NOT NULL,
  `funny_summary` TEXT NOT NULL,
  `combat_log` TEXT NOT NULL, -- JSON stored as TEXT
  `timestamp` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS `idx_attacker` ON `pvp_history` (`attacker_name`);
CREATE INDEX IF NOT EXISTS `idx_defender` ON `pvp_history` (`defender_name`);

-- Events Table
CREATE TABLE IF NOT EXISTS `events` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `title` TEXT NOT NULL,
  `description` TEXT,
  `bonus_type` TEXT NOT NULL,
  `bonus_value` REAL NOT NULL,
  `starts_at` TEXT NOT NULL,
  `expires_at` TEXT NOT NULL,
  `is_active` INTEGER DEFAULT 1
);

-- Gift Codes Table
CREATE TABLE IF NOT EXISTS `gift_codes` (
  `code` TEXT PRIMARY KEY,
  `rewards` TEXT NOT NULL, -- JSON stored as TEXT
  `max_uses` INTEGER DEFAULT NULL,
  `uses` INTEGER NOT NULL DEFAULT 0,
  `expires_at` TEXT NULL
);

-- Redeemed Codes Table
CREATE TABLE IF NOT EXISTS `player_redeemed_codes` (
  `player_name` TEXT NOT NULL,
  `code` TEXT NOT NULL,
  `redeemed_at` TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`player_name`, `code`),
  FOREIGN KEY (`player_name`) REFERENCES `players`(`name`) ON DELETE CASCADE,
  FOREIGN KEY (`code`) REFERENCES `gift_codes`(`code`) ON DELETE CASCADE
);

-- Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `username` TEXT NOT NULL PRIMARY KEY,
  `password` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Marketplace Listings Table
CREATE TABLE IF NOT EXISTS `market_listings` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `seller_name` TEXT NOT NULL,
  `item_id` INTEGER NOT NULL UNIQUE,
  `price` INTEGER NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `expires_at` TEXT NOT NULL,
  FOREIGN KEY (`seller_name`) REFERENCES `players`(`name`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `player_equipment`(`instance_id`) ON DELETE CASCADE
);


-- ==========================================
-- GUILD WAR TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS `guild_wars` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `start_time` TEXT NOT NULL,
  `status` TEXT NOT NULL CHECK(`status` IN ('PENDING', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'PENDING',
  `rewards` TEXT NULL -- JSON stored as TEXT
);

CREATE TABLE IF NOT EXISTS `guild_war_registrations` (
  `war_id` INTEGER NOT NULL,
  `guild_id` INTEGER NOT NULL,
  `registered_at` TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (`war_id`, `guild_id`),
  FOREIGN KEY (`war_id`) REFERENCES `guild_wars`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `guild_war_matches` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `war_id` INTEGER NOT NULL,
  `guild1_id` INTEGER NOT NULL,
  `guild2_id` INTEGER NOT NULL,
  `current_round` INTEGER NOT NULL DEFAULT 1,
  `guild1_round_wins` INTEGER NOT NULL DEFAULT 0,
  `guild2_round_wins` INTEGER NOT NULL DEFAULT 0,
  `winner_guild_id` INTEGER NULL,
  `status` TEXT NOT NULL CHECK(`status` IN ('PENDING_LINEUP', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'PENDING_LINEUP',
  FOREIGN KEY (`war_id`) REFERENCES `guild_wars`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild1_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild2_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `guild_war_lineups` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `match_id` INTEGER NOT NULL,
  `round_number` INTEGER NOT NULL,
  `guild_id` INTEGER NOT NULL,
  `player1_name` TEXT NOT NULL,
  `player2_name` TEXT NOT NULL,
  `player3_name` TEXT NOT NULL,
  `submitted_at` TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (`match_id`, `round_number`, `guild_id`),
  FOREIGN KEY (`match_id`) REFERENCES `guild_war_matches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `guild_war_fights` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `match_id` INTEGER NOT NULL,
  `round_number` INTEGER NOT NULL,
  `guild1_player` TEXT NOT NULL,
  `guild2_player` TEXT NOT NULL,
  `winner_player` TEXT NOT NULL,
  `combat_log` TEXT NOT NULL, -- JSON stored as TEXT
  `fight_order` INTEGER NOT NULL, -- 1, 2, or 3 within the round
  FOREIGN KEY (`match_id`) REFERENCES `guild_war_matches`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `guild_war_match_participants` (
  `match_id` INTEGER NOT NULL,
  `player_name` TEXT NOT NULL,
  PRIMARY KEY (`match_id`, `player_name`),
  FOREIGN KEY (`match_id`) REFERENCES `guild_war_matches`(`id`) ON DELETE CASCADE
);


-- ==========================================
-- POPULATE CORE GAME DATA
-- ==========================================

-- Use INSERT OR IGNORE to make it safe to run multiple times
INSERT OR IGNORE INTO `realms` (`realmIndex`, `name`, `qiThreshold`, `baseQiPerSecond`, `breakthroughChance`, `baseHp`, `baseAtk`, `baseDef`, `baseSpeed`, `baseCritRate`, `baseCritDamage`, `baseDodgeRate`, `baseHitRate`, `baseCritResist`, `baseLifestealResist`, `baseCounterResist`) VALUES
(0, 'Phàm Nhân', 100, 1, 1, 50, 5, 0, 10, 0.05, 1.5, 0.01, 0.0, 0.0, 0.0, 0.0),
(1, 'Luyện Khí Kỳ', 1000, 5, 0.9, 200, 15, 5, 12, 0.05, 1.5, 0.02, 0.01, 0.01, 0.0, 0.0),
(2, 'Trúc Cơ Kỳ', 10000, 25, 0.75, 1000, 50, 20, 15, 0.06, 1.55, 0.03, 0.02, 0.015, 0.01, 0.01),
(3, 'Kim Đan Kỳ', 100000, 125, 0.6, 5000, 200, 80, 20, 0.07, 1.6, 0.04, 0.03, 0.02, 0.015, 0.015),
(4, 'Nguyên Anh Kỳ', 1000000, 625, 0.45, 25000, 800, 300, 25, 0.08, 1.65, 0.05, 0.04, 0.025, 0.02, 0.02),
(5, 'Hóa Thần Kỳ', 10000000, 3125, 0.3, 125000, 3500, 1200, 35, 0.1, 1.75, 0.06, 0.05, 0.03, 0.025, 0.025),
(6, 'Luyện Hư Kỳ', 100000000, 15625, 0.15, 600000, 15000, 5000, 50, 0.12, 1.9, 0.08, 0.06, 0.04, 0.03, 0.03),
(7, 'Đại Thừa Kỳ', 9007199254740991, 78125, 0.05, 3000000, 75000, 25000, 70, 0.15, 2.2, 0.1, 0.08, 0.05, 0.04, 0.04);

INSERT OR IGNORE INTO `spiritual_roots` (`id`, `name`, `description`, `bonus`) VALUES
('kim', 'Kim Linh Căn', 'Thân thể cứng như kim loại, tăng 15% Phòng Ngự.', '{"type": "def_mul", "value": 1.15}'),
('moc', 'Mộc Linh Căn', 'Thân với thảo mộc, tăng 5% tỷ lệ thành công Luyện Đan và 10% sản lượng Thám Hiểm.', '{"type": "alchemy_success_add", "value": 0.05}'),
('thuy', 'Thủy Linh Căn', 'Tâm tĩnh như nước, tốc độ hấp thụ linh khí căn bản tăng 0.5 điểm mỗi giây.', '{"type": "qi_per_second_add", "value": 0.5}'),
('hoa', 'Hỏa Linh Căn', 'Tính nóng như lửa, tăng 10% Công Kích.', '{"type": "atk_mul", "value": 1.1}'),
('tho', 'Thổ Linh Căn', 'Vững như bàn thạch, tăng 15% Sinh Lực.', '{"type": "hp_mul", "value": 1.15}');

INSERT OR IGNORE INTO `herbs` (`id`, `name`, `description`) VALUES
('linh_thao', 'Linh Thảo', 'Loại cỏ dại phổ biến, chứa một ít linh khí.'),
('huyet_tham', 'Huyết Sâm', 'Loại sâm quý mọc ở nơi âm khí nặng, có tác dụng bổ khí huyết.'),
('tinh_nguyet_hoa', 'Tinh Nguyệt Hoa', 'Bông hoa chỉ nở vào đêm trăng tròn, hấp thụ tinh hoa của trời đất.');

INSERT OR IGNORE INTO `pills` (`id`, `name`, `description`, `effect`) VALUES
('hoi_khi_dan', 'Hồi Khí Đan', 'Đan dược cấp thấp, có thể ngay lập tức bổ sung một lượng nhỏ linh khí.', '{"type": "instant_qi", "amount": 500}'),
('tinh_nguyen_dan', 'Tinh Nguyên Đan', 'Đan dược trung cấp, luyện hóa từ tinh hoa linh thảo, bổ sung lượng lớn linh khí.', '{"type": "instant_qi", "amount": 10000}'),
('chien_than_dan', 'Chiến Thần Đan', 'Đan dược đặc biệt, dùng trước khi Đấu Pháp sẽ tăng 20% sát thương trong trận đấu tiếp theo.', '{"type": "pvp_attack_buff", "value": 1.2, "duration_matches": 1}');

INSERT OR IGNORE INTO `recipes` (`id`, `pillId`, `name`, `description`, `requiredRealmIndex`, `qiCost`, `herbCosts`, `successChance`) VALUES
('recipe_hoi_khi_dan', 'hoi_khi_dan', 'Đan Phương: Hồi Khí Đan', 'Một phương pháp luyện đan đơn giản, phổ biến trong giới tu tiên Luyện Khí Kỳ.', 1, 100, '{"linh_thao": 5}', 0.8),
('recipe_tinh_nguyen_dan', 'tinh_nguyen_dan', 'Đan Phương: Tinh Nguyên Đan', 'Đan phương phức tạp hơn, yêu cầu tu vi Trúc Cơ Kỳ để có thể khống hỏa luyện chế.', 2, 2000, '{"huyet_tham": 3, "tinh_nguyet_hoa": 1}', 0.6);

INSERT OR IGNORE INTO `techniques` (`id`, `name`, `description`, `requiredRealmIndex`, `bonuses`) VALUES
('dan_khi_quyet', 'Dẫn Khí Quyết', 'Công pháp nhập môn, giúp tăng tốc độ hấp thụ linh khí cơ bản.', 1, '[{"type": "qi_per_second_multiplier", "value": 1.2}]'),
('ngung_than_thuat', 'Ngưng Thần Thuật', 'Ổn định tâm cảnh, giúp tăng nhẹ khả năng thành công khi đột phá.', 2, '[{"type": "breakthrough_chance_add", "value": 0.05}]'),
('hon_nguyen_cong', 'Hỗn Nguyên Công', 'Công pháp thượng thừa, tăng mạnh tốc độ tu luyện nhưng khiến linh khí không ổn định, giảm nhẹ tỷ lệ đột phá.', 3, '[{"type": "qi_per_second_multiplier", "value": 1.5}, {"type": "breakthrough_chance_add", "value": -0.05}]'),
('van_kiem_quyet', 'Vạn Kiếm Quyết', 'Lấy kiếm ý rèn luyện tâm ma, tăng mạnh hiệu suất tu luyện và khả năng đột phá.', 4, '[{"type": "qi_per_second_multiplier", "value": 1.3}, {"type": "breakthrough_chance_add", "value": 0.1}]');

INSERT OR IGNORE INTO `equipment` (`id`, `name`, `description`, `slot`, `bonuses`) VALUES
('tu_linh_chau', 'Tụ Linh Châu', 'Một viên châu có khả năng tụ tập linh khí trời đất, giúp tăng tốc độ tu luyện.', 'accessory', '[{"type": "qi_per_second_multiplier", "value": 1.1}]'),
('ho_than_phu', 'Hộ Thân Phù', 'Lá bùa hộ mệnh, tăng cường sinh lực cho người mang nó khi chiến đấu.', 'accessory', '[{"type": "hp_add", "value": 500}]'),
('pha_quan_giap', 'Phá Quân Giáp', 'Chiến giáp được rèn từ máu của vạn quân địch, tăng 10% công và 10% thủ khi Đấu Pháp.', 'armor', '[{"type": "atk_mul", "value": 1.1}, {"type": "def_mul", "value": 1.1}]'),
('huyen_thiet_kiem', 'Huyền Thiết Kiếm', 'Một thanh trọng kiếm đơn giản nhưng đầy uy lực.', 'weapon', '[{"type": "atk_add", "value": 100}]');

INSERT OR IGNORE INTO `insights` (`id`, `name`, `description`, `cost`, `requiredInsightIds`, `bonus`) VALUES
('basic_understanding', 'Sơ Khuy Môn Kính', 'Bước đầu lĩnh ngộ thiên địa, tăng nhẹ tốc độ hấp thụ linh khí cơ bản.', 1, '[]', '{"type": "qi_per_second_base_add", "value": 0.2}'),
('body_harmony', 'Nhục Thân Tương Hợp', 'Hiểu rõ hơn về cơ thể, tăng nhẹ hiệu quả của việc tôi luyện thân thể.', 3, '["basic_understanding"]', '{"type": "body_temper_eff_add", "value": 0.05}'),
('alchemy_intuition', 'Đan Đạo Trực Giác', 'Tâm thần hợp nhất với đan lô, tăng nhẹ tỷ lệ thành công khi luyện đan.', 3, '["basic_understanding"]', '{"type": "alchemy_success_base_add", "value": 0.02}');

INSERT OR IGNORE INTO `exploration_locations` (`id`, `name`, `description`, `requiredRealmIndex`, `requiredBodyStrength`, `durationSeconds`, `rewards`) VALUES
('thanh_son_mach', 'Thanh Sơn Mạch', 'Dãy núi gần nhất, linh khí tuy mỏng manh nhưng an toàn cho người mới tu luyện.', 1, 0, 60, '[{"type": "herb", "herbId": "linh_thao", "amount": 3}]'),
('hac_phong_son', 'Hắc Phong Sơn', 'Nơi yêu thú cấp thấp hoành hành, có cơ duyên nhưng cũng đầy rẫy nguy hiểm.', 2, 10, 300, '[{"type": "herb", "herbId": "linh_thao", "amount": 5}, {"type": "herb", "herbId": "huyet_tham", "amount": 1}]'),
('u_vu_dam', 'U Vụ Đầm Lầy', 'Đầm lầy chướng khí, nghe đồn có linh thảo hiếm nhưng rất khó tìm.', 3, 50, 900, '[{"type": "herb", "herbId": "huyet_tham", "amount": 3}, {"type": "herb", "herbId": "tinh_nguyet_hoa", "amount": 1}]');

INSERT OR IGNORE INTO `trial_zones` (`id`, `name`, `description`, `requiredRealmIndex`, `cooldownSeconds`, `monster`, `rewards`) VALUES
('van_thu_coc', 'Vạn Thú Cốc', 'Nơi tập trung của các yêu thú cấp thấp, thích hợp cho tu sĩ Luyện Khí Kỳ rèn luyện.', 1, 60, '{"name": "Yêu Hổ", "health": 200, "attack": 10}', '[{"type": "qi", "amount": 50}, {"type": "herb", "herbId": "linh_thao", "amount": 1}]'),
('hac_phong_trai', 'Hắc Phong Trại', 'Một nhóm tán tu chiếm núi làm vua, tu sĩ Trúc Cơ Kỳ có thể đến tiêu diệt chúng.', 2, 180, '{"name": "Tặc Đầu", "health": 1500, "attack": 50}', '[{"type": "qi", "amount": 200}, {"type": "herb", "herbId": "huyet_tham", "amount": 1}]'),
('kiem_mo', 'Kiếm Mộ', 'Nơi chôn cất của vô số kiếm tu, kiếm ý còn sót lại hóa thành ma linh.', 3, 600, '{"name": "Kiếm Hồn", "health": 10000, "attack": 250}', '[{"type": "qi", "amount": 2500}, {"type": "herb", "herbId": "tinh_nguyet_hoa", "amount": 1}, {"type": "equipment", "equipmentId": "tu_linh_chau"}]');

INSERT OR IGNORE INTO `honor_shop_items` (`id`, `type`, `itemId`, `name`, `description`, `cost`, `isUnique`) VALUES
('honor_equipment_1', 'equipment', 'pha_quan_giap', 'Phá Quân Giáp', 'Trang bị PvP, tăng 10% công và thủ khi Đấu Pháp. (Mua một lần)', 50, 1),
('honor_pill_1', 'pill', 'chien_than_dan', 'Chiến Thần Đan', 'Tăng 20% sát thương trong trận Đấu Pháp tiếp theo.', 5, 0);

INSERT OR IGNORE INTO `pvp_skills` (`id`, `name`, `description`, `cost`, `energy_cost`, `effect`) VALUES
('no_long_cuoc', 'Nộ Long Cước', 'Tung một cước chứa đầy Sát Khí, gây 150% sát thương và bỏ qua 10% phòng ngự của đối thủ.', 10, 40, '{"type": "damage", "multiplier": 1.5, "armor_pierce": 0.1}'),
('kim_cang_ho_the', 'Kim Cang Hộ Thể', 'Vận khởi kim quang hộ thân, tạo một lá chắn bằng 20% máu tối đa của bạn trong 2 lượt.', 15, 50, '{"type": "shield", "hp_percent": 0.2, "duration": 2}'),
('huyet_chu', 'Huyết Chú', 'Gây một lượng nhỏ sát thương ban đầu và khiến đối thủ trúng độc, mất máu trong 3 lượt.', 20, 35, '{"type": "dot", "initial_damage_percent": 0.2, "dot_damage_percent": 0.1, "duration": 3}');


INSERT OR IGNORE INTO `game_config` (`config_key`, `config_value`) VALUES
('BODY_STRENGTH_COST', '{"base": 100, "multiplier": 1.1}'),
('GUILD_CREATION_COST', '100000'),
('PVP_COOLDOWN_SECONDS', '300'),
('MARKET_TAX_RATE', '0.05'),
('MARKET_LISTING_DURATION_HOURS', '24');

-- ==========================================
-- END OF SCRIPT
-- ==========================================