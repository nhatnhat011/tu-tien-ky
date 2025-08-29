const pool = require('../config/database');
const { calculateTotalBonuses, calculateCombatStats, updatePlayerState } = require('./player.service');
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
    const [match] = await conn.query("SELECT * FROM guild_war_matches WHERE id = ? FOR UPDATE", [matchId]);
    if (!match || match.status !== 'PENDING_LINEUP') return;

    const lineups = await conn.query("SELECT * FROM guild_war_lineups WHERE match_id = ? AND round_number = ?", [match.id, match.current_round]);
    if (lineups.length < 2) return; // Both lineups not submitted yet

    await conn.query("UPDATE guild_war_matches SET status = 'IN_PROGRESS' WHERE id = ?", [match.id]);

    const lineup1 = lineups.find(l => l.guild_id === match.guild1_id);
    const lineup2 = lineups.find(l => l.guild_id === match.guild2_id);
    const fighters1 = [lineup1.player1_name, lineup1.player2_name, lineup1.player3_name];
    const fighters2 = [lineup2.player1_name, lineup2.player2_name, lineup2.player3_name];

    let guild1Wins = 0;
    
    for (let i = 0; i < 3; i++) {
        const p1Name = fighters1[i];
        const p2Name = fighters2[i];

        // Simulate fight
        const players = await conn.query("SELECT * FROM players WHERE name IN (?, ?)", [p1Name, p2Name]);
        const p1 = players.find(p => p.name === p1Name);
        const p2 = players.find(p => p.name === p2Name);

        if (!p1 || !p2) continue; // Skip if a player doesn't exist

        const p1Bonuses = await calculateTotalBonuses(conn, p1);
        const p2Bonuses = await calculateTotalBonuses(conn, p2);
        const p1Stats = calculateCombatStats(p1, p1Bonuses);
        const p2Stats = calculateCombatStats(p2, p2Bonuses);

        let p1Health = p1Stats.hp, p2Health = p2Stats.hp;
        let combatLog = [];
        let turn = 0;

        while (p1Health > 0 && p2Health > 0 && turn < 50) {
            let damageToP2 = p1Stats.atk * (1 - p2Stats.def / (p2Stats.def + 1000));
            p2Health -= Math.max(1, damageToP2);
            combatLog.push(getRandomMessage(ATTACKER_MESSAGES, { attacker: p1Name, defender: p2Name, damage: Math.max(1, damageToP2).toFixed(0) }));
            if (p2Health <= 0) break;
            
            let damageToP1 = p2Stats.atk * (1 - p1Stats.def / (p1Stats.def + 1000));
            p1Health -= Math.max(1, damageToP1);
             combatLog.push(getRandomMessage(DEFENDER_MESSAGES, { defender: p2Name, attacker: p1Name, damage: Math.max(1, damageToP1).toFixed(0) }));

            turn++;
        }

        const p1Won = p1Health > 0;
        const winnerName = p1Won ? p1Name : p2Name;
        if(p1Won) guild1Wins++;
        
        if(p1Health <= 0) combatLog.push(getRandomMessage(DEFENDER_FINISHERS, { defender: p2Name, attacker: p1Name }));
        else combatLog.push(getRandomMessage(ATTACKER_FINISHERS, { attacker: p1Name, defender: p2Name }));

        await conn.query(
            "INSERT INTO guild_war_fights (match_id, round_number, guild1_player, guild2_player, winner_player, combat_log, fight_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [match.id, match.current_round, p1Name, p2Name, winnerName, JSON.stringify(combatLog), i + 1]
        );
    }
    
    // Add all fighters to participants list
    const allFighters = [...fighters1, ...fighters2];
    for (const fighterName of allFighters) {
        await conn.query("INSERT IGNORE INTO guild_war_match_participants (match_id, player_name) VALUES (?, ?)", [match.id, fighterName]);
    }

    // Update match score
    let { guild1_round_wins, guild2_round_wins, current_round } = match;
    if(guild1Wins >= 2) guild1_round_wins++; else guild2_round_wins++;

    let nextStatus = 'PENDING_LINEUP';
    let winner_guild_id = null;
    if (guild1_round_wins >= 2) {
        winner_guild_id = match.guild1_id;
        nextStatus = 'COMPLETED';
    } else if (guild2_round_wins >= 2) {
        winner_guild_id = match.guild2_id;
        nextStatus = 'COMPLETED';
    } else if (current_round >= 3) {
        // If it's round 3 and still no winner with 2 wins (e.g. score is 1-2 or 2-1), the one with more wins is the winner
        winner_guild_id = guild1_round_wins > guild2_round_wins ? match.guild1_id : match.guild2_id;
        nextStatus = 'COMPLETED';
    } else {
        current_round++;
    }

    if (nextStatus === 'COMPLETED') {
         console.log(`Match ${matchId} completed. Winner: ${winner_guild_id}`);
         // Distribute rewards
         const [war] = await conn.query("SELECT rewards FROM guild_wars WHERE id = ?", [match.war_id]);
         const rewards = war.rewards || [];

         if (rewards.length > 0) {
            const members = await conn.query("SELECT name, inventory, pills, linh_thach, honorPoints FROM players WHERE guildId = ? FOR UPDATE", [winner_guild_id]);
            for (const member of members) {
                let memberUpdates = {};
                let inventory = member.inventory || [];
                let pills = member.pills || {};

                for (const reward of rewards) {
                    if (reward.type === 'linh_thach') {
                        memberUpdates.linh_thach = (BigInt(member.linh_thach || 0) + BigInt(reward.amount)).toString();
                    } else if (reward.type === 'honor_points') {
                         memberUpdates.honorPoints = (member.honorPoints || 0) + reward.amount;
                    } else if (reward.type === 'equipment' && reward.itemId) {
                        if (!inventory.includes(reward.itemId)) inventory.push(reward.itemId);
                    } else if (reward.type === 'pill' && reward.itemId) {
                        pills[reward.itemId] = (pills[reward.itemId] || 0) + reward.amount;
                    }
                }
                
                memberUpdates.inventory = JSON.stringify(inventory);
                memberUpdates.pills = JSON.stringify(pills);

                if (Object.keys(memberUpdates).length > 0) {
                     await conn.query(
                        `UPDATE players SET ${Object.keys(memberUpdates).map(k => `${k}=?`).join(',')} WHERE name = ?`,
                        [...Object.values(memberUpdates), member.name]
                    );
                }
            }
            console.log(`Distributed rewards to ${members.length} members of guild ${winner_guild_id}`);
         }
    }

    await conn.query("UPDATE guild_war_matches SET guild1_round_wins = ?, guild2_round_wins = ?, current_round = ?, status = ?, winner_guild_id = ? WHERE id = ?", 
        [guild1_round_wins, guild2_round_wins, current_round, nextStatus, winner_guild_id, match.id]);
};


