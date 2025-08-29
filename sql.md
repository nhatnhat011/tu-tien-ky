-- ==========================================
-- Tu Tiên Ký: Hư Vô Lộ - Database Schema
-- Idempotent version (safe to run many times)
-- ==========================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `tu_tien_db`
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- 2. Select Database
USE `tu_tien_db`;

-- ==========================================
-- CORE GAME DATA TABLES
-- ==========================================

-- Realms Table
CREATE TABLE IF NOT EXISTS `realms` (
  `realmIndex` INT NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `qiThreshold` BIGINT NOT NULL,
  `baseQiPerSecond` DOUBLE NOT NULL,
  `breakthroughChance` DOUBLE NOT NULL,
  `baseHp` INT NOT NULL,
  `baseAtk` INT NOT NULL,
  `baseDef` INT NOT NULL,
  `baseSpeed` INT NOT NULL DEFAULT 10,
  `baseCritRate` DOUBLE NOT NULL DEFAULT 0.05,
  `baseCritDamage` DOUBLE NOT NULL DEFAULT 1.5,
  `baseDodgeRate` DOUBLE NOT NULL DEFAULT 0.01,
  `baseHitRate` DOUBLE NOT NULL DEFAULT 0.0,
  `baseCritResist` DOUBLE NOT NULL DEFAULT 0.0,
  `baseLifestealResist` DOUBLE NOT NULL DEFAULT 0.0,
  `baseCounterResist` DOUBLE NOT NULL DEFAULT 0.0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Spiritual Roots Table
CREATE TABLE IF NOT EXISTS `spiritual_roots` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `bonus` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Herbs Table
CREATE TABLE IF NOT EXISTS `herbs` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pills Table
CREATE TABLE IF NOT EXISTS `pills` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `effect` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recipes Table
CREATE TABLE IF NOT EXISTS `recipes` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `pillId` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INT NOT NULL,
  `qiCost` BIGINT NOT NULL,
  `herbCosts` JSON NOT NULL,
  `successChance` DOUBLE NOT NULL,
  FOREIGN KEY (`pillId`) REFERENCES `pills`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Techniques Table
CREATE TABLE IF NOT EXISTS `techniques` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INT NOT NULL,
  `bonuses` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Equipment Table
CREATE TABLE IF NOT EXISTS `equipment` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `slot` VARCHAR(20) NOT NULL, -- 'weapon', 'armor', 'accessory'
  `bonuses` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insights Table
CREATE TABLE IF NOT EXISTS `insights` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `cost` INT NOT NULL,
  `requiredInsightIds` JSON NOT NULL,
  `bonus` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exploration Locations Table
CREATE TABLE IF NOT EXISTS `exploration_locations` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INT NOT NULL,
  `requiredBodyStrength` INT NOT NULL,
  `durationSeconds` INT NOT NULL,
  `rewards` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trial Zones Table
CREATE TABLE IF NOT EXISTS `trial_zones` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `requiredRealmIndex` INT NOT NULL,
  `cooldownSeconds` INT NOT NULL,
  `monster` JSON NOT NULL,
  `rewards` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Honor Shop Items Table
CREATE TABLE IF NOT EXISTS `honor_shop_items` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `type` VARCHAR(50) NOT NULL,
  `itemId` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `cost` INT NOT NULL,
  `isUnique` BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NEW: PvP Skills Table
CREATE TABLE IF NOT EXISTS `pvp_skills` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `cost` INT NOT NULL, -- Honor points to learn
  `energy_cost` INT NOT NULL,
  `effect` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Game Configuration Table
CREATE TABLE IF NOT EXISTS `game_config` (
  `config_key` VARCHAR(50) NOT NULL PRIMARY KEY,
  `config_value` JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PLAYER AND SYSTEM TABLES
-- ==========================================

-- Guilds Table
CREATE TABLE IF NOT EXISTS `guilds` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `leaderName` VARCHAR(50) NOT NULL,
  `level` INT NOT NULL DEFAULT 1,
  `exp` BIGINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci;

-- Safe add columns to guilds
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='guilds' AND COLUMN_NAME='level');
SET @sql := IF(@col_exists=0, 'ALTER TABLE guilds ADD COLUMN `level` INT NOT NULL DEFAULT 1', 'SELECT "Column guilds.level already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='guilds' AND COLUMN_NAME='exp');
SET @sql := IF(@col_exists=0, 'ALTER TABLE guilds ADD COLUMN `exp` BIGINT NOT NULL DEFAULT 0', 'SELECT "Column guilds.exp already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Players Table
CREATE TABLE IF NOT EXISTS `players` (
  `name` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `qi` DOUBLE PRECISION NOT NULL DEFAULT 0,
  `realmIndex` INT NOT NULL DEFAULT 0,
  `bodyStrength` DOUBLE PRECISION NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci;

-- Safe add/remove columns to players
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='guildId');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `guildId` INT NULL', 'SELECT "Column players.guildId already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='mindState');
SET @sql := IF(@col_exists>0, 'ALTER TABLE players DROP COLUMN `mindState`', 'SELECT "Column players.mindState does not exist, skipping drop."'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='karma');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `karma` INT NOT NULL DEFAULT 0', 'SELECT "Column players.karma already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='lastChallengeTime');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `lastChallengeTime` JSON NULL DEFAULT (JSON_OBJECT())', 'SELECT "Column players.lastChallengeTime already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='pills');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `pills` JSON NULL DEFAULT (JSON_OBJECT())', 'SELECT "Column players.pills already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='herbs');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `herbs` JSON NULL DEFAULT (JSON_OBJECT())', 'SELECT "Column players.herbs already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='spiritualRoot');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `spiritualRoot` VARCHAR(10) NULL', 'SELECT "Column players.spiritualRoot already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='honorPoints');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `honorPoints` INT NOT NULL DEFAULT 0', 'SELECT "Column players.honorPoints already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='learnedTechniques');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `learnedTechniques` JSON NULL DEFAULT (JSON_ARRAY())', 'SELECT "Column players.learnedTechniques already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='activeTechniqueId');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `activeTechniqueId` VARCHAR(50) NULL', 'SELECT "Column players.activeTechniqueId already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- REMOVE `inventory` and `equipment` and old treasure columns
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='inventory');
SET @sql := IF(@col_exists > 0, 'ALTER TABLE players DROP COLUMN `inventory`', 'SELECT "Column players.inventory does not exist, skipping drop."'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='equipment');
SET @sql := IF(@col_exists > 0, 'ALTER TABLE players DROP COLUMN `equipment`', 'SELECT "Column players.equipment does not exist, skipping drop."'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='treasures');
SET @sql := IF(@col_exists > 0, 'ALTER TABLE players DROP COLUMN `treasures`', 'SELECT "Column players.treasures does not exist, skipping drop."'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='equippedTreasureId');
SET @sql := IF(@col_exists > 0, 'ALTER TABLE players DROP COLUMN `equippedTreasureId`', 'SELECT "Column players.equippedTreasureId does not exist, skipping drop."'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='enlightenmentPoints');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `enlightenmentPoints` INT NOT NULL DEFAULT 0', 'SELECT "Column players.enlightenmentPoints already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='unlockedInsights');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `unlockedInsights` JSON NULL DEFAULT (JSON_ARRAY())', 'SELECT "Column players.unlockedInsights already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='explorationStatus');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `explorationStatus` JSON NULL', 'SELECT "Column players.explorationStatus already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='purchasedHonorItems');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `purchasedHonorItems` JSON NULL DEFAULT (JSON_ARRAY())', 'SELECT "Column players.purchasedHonorItems already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='is_admin');
SET @sql := IF(@col_exists > 0, 'ALTER TABLE players DROP COLUMN `is_admin`', 'SELECT "Column players.is_admin does not exist, skipping drop."'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='is_banned');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `is_banned` BOOLEAN NOT NULL DEFAULT FALSE', 'SELECT "Column players.is_banned already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='ban_reason');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `ban_reason` TEXT NULL', 'SELECT "Column players.ban_reason already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='linh_thach');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `linh_thach` BIGINT NOT NULL DEFAULT 0', 'SELECT "Column players.linh_thach already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='pvpBuff');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `pvpBuff` JSON NULL', 'SELECT "Column players.pvpBuff already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
-- NEW: Add learned_pvp_skills column
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='tu_tien_db' AND TABLE_NAME='players' AND COLUMN_NAME='learned_pvp_skills');
SET @sql := IF(@col_exists=0, 'ALTER TABLE players ADD COLUMN `learned_pvp_skills` JSON NULL DEFAULT (JSON_ARRAY())', 'SELECT "Column players.learned_pvp_skills already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- Foreign Key fk_guild
SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = 'tu_tien_db' AND TABLE_NAME = 'players' AND CONSTRAINT_NAME = 'fk_guild');
SET @sql := IF(@fk_exists=0, 'ALTER TABLE `players` ADD CONSTRAINT `fk_guild` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE SET NULL', 'SELECT "Foreign key fk_guild already exists"'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- NEW: Player Equipment Table (Instance-based items)
CREATE TABLE IF NOT EXISTS `player_equipment` (
  `instance_id` INT AUTO_INCREMENT PRIMARY KEY,
  `player_name` VARCHAR(50) NOT NULL,
  `equipment_id` VARCHAR(50) NOT NULL,
  `is_equipped` BOOLEAN NOT NULL DEFAULT FALSE,
  `slot` VARCHAR(20) NULL,
  FOREIGN KEY (`player_name`) REFERENCES `players`(`name`) ON DELETE CASCADE,
  FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE CASCADE,
  INDEX `idx_player_equipment` (`player_name`, `is_equipped`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Chat Messages Table
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` INT AUTO_INCREMENT,
  `playerName` VARCHAR(50) NOT NULL,
  `message` VARCHAR(255) NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PvP History Table
CREATE TABLE IF NOT EXISTS `pvp_history` (
  `id` INT AUTO_INCREMENT,
  `attacker_name` VARCHAR(50) NOT NULL,
  `defender_name` VARCHAR(50) NOT NULL,
  `winner_name` VARCHAR(50) NOT NULL,
  `funny_summary` VARCHAR(255) NOT NULL,
  `combat_log` JSON NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_attacker` (`attacker_name`),
  INDEX `idx_defender` (`defender_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events Table
CREATE TABLE IF NOT EXISTS `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `bonus_type` VARCHAR(50) NOT NULL,
  `bonus_value` DOUBLE NOT NULL,
  `starts_at` TIMESTAMP NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gift Codes Table
CREATE TABLE IF NOT EXISTS `gift_codes` (
  `code` VARCHAR(50) PRIMARY KEY,
  `rewards` JSON NOT NULL,
  `max_uses` INT DEFAULT NULL,
  `uses` INT NOT NULL DEFAULT 0,
  `expires_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Redeemed Codes Table
CREATE TABLE IF NOT EXISTS `player_redeemed_codes` (
  `player_name` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `redeemed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`player_name`, `code`),
  FOREIGN KEY (`player_name`) REFERENCES `players`(`name`) ON DELETE CASCADE,
  FOREIGN KEY (`code`) REFERENCES `gift_codes`(`code`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admins Table
CREATE TABLE IF NOT EXISTS `admins` (
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Marketplace Listings Table
CREATE TABLE IF NOT EXISTS `market_listings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `seller_name` VARCHAR(50) NOT NULL,
  `item_id` INT NOT NULL UNIQUE,
  `price` BIGINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  FOREIGN KEY (`seller_name`) REFERENCES `players`(`name`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `player_equipment`(`instance_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================
-- NEW: GUILD WAR TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS `guild_wars` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `start_time` TIMESTAMP NOT NULL,
  `status` ENUM('PENDING', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
  `rewards` JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guild_war_registrations` (
  `war_id` INT NOT NULL,
  `guild_id` INT NOT NULL,
  `registered_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`war_id`, `guild_id`),
  FOREIGN KEY (`war_id`) REFERENCES `guild_wars`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guild_war_matches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `war_id` INT NOT NULL,
  `guild1_id` INT NOT NULL,
  `guild2_id` INT NOT NULL,
  `current_round` INT NOT NULL DEFAULT 1,
  `guild1_round_wins` INT NOT NULL DEFAULT 0,
  `guild2_round_wins` INT NOT NULL DEFAULT 0,
  `winner_guild_id` INT NULL,
  `status` ENUM('PENDING_LINEUP', 'IN_PROGRESS', 'COMPLETED') NOT NULL DEFAULT 'PENDING_LINEUP',
  FOREIGN KEY (`war_id`) REFERENCES `guild_wars`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild1_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild2_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guild_war_lineups` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `match_id` INT NOT NULL,
  `round_number` INT NOT NULL,
  `guild_id` INT NOT NULL,
  `player1_name` VARCHAR(50) NOT NULL,
  `player2_name` VARCHAR(50) NOT NULL,
  `player3_name` VARCHAR(50) NOT NULL,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `match_round_guild` (`match_id`, `round_number`, `guild_id`),
  FOREIGN KEY (`match_id`) REFERENCES `guild_war_matches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`guild_id`) REFERENCES `guilds`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guild_war_fights` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `match_id` INT NOT NULL,
  `round_number` INT NOT NULL,
  `guild1_player` VARCHAR(50) NOT NULL,
  `guild2_player` VARCHAR(50) NOT NULL,
  `winner_player` VARCHAR(50) NOT NULL,
  `combat_log` JSON NOT NULL,
  `fight_order` INT NOT NULL, -- 1, 2, or 3 within the round
  FOREIGN KEY (`match_id`) REFERENCES `guild_war_matches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `guild_war_match_participants` (
  `match_id` INT NOT NULL,
  `player_name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`match_id`, `player_name`),
  FOREIGN KEY (`match_id`) REFERENCES `guild_war_matches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================
-- POPULATE CORE GAME DATA
-- ==========================================

-- Disable foreign key checks to allow truncating tables in any order for reset purposes
SET FOREIGN_KEY_CHECKS=0;

-- Truncate all data tables to ensure a clean slate
-- Order is changed to be more logical, but not strictly necessary with checks off.
TRUNCATE TABLE `recipes`;
TRUNCATE TABLE `pills`;
TRUNCATE TABLE `herbs`;
TRUNCATE TABLE `realms`;
TRUNCATE TABLE `spiritual_roots`;
TRUNCATE TABLE `techniques`;
TRUNCATE TABLE `equipment`;
TRUNCATE TABLE `insights`;
TRUNCATE TABLE `exploration_locations`;
TRUNCATE TABLE `trial_zones`;
TRUNCATE TABLE `honor_shop_items`;
TRUNCATE TABLE `pvp_skills`;
TRUNCATE TABLE `game_config`;

-- Insert data into tables
INSERT INTO `realms` (`realmIndex`, `name`, `qiThreshold`, `baseQiPerSecond`, `breakthroughChance`, `baseHp`, `baseAtk`, `baseDef`, `baseSpeed`, `baseCritRate`, `baseCritDamage`, `baseDodgeRate`, `baseHitRate`, `baseCritResist`, `baseLifestealResist`, `baseCounterResist`) VALUES
(0, 'Phàm Nhân', 100, 1, 1, 50, 5, 0, 10, 0.05, 1.5, 0.01, 0.0, 0.0, 0.0, 0.0),
(1, 'Luyện Khí Kỳ', 1000, 5, 0.9, 200, 15, 5, 12, 0.05, 1.5, 0.02, 0.01, 0.01, 0.0, 0.0),
(2, 'Trúc Cơ Kỳ', 10000, 25, 0.75, 1000, 50, 20, 15, 0.06, 1.55, 0.03, 0.02, 0.015, 0.01, 0.01),
(3, 'Kim Đan Kỳ', 100000, 125, 0.6, 5000, 200, 80, 20, 0.07, 1.6, 0.04, 0.03, 0.02, 0.015, 0.015),
(4, 'Nguyên Anh Kỳ', 1000000, 625, 0.45, 25000, 800, 300, 25, 0.08, 1.65, 0.05, 0.04, 0.025, 0.02, 0.02),
(5, 'Hóa Thần Kỳ', 10000000, 3125, 0.3, 125000, 3500, 1200, 35, 0.1, 1.75, 0.06, 0.05, 0.03, 0.025, 0.025),
(6, 'Luyện Hư Kỳ', 100000000, 15625, 0.15, 600000, 15000, 5000, 50, 0.12, 1.9, 0.08, 0.06, 0.04, 0.03, 0.03),
(7, 'Đại Thừa Kỳ', 9007199254740991, 78125, 0.05, 3000000, 75000, 25000, 70, 0.15, 2.2, 0.1, 0.08, 0.05, 0.04, 0.04);

INSERT INTO `spiritual_roots` (`id`, `name`, `description`, `bonus`) VALUES
('kim', 'Kim Linh Căn', 'Thân thể cứng như kim loại, tăng 15% Phòng Ngự.', '{"type": "def_mul", "value": 1.15}'),
('moc', 'Mộc Linh Căn', 'Thân với thảo mộc, tăng 5% tỷ lệ thành công Luyện Đan và 10% sản lượng Thám Hiểm.', '{"type": "alchemy_success_add", "value": 0.05}'),
('thuy', 'Thủy Linh Căn', 'Tâm tĩnh như nước, tốc độ hấp thụ linh khí căn bản tăng 0.5 điểm mỗi giây.', '{"type": "qi_per_second_add", "value": 0.5}'),
('hoa', 'Hỏa Linh Căn', 'Tính nóng như lửa, tăng 10% Công Kích.', '{"type": "atk_mul", "value": 1.1}'),
('tho', 'Thổ Linh Căn', 'Vững như bàn thạch, tăng 15% Sinh Lực.', '{"type": "hp_mul", "value": 1.15}');

INSERT INTO `herbs` (`id`, `name`, `description`) VALUES
('linh_thao', 'Linh Thảo', 'Loại cỏ dại phổ biến, chứa một ít linh khí.'),
('huyet_tham', 'Huyết Sâm', 'Loại sâm quý mọc ở nơi âm khí nặng, có tác dụng bổ khí huyết.'),
('tinh_nguyet_hoa', 'Tinh Nguyệt Hoa', 'Bông hoa chỉ nở vào đêm trăng tròn, hấp thụ tinh hoa của trời đất.');

INSERT INTO `pills` (`id`, `name`, `description`, `effect`) VALUES
('hoi_khi_dan', 'Hồi Khí Đan', 'Đan dược cấp thấp, có thể ngay lập tức bổ sung một lượng nhỏ linh khí.', '{"type": "instant_qi", "amount": 500}'),
('tinh_nguyen_dan', 'Tinh Nguyên Đan', 'Đan dược trung cấp, luyện hóa từ tinh hoa linh thảo, bổ sung lượng lớn linh khí.', '{"type": "instant_qi", "amount": 10000}'),
('chien_than_dan', 'Chiến Thần Đan', 'Đan dược đặc biệt, dùng trước khi Đấu Pháp sẽ tăng 20% sát thương trong trận đấu tiếp theo.', '{"type": "pvp_attack_buff", "value": 1.2, "duration_matches": 1}');

INSERT INTO `recipes` (`id`, `pillId`, `name`, `description`, `requiredRealmIndex`, `qiCost`, `herbCosts`, `successChance`) VALUES
('recipe_hoi_khi_dan', 'hoi_khi_dan', 'Đan Phương: Hồi Khí Đan', 'Một phương pháp luyện đan đơn giản, phổ biến trong giới tu tiên Luyện Khí Kỳ.', 1, 100, '{"linh_thao": 5}', 0.8),
('recipe_tinh_nguyen_dan', 'tinh_nguyen_dan', 'Đan Phương: Tinh Nguyên Đan', 'Đan phương phức tạp hơn, yêu cầu tu vi Trúc Cơ Kỳ để có thể khống hỏa luyện chế.', 2, 2000, '{"huyet_tham": 3, "tinh_nguyet_hoa": 1}', 0.6);

INSERT INTO `techniques` (`id`, `name`, `description`, `requiredRealmIndex`, `bonuses`) VALUES
('dan_khi_quyet', 'Dẫn Khí Quyết', 'Công pháp nhập môn, giúp tăng tốc độ hấp thụ linh khí cơ bản.', 1, '[{"type": "qi_per_second_multiplier", "value": 1.2}]'),
('ngung_than_thuat', 'Ngưng Thần Thuật', 'Ổn định tâm cảnh, giúp tăng nhẹ khả năng thành công khi đột phá.', 2, '[{"type": "breakthrough_chance_add", "value": 0.05}]'),
('hon_nguyen_cong', 'Hỗn Nguyên Công', 'Công pháp thượng thừa, tăng mạnh tốc độ tu luyện nhưng khiến linh khí không ổn định, giảm nhẹ tỷ lệ đột phá.', 3, '[{"type": "qi_per_second_multiplier", "value": 1.5}, {"type": "breakthrough_chance_add", "value": -0.05}]'),
('van_kiem_quyet', 'Vạn Kiếm Quyết', 'Lấy kiếm ý rèn luyện tâm ma, tăng mạnh hiệu suất tu luyện và khả năng đột phá.', 4, '[{"type": "qi_per_second_multiplier", "value": 1.3}, {"type": "breakthrough_chance_add", "value": 0.1}]');

INSERT INTO `equipment` (`id`, `name`, `description`, `slot`, `bonuses`) VALUES
('tu_linh_chau', 'Tụ Linh Châu', 'Một viên châu có khả năng tụ tập linh khí trời đất, giúp tăng tốc độ tu luyện.', 'accessory', '[{"type": "qi_per_second_multiplier", "value": 1.1}]'),
('ho_than_phu', 'Hộ Thân Phù', 'Lá bùa hộ mệnh, tăng cường sinh lực cho người mang nó khi chiến đấu.', 'accessory', '[{"type": "hp_add", "value": 500}]'),
('pha_quan_giap', 'Phá Quân Giáp', 'Chiến giáp được rèn từ máu của vạn quân địch, tăng 10% công và 10% thủ khi Đấu Pháp.', 'armor', '[{"type": "atk_mul", "value": 1.1}, {"type": "def_mul", "value": 1.1}]'),
('huyen_thiet_kiem', 'Huyền Thiết Kiếm', 'Một thanh trọng kiếm đơn giản nhưng đầy uy lực.', 'weapon', '[{"type": "atk_add", "value": 100}]');

INSERT INTO `insights` (`id`, `name`, `description`, `cost`, `requiredInsightIds`, `bonus`) VALUES
('basic_understanding', 'Sơ Khuy Môn Kính', 'Bước đầu lĩnh ngộ thiên địa, tăng nhẹ tốc độ hấp thụ linh khí cơ bản.', 1, '[]', '{"type": "qi_per_second_base_add", "value": 0.2}'),
('body_harmony', 'Nhục Thân Tương Hợp', 'Hiểu rõ hơn về cơ thể, tăng nhẹ hiệu quả của việc tôi luyện thân thể.', 3, '["basic_understanding"]', '{"type": "body_temper_eff_add", "value": 0.05}'),
('alchemy_intuition', 'Đan Đạo Trực Giác', 'Tâm thần hợp nhất với đan lô, tăng nhẹ tỷ lệ thành công khi luyện đan.', 3, '["basic_understanding"]', '{"type": "alchemy_success_base_add", "value": 0.02}');

INSERT INTO `exploration_locations` (`id`, `name`, `description`, `requiredRealmIndex`, `requiredBodyStrength`, `durationSeconds`, `rewards`) VALUES
('thanh_son_mach', 'Thanh Sơn Mạch', 'Dãy núi gần nhất, linh khí tuy mỏng manh nhưng an toàn cho người mới tu luyện.', 1, 0, 60, '[{"type": "herb", "herbId": "linh_thao", "amount": 3}]'),
('hac_phong_son', 'Hắc Phong Sơn', 'Nơi yêu thú cấp thấp hoành hành, có cơ duyên nhưng cũng đầy rẫy nguy hiểm.', 2, 10, 300, '[{"type": "herb", "herbId": "linh_thao", "amount": 5}, {"type": "herb", "herbId": "huyet_tham", "amount": 1}]'),
('u_vu_dam', 'U Vụ Đầm Lầy', 'Đầm lầy chướng khí, nghe đồn có linh thảo hiếm nhưng rất khó tìm.', 3, 50, 900, '[{"type": "herb", "herbId": "huyet_tham", "amount": 3}, {"type": "herb", "herbId": "tinh_nguyet_hoa", "amount": 1}]');

INSERT INTO `trial_zones` (`id`, `name`, `description`, `requiredRealmIndex`, `cooldownSeconds`, `monster`, `rewards`) VALUES
('van_thu_coc', 'Vạn Thú Cốc', 'Nơi tập trung của các yêu thú cấp thấp, thích hợp cho tu sĩ Luyện Khí Kỳ rèn luyện.', 1, 60, '{"name": "Yêu Hổ", "health": 200, "attack": 10}', '[{"type": "qi", "amount": 50}, {"type": "herb", "herbId": "linh_thao", "amount": 1}]'),
('hac_phong_trai', 'Hắc Phong Trại', 'Một nhóm tán tu chiếm núi làm vua, tu sĩ Trúc Cơ Kỳ có thể đến tiêu diệt chúng.', 2, 180, '{"name": "Tặc Đầu", "health": 1500, "attack": 50}', '[{"type": "qi", "amount": 200}, {"type": "herb", "herbId": "huyet_tham", "amount": 1}]'),
('kiem_mo', 'Kiếm Mộ', 'Nơi chôn cất của vô số kiếm tu, kiếm ý còn sót lại hóa thành ma linh.', 3, 600, '{"name": "Kiếm Hồn", "health": 10000, "attack": 250}', '[{"type": "qi", "amount": 2500}, {"type": "herb", "herbId": "tinh_nguyet_hoa", "amount": 1}, {"type": "equipment", "equipmentId": "tu_linh_chau"}]');

INSERT INTO `honor_shop_items` (`id`, `type`, `itemId`, `name`, `description`, `cost`, `isUnique`) VALUES
('honor_equipment_1', 'equipment', 'pha_quan_giap', 'Phá Quân Giáp', 'Trang bị PvP, tăng 10% công và thủ khi Đấu Pháp. (Mua một lần)', 50, 1),
('honor_pill_1', 'pill', 'chien_than_dan', 'Chiến Thần Đan', 'Tăng 20% sát thương trong trận Đấu Pháp tiếp theo.', 5, 0);

INSERT INTO `pvp_skills` (`id`, `name`, `description`, `cost`, `energy_cost`, `effect`) VALUES
('no_long_cuoc', 'Nộ Long Cước', 'Tung một cước chứa đầy Sát Khí, gây 150% sát thương và bỏ qua 10% phòng ngự của đối thủ.', 10, 40, '{"type": "damage", "multiplier": 1.5, "armor_pierce": 0.1}'),
('kim_cang_ho_the', 'Kim Cang Hộ Thể', 'Vận khởi kim quang hộ thân, tạo một lá chắn bằng 20% máu tối đa của bạn trong 2 lượt.', 15, 50, '{"type": "shield", "hp_percent": 0.2, "duration": 2}'),
('huyet_chu', 'Huyết Chú', 'Gây một lượng nhỏ sát thương ban đầu và khiến đối thủ trúng độc, mất máu trong 3 lượt.', 20, 35, '{"type": "dot", "initial_damage_percent": 0.2, "dot_damage_percent": 0.1, "duration": 3}');


INSERT INTO `game_config` (`config_key`, `config_value`) VALUES
('BODY_STRENGTH_COST', '{"base": 100, "multiplier": 1.1}'),
('GUILD_CREATION_COST', '100000'),
('PVP_COOLDOWN_SECONDS', '300'),
('MARKET_TAX_RATE', '0.05'),
('MARKET_LISTING_DURATION_HOURS', '24');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS=1;

-- ==========================================
-- END OF SCRIPT
-- ==========================================