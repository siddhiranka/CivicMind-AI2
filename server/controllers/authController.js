const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role, email) => {
    const secret = process.env.JWT_SECRET || 'civicmind_super_secret_hackathon_key_123';
    return jwt.sign({ id, role, email }, secret, { expiresIn: '30d' });
};

// Fallback demo users in case DB is unreachable
const DEMO_USERS = [
    {
        _id: '65e01234567890abcdef0001',
        name: 'Siddhi (Citizen Demo)',
        email: 'citizen@demo.com',
        passwordHash: '$2a$10$eE8h...demo', // matched by string or demo credentials
        role: 'citizen'
    },
    {
        _id: '65e01234567890abcdef0002',
        name: 'Rahul Sharma (Officer Demo)',
        email: 'officer@demo.com',
        passwordHash: '$2a$10$eE8h...demo',
        role: 'officer'
    }
];

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please fill all required fields' });
        }

        let user;
        try {
            const userExists = await User.findOne({ email });
            if (userExists) {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'citizen'
            });
        } catch (dbErr) {
            console.warn('DB unavailable during register, returning instant session:', dbErr.message);
            user = {
                id: 'usr_' + Date.now(),
                _id: 'usr_' + Date.now(),
                name,
                email,
                role: 'citizen'
            };
        }

        res.status(201).json({
            _id: user.id || user._id,
            name: user.name,
            email: user.email,
            role: user.role || 'citizen',
            token: generateToken(user.id || user._id, user.role || 'citizen', user.email)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please enter both email and password' });
        }

        // 1. Check database first
        let dbSuccess = false;
        try {
            const user = await User.findOne({ email });
            if (user && (await bcrypt.compare(password, user.password))) {
                dbSuccess = true;
                return res.json({
                    _id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id, user.role, user.email)
                });
            }
        } catch (dbErr) {
            console.warn('DB lookup failed, checking demo fallback accounts:', dbErr.message);
        }

        // 2. Fallback check for demo accounts if DB query failed or didn't match
        const lowerEmail = email.toLowerCase().trim();
        if (lowerEmail === 'citizen@demo.com' && password === 'Citizen@123') {
            return res.json({
                _id: '65e01234567890abcdef0001',
                name: 'Siddhi (Citizen Demo)',
                email: 'citizen@demo.com',
                role: 'citizen',
                token: generateToken('65e01234567890abcdef0001', 'citizen', 'citizen@demo.com')
            });
        }

        if (lowerEmail === 'officer@demo.com' && password === 'Officer@123') {
            return res.json({
                _id: '65e01234567890abcdef0002',
                name: 'Rahul Sharma (Officer Demo)',
                email: 'officer@demo.com',
                role: 'officer',
                token: generateToken('65e01234567890abcdef0002', 'officer', 'officer@demo.com')
            });
        }

        if (dbSuccess === false) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};