const checkGuildWarStatus = async () => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 1. Start registration for pending wars
        const [pendingWar] = await conn.query("SELECT * FROM guild_wars WHERE status = 'PENDING' AND start_time <= NOW() ORDER BY start_time ASC LIMIT 1");
        if (pendingWar) {
            console.log(`Starting registration for Guild War: ${pendingWar.name}`);
            await conn.query("UPDATE guild_wars SET status = 'REGISTRATION' WHERE id = ?", [pendingWar.id]);
        }

        // 2. Start matches for wars after registration ends (e.g. 1 hour registration window)
        const [registrationWar] = await conn.query("SELECT * FROM guild_wars WHERE status = 'REGISTRATION' AND start_time + INTERVAL 1 HOUR <= NOW() LIMIT 1");
        if (registrationWar) {
            console.log(`Starting matches for Guild War: ${registrationWar.name}`);
            const registrations = await conn.query("SELECT guild_id FROM guild_war_registrations WHERE war_id = ?", [registrationWar.id]);
            const guildIds = registrations.map(r => r.guild_id);
            
            // Simple random matchmaking
            guildIds.sort(() => 0.5 - Math.random()); 
            for (let i = 0; i < guildIds.length - 1; i += 2) {
                await conn.query("INSERT INTO guild_war_matches (war_id, guild1_id, guild2_id) VALUES (?, ?, ?)", [registrationWar.id, guildIds[i], guildIds[i+1]]);
            }
            await conn.query("UPDATE guild_wars SET status = 'IN_PROGRESS' WHERE id = ?", [registrationWar.id]);
        }

        // 3. Process rounds for matches with submitted lineups
        const pendingMatches = await conn.query("SELECT id FROM guild_war_matches WHERE status = 'PENDING_LINEUP'");
        for (const match of pendingMatches) {
            await processRound(conn, match.id);
        }

        await conn.commit();
    } catch (err) {
        if (conn) await conn.rollback();
        console.error("Guild War Scheduler Error:", err);
    } finally {
        if (conn) conn.release();
    }
};

const initializeGuildWarService = () => {
    console.log("Guild War Service Initialized. Scheduler running every 60 seconds.");
    // Run once on start, then set interval
    checkGuildWarStatus(); 
    setInterval(checkGuildWarStatus, 60000); // Check every minute
};

module.exports = {
    initializeGuildWarService,
    processRound, // Export for admin use
};