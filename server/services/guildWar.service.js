const pool = require('../config/database');
const { getFullPlayerQuery, calculateTotalBonuses, calculateCombatStats, updatePlayerState } = require('./player.service');
const { getGameData } = require('./gameData.service');
const { ATTACKER_MESSAGES, DEFENDER_MESSAGES, ATTACKER_FINISHERS, DEFENDER_FINISHERS } = require('../utils/combatMessages');

const getRandomMessage = (templates, replacements) => {
    const template = templates[Math.floor(Math.random() * templates.length)];
    return Object.entries(replacements).reduce((acc, [key, value]) => {
        return acc.replace(new RegExp(`{${key}}`, 'g'), value);
    }, template);
};


const processRound = async (conn, matchId) => {
    console.log(`Processing round for match ID: ${matchId}`);
    const [match] = await conn.query("SELECT * FROM guild_war_matches WHERE id = ?", [matchId]);
    if (!match || match.status !== 'PENDING_LINEUP') return;

    const lineups = await conn.query("SELECT * FROM guild_war_lineups WHERE match_id = ? AND round_number = ?", [match.id, match.current_round]);
    if (lineups.length < 2) return; // Both lineups not submitted yet

    await conn.query("UPDATE guild_war_matches SET status = 'IN_PROGRESS' WHERE id = ?", [match.id]);

    const lineup1 = lineups.find(l => l.guild_id === match.guild1_id);
    const lineup2 = lineups.find(l => l.guild_id === match.guild2_id);
    const fighters1 = [lineup1.player1_name, lineup1.player2_name, lineup1.player3_name];
    const fighters2 = [lineup2.player1_name, lineup2.player2_name, lineup2.player3_name];

    let guild1WinsThisRound = 0;
    
    for (let i = 0; i < 3; i++) {
        const p1Name = fighters1[i];
        const p2Name = fighters2[i];

        const p1 = await getFullPlayerQuery(conn, p1Name);
        const p2 = await getFullPlayerQuery(conn, p2Name);

        if (!p1 || !p2) continue;

        const p1Bonuses = await calculateTotalBonuses(conn, p1);
        const p2Bonuses = await calculateTotalBonuses(conn, p2);
        const p1Stats = calculateCombatStats(p1, p1Bonuses);
        const p2Stats = calculateCombatStats(p2, p2Bonuses);

        let p1Health = p1Stats.hp, p2Health = p2Stats.hp;
        let combatLog = [];
        let turn = 0;
        
        const turnOrder = p1Stats.speed >= p2Stats.speed ? [p1, p2] : [p2, p1];
        const statsOrder = p1Stats.speed >= p2Stats.speed ? [p1Stats, p2Stats] : [p2Stats, p1Stats];
        
        combatLog.push(`Trận đấu bắt đầu giữa ${p1Name} và ${p2Name}.`);
        combatLog.push(`${turnOrder[0].name} ra đòn trước.`);

        while (p1Health > 0 && p2Health > 0 && turn < 50) {
            turn++;
            // First player attacks
            let damageToP2 = statsOrder[0].atk * (1 - statsOrder[1].def / (statsOrder[1].def + 1000));
            if (turnOrder[0].name === p1Name) p2Health -= Math.max(1, damageToP2); else p1Health -= Math.max(1, damageToP2);
            combatLog.push(getRandomMessage(ATTACKER_MESSAGES, { attacker: turnOrder[0].name, defender: turnOrder[1].name, damage: Math.max(1, damageToP2).toFixed(0) }));
            if (p1Health <= 0 || p2Health <= 0) break;
            
            // Second player attacks
            let damageToP1 = statsOrder[1].atk * (1 - statsOrder[0].def / (statsOrder[0].def + 1000));
            if (turnOrder[1].name === p1Name) p2Health -= Math.max(1, damageToP1); else p1Health -= Math.max(1, damageToP1);
            combatLog.push(getRandomMessage(ATTACKER_MESSAGES, { attacker: turnOrder[1].name, defender: turnOrder[0].name, damage: Math.max(1, damageToP1).toFixed(0) }));
        }

        const p1Won = p1Health > 0;
        const winnerName = p1Won ? p1Name : p2Name;
        if(p1Won) guild1WinsThisRound++;
        
        if(p1Health <= 0) combatLog.push(getRandomMessage(DEFENDER_FINISHERS, { defender: p2Name, attacker: p1Name }));
        else combatLog.push(getRandomMessage(ATTACKER_FINISHERS, { attacker: p1Name, defender: p2Name }));

        await conn.query(
            "INSERT INTO guild_war_fights (match_id, round_number, guild1_player, guild2_player, winner_player, combat_log, fight_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [matchId, match.current_round, p1Name, p2Name, winnerName, JSON.stringify(combatLog), i + 1]
        );
    }
    
    // Update match score
    const roundWinnerGuildId = guild1WinsThisRound >= 2 ? match.guild1_id : match.guild2_id;
    const newGuild1RoundWins = match.guild1_round_wins + (roundWinnerGuildId === match.guild1_id ? 1 : 0);
    const newGuild2RoundWins = match.guild2_round_wins + (roundWinnerGuildId === match.guild2_id ? 1 : 0);
    
    // Check for match completion
    if (newGuild1RoundWins >= 2 || newGuild2RoundWins >= 2 || match.current_round >= 3) {
        const matchWinnerId = newGuild1RoundWins > newGuild2RoundWins ? match.guild1_id : match.guild2_id;
        await conn.query(
            "UPDATE guild_war_matches SET guild1_round_wins = ?, guild2_round_wins = ?, winner_guild_id = ?, status = 'COMPLETED' WHERE id = ?",
            [newGuild1RoundWins, newGuild2RoundWins, matchWinnerId, matchId]
        );
    } else {
        await conn.query(
            "UPDATE guild_war_matches SET guild1_round_wins = ?, guild2_round_wins = ?, current_round = ?, status = 'PENDING_LINEUP' WHERE id = ?",
            [newGuild1RoundWins, newGuild2RoundWins, match.current_round + 1, matchId]
        );
    }

    // Mark all fighters as having participated
    for(const name of [...fighters1, ...fighters2]) {
        await conn.query("INSERT OR IGNORE INTO guild_war_match_participants (match_id, player_name) VALUES (?, ?)", [matchId, name]);
    }
};


const scheduleGuildWar = () => {
    // This function will run periodically to manage the guild war lifecycle.
    setInterval(async () => {
        let conn;
        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // 1. Process any rounds where both lineups are submitted
            const pendingMatches = await conn.query("SELECT * FROM guild_war_matches WHERE status = 'PENDING_LINEUP'");
            for (const match of pendingMatches) {
                 const lineups = await conn.query("SELECT * FROM guild_war_lineups WHERE match_id = ? AND round_number = ?", [match.id, match.current_round]);
                 if(lineups.length >= 2) {
                     await processRound(conn, match.id);
                 }
            }

            // More logic here for starting wars, matching guilds, etc.

            await conn.commit();
        } catch (err) {
            if (conn) await conn.rollback();
            console.error("Guild War Scheduler Error:", err);
        } finally {
            if (conn) conn.release();
        }
    }, 15000); // Check every 15 seconds
};

const initializeGuildWarService = () => {
    console.log("Guild War Service Initialized.");
    scheduleGuildWar();
};

module.exports = {
    initializeGuildWarService,
    processRound
};