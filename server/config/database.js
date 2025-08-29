const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'tu_tien.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    } else {
        console.log('Connected to the SQLite database.');
        // Enable foreign key support
        db.run('PRAGMA foreign_keys = ON;', (fkErr) => {
            if (fkErr) {
                console.error('Could not enable foreign keys:', fkErr.message);
            }
        });
    }
});

/**
 * A promisified wrapper for database queries to mimic the mariadb pool.query() behavior.
 * This makes the transition from MariaDB to SQLite much smoother in the service layer.
 * 
 * @param {string} sql The SQL query to execute.
 * @param {Array} params The parameters to bind to the query.
 * @returns {Promise<Array|Object>} A promise that resolves with the query results.
 */
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const stmt = sql.trim().toUpperCase();
        
        if (stmt.startsWith('SELECT') || stmt.startsWith('PRAGMA')) {
            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        } else { // INSERT, UPDATE, DELETE, CREATE, etc.
            db.run(sql, params, function(err) {
                if (err) return reject(err);
                // For INSERT, this contains the lastID. For others, it's just a success indicator.
                resolve({ insertId: this.lastID, changes: this.changes });
            });
        }
    });
};

/**
 * A simplified object to replace the MariaDB connection pool,
 * maintaining compatibility with how the services use it (getConnection -> query).
 */
const pool = {
    getConnection: async () => {
        return {
            query: query,
            beginTransaction: () => query('BEGIN TRANSACTION'),
            commit: () => query('COMMIT'),
            rollback: () => query('ROLLBACK'),
            release: () => {}, // No-op for SQLite as there's no connection to release
        };
    }
};

module.exports = pool;
