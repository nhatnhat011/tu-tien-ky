const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const JWT_SECRET = $ENV_SECRET; // CHANGE THIS!

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Yêu cầu xác thực.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
        }
        req.user = user;
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Yêu cầu xác thực của quản trị viên.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        // Check for verification error OR if the isAdmin flag is not present/true in the token
        if (err || !user.isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Yêu cầu quyền quản trị.' });
        }
        req.user = user; // The user payload is now { username: '...', isAdmin: true, ... }
        next();
    });
};


module.exports = {
    authenticateToken,
    authenticateAdmin,
    JWT_SECRET,
};
