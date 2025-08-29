const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeGameData } = require('./services/gameData.service');
const { initializeGuildWarService } = require('./services/guildWar.service');

// Import modular routes
const authRoutes = require('./routes/auth.routes');
const playerRoutes = require('./routes/player.routes');
const guildRoutes = require('./routes/guild.routes');
const chatRoutes = require('./routes/chat.routes');
const gameRoutes = require('./routes/game.routes');
const pvpRoutes = require('./routes/pvp.routes');
const marketRoutes = require('./routes/market.routes'); // Import new market routes
const adminRoutes = require('./routes/admin.routes');
const guildWarRoutes = require('./routes/guild-war.routes');


const app = express();

// --- Cấu hình Middleware ---
app.use(cors());
app.use(bodyParser.json());

// --- Sử dụng các Routes đã được module hóa ---
// FIX: Reorder routes from most specific to most general to prevent routing conflicts.
// The '/api/admin' route is now correctly placed before the general '/api' routes.
app.use('/api/admin', adminRoutes); // Admin routes (most specific)
app.use('/api/guilds', guildRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/pvp', pvpRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/guild-war', guildWarRoutes);
app.use('/api/auth', authRoutes);

// General game routes should come after more specific ones.
app.use('/api', playerRoutes); // e.g. /api/load, /api/leaderboard
app.use('/api', gameRoutes); // e.g. /api/breakthrough, /api/temper-body


// --- Khởi động Server ---
const port = process.env.PORT || 3001;
app.listen(port, async () => {
    console.log(`Server đang chạy trên cổng ${port}`);
    // Load all game data from DB into cache on startup
    await initializeGameData(); 
    // Start the guild war scheduler
    initializeGuildWarService();
});