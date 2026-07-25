const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            if (token && token !== 'undefined' && token !== 'null') {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = decoded; 
                return next();
            }
        } catch (error) {
            console.warn('Token validation warning:', error.message);
        }
    }

    // Default to guest citizen context
    req.user = { role: 'citizen', name: 'Citizen' };
    return next();
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: Access denied' });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };
