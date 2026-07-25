const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const generateToken = (id, role, email) => {
    const secret = process.env.JWT_SECRET || 'civicmind_super_secret_hackathon_key_123';
    return jwt.sign({ id, role, email }, secret, { expiresIn: '30d' });
};

// Persistent file cache path for user accounts
const USERS_FILE = path.join(__dirname, '../data/users_cache.json');

// Ensure directory exists
try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (e) {
    console.warn('Could not create data dir:', e.message);
}

// Load registered users from disk cache
function loadPersistedUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const raw = fs.readFileSync(USERS_FILE, 'utf8');
            const arr = JSON.parse(raw);
            return new Map(arr);
        }
    } catch (err) {
        console.warn('Notice loading users cache:', err.message);
    }
    return new Map();
}

// Save registered users to disk cache
function savePersistedUsers(map) {
    try {
        const arr = Array.from(map.entries());
        fs.writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
        console.warn('Notice saving users cache:', err.message);
    }
}

// Initialize memory store from disk
const registeredMemoryUsers = loadPersistedUsers();

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please fill all required fields' });
        }

        const normEmail = String(email).toLowerCase().trim();

        // Check if user exists in persistent memory store
        if (registeredMemoryUsers.has(normEmail)) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const generatedUserId = 'usr_' + Date.now();

        let userObj = {
            id: generatedUserId,
            _id: generatedUserId,
            name: name.trim(),
            email: normEmail,
            passwordHash: hashedPassword,
            rawPassword: String(password).trim(),
            role: 'citizen'
        };

        // Try saving to MongoDB if connected
        if (mongoose.connection.readyState === 1) {
            try {
                const userExists = await User.findOne({ email: normEmail });
                if (userExists) {
                    return res.status(400).json({ error: 'User with this email already exists' });
                }

                const dbUser = await User.create({
                    name: name.trim(),
                    email: normEmail,
                    password: hashedPassword,
                    role: 'citizen'
                });
                userObj.id = String(dbUser._id);
                userObj._id = String(dbUser._id);
            } catch (dbErr) {
                console.warn('DB register notice:', dbErr.message);
            }
        }

        // Save to persistent memory map and disk cache
        registeredMemoryUsers.set(normEmail, userObj);
        savePersistedUsers(registeredMemoryUsers);

        res.status(201).json({
            _id: userObj.id,
            name: userObj.name,
            email: userObj.email,
            role: userObj.role,
            token: generateToken(userObj.id, userObj.role, userObj.email)
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: error.message || 'Server error during registration' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Please enter both email and password' });
        }

        const normEmail = String(email).toLowerCase().trim();
        const inputPass = String(password).trim();

        // 1. Check persistent memory store first (instant match for newly created accounts)
        if (registeredMemoryUsers.has(normEmail)) {
            const memUser = registeredMemoryUsers.get(normEmail);
            let isMatch = false;
            try {
                isMatch = await bcrypt.compare(inputPass, memUser.passwordHash);
            } catch (e) {}

            if (!isMatch && memUser.rawPassword && memUser.rawPassword === inputPass) {
                isMatch = true;
            }

            if (isMatch) {
                return res.json({
                    _id: memUser.id,
                    name: memUser.name,
                    email: memUser.email,
                    role: memUser.role,
                    token: generateToken(memUser.id, memUser.role, memUser.email)
                });
            }
        }

        // 2. Check MongoDB database if connected
        if (mongoose.connection.readyState === 1) {
            try {
                const dbUser = await User.findOne({ email: normEmail });
                if (dbUser && (await bcrypt.compare(inputPass, dbUser.password))) {
                    // Update persistent cache
                    const cacheObj = {
                        id: String(dbUser._id),
                        _id: String(dbUser._id),
                        name: dbUser.name,
                        email: dbUser.email,
                        passwordHash: dbUser.password,
                        rawPassword: inputPass,
                        role: dbUser.role
                    };
                    registeredMemoryUsers.set(normEmail, cacheObj);
                    savePersistedUsers(registeredMemoryUsers);

                    return res.json({
                        _id: String(dbUser._id),
                        name: dbUser.name,
                        email: dbUser.email,
                        role: dbUser.role,
                        token: generateToken(String(dbUser._id), dbUser.role, dbUser.email)
                    });
                }
            } catch (dbErr) {
                console.warn('DB login lookup notice:', dbErr.message);
            }
        }

        // 3. Fallback check for demo accounts
        if (normEmail === 'citizen@demo.com' && inputPass === 'Citizen@123') {
            return res.json({
                _id: '65e01234567890abcdef0001',
                name: 'Siddhi (Citizen Demo)',
                email: 'citizen@demo.com',
                role: 'citizen',
                token: generateToken('65e01234567890abcdef0001', 'citizen', 'citizen@demo.com')
            });
        }

        if (normEmail === 'officer@demo.com' && inputPass === 'Officer@123') {
            return res.json({
                _id: '65e01234567890abcdef0002',
                name: 'Rahul Sharma (Officer Demo)',
                email: 'officer@demo.com',
                role: 'officer',
                token: generateToken('65e01234567890abcdef0002', 'officer', 'officer@demo.com')
            });
        }

        return res.status(401).json({ error: 'Invalid email or password' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Server error during login' });
    }
};
