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

// Load registered users from disk cache with key normalization
function loadPersistedUsers() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const raw = fs.readFileSync(USERS_FILE, 'utf8');
            const arr = JSON.parse(raw);
            const map = new Map();
            if (Array.isArray(arr)) {
                for (const [k, v] of arr) {
                    if (k && v) {
                        const normKey = String(k).toLowerCase().trim();
                        map.set(normKey, v);
                    }
                }
            }
            return map;
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
        const inputPass = String(password).trim();

        // If user already exists in memory cache, verify if credentials match for auto-login
        if (registeredMemoryUsers.has(normEmail)) {
            const memUser = registeredMemoryUsers.get(normEmail);
            const passHash = memUser.passwordHash || memUser.password;
            const rawPass = memUser.rawPassword || memUser.password;
            let isMatch = false;

            if (passHash) {
                try {
                    isMatch = await bcrypt.compare(inputPass, passHash);
                } catch (e) {}
            }

            if (!isMatch && rawPass && String(rawPass).trim() === inputPass) {
                isMatch = true;
            }

            if (isMatch) {
                console.log(`[AUTH REGISTER AUTO-LOGIN] Existing user "${normEmail}" signed in automatically`);
                return res.status(200).json({
                    _id: memUser.id || memUser._id,
                    name: memUser.name,
                    email: normEmail,
                    role: memUser.role || 'citizen',
                    token: generateToken(memUser.id || memUser._id, memUser.role || 'citizen', normEmail)
                });
            }

            return res.status(400).json({ error: 'An account with this email already exists. Please Sign In.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(inputPass, salt);
        const generatedUserId = 'usr_' + Date.now();

        let userObj = {
            id: generatedUserId,
            _id: generatedUserId,
            name: String(name).trim(),
            email: normEmail,
            passwordHash: hashedPassword,
            rawPassword: inputPass,
            role: 'citizen'
        };

        // Save to MongoDB if connected
        if (mongoose.connection.readyState === 1) {
            try {
                const userExists = await User.findOne({ 
                    email: { $regex: new RegExp(`^${normEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') } 
                });
                
                if (userExists) {
                    let isDbMatch = false;
                    try {
                        isDbMatch = await bcrypt.compare(inputPass, userExists.password);
                    } catch (e) {}
                    if (!isDbMatch && userExists.password === inputPass) isDbMatch = true;

                    if (isDbMatch) {
                        userObj.id = String(userExists._id);
                        userObj._id = String(userExists._id);
                        userObj.name = userExists.name;
                        registeredMemoryUsers.set(normEmail, userObj);
                        savePersistedUsers(registeredMemoryUsers);

                        return res.status(200).json({
                            _id: String(userExists._id),
                            name: userExists.name,
                            email: normEmail,
                            role: userExists.role || 'citizen',
                            token: generateToken(String(userExists._id), userExists.role || 'citizen', normEmail)
                        });
                    }

                    return res.status(400).json({ error: 'An account with this email already exists. Please Sign In.' });
                }

                const dbUser = await User.create({
                    name: String(name).trim(),
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
        console.log(`[AUTH LOGIN ATTEMPT] Email: "${normEmail}"`);

        // 1. Check persistent memory store first (instant match for all created accounts)
        if (registeredMemoryUsers.has(normEmail)) {
            const memUser = registeredMemoryUsers.get(normEmail);
            const passHash = memUser.passwordHash || memUser.password;
            const rawPass = memUser.rawPassword || memUser.password;
            let isMatch = false;

            if (passHash) {
                try {
                    isMatch = await bcrypt.compare(inputPass, passHash);
                } catch (e) {}
            }

            if (!isMatch && rawPass && String(rawPass).trim() === inputPass) {
                isMatch = true;
            }

            if (isMatch) {
                console.log(`[AUTH SUCCESS - MEMORY] Verified user: "${normEmail}"`);
                return res.json({
                    _id: memUser.id || memUser._id,
                    name: memUser.name,
                    email: normEmail,
                    role: memUser.role || 'citizen',
                    token: generateToken(memUser.id || memUser._id, memUser.role || 'citizen', normEmail)
                });
            } else {
                console.warn(`[AUTH FAIL - MEMORY] Password mismatch for user: "${normEmail}"`);
            }
        }

        // 2. Check MongoDB database if connected
        if (mongoose.connection.readyState === 1) {
            try {
                const dbUser = await User.findOne({ 
                    email: { $regex: new RegExp(`^${normEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') } 
                });

                if (dbUser) {
                    let isDbMatch = false;
                    try {
                        isDbMatch = await bcrypt.compare(inputPass, dbUser.password);
                    } catch (e) {}

                    if (!isDbMatch && dbUser.password === inputPass) {
                        isDbMatch = true;
                    }

                    if (isDbMatch) {
                        console.log(`[AUTH SUCCESS - DB] Verified user: "${normEmail}"`);
                        const cacheObj = {
                            id: String(dbUser._id),
                            _id: String(dbUser._id),
                            name: dbUser.name,
                            email: normEmail,
                            passwordHash: dbUser.password,
                            rawPassword: inputPass,
                            role: dbUser.role || 'citizen'
                        };
                        registeredMemoryUsers.set(normEmail, cacheObj);
                        savePersistedUsers(registeredMemoryUsers);

                        return res.json({
                            _id: String(dbUser._id),
                            name: dbUser.name,
                            email: normEmail,
                            role: dbUser.role || 'citizen',
                            token: generateToken(String(dbUser._id), dbUser.role || 'citizen', normEmail)
                        });
                    }
                }
            } catch (dbErr) {
                console.warn('[AUTH DB LOOKUP ERROR]:', dbErr.message);
            }
        }

        // 3. Fallback check for demo accounts
        if (normEmail === 'citizen@demo.com' && inputPass === 'Citizen@123') {
            console.log(`[AUTH SUCCESS - DEMO] Citizen demo login`);
            return res.json({
                _id: '65e01234567890abcdef0001',
                name: 'Siddhi (Citizen Demo)',
                email: 'citizen@demo.com',
                role: 'citizen',
                token: generateToken('65e01234567890abcdef0001', 'citizen', 'citizen@demo.com')
            });
        }

        if (normEmail === 'officer@demo.com' && inputPass === 'Officer@123') {
            console.log(`[AUTH SUCCESS - DEMO] Officer demo login`);
            return res.json({
                _id: '65e01234567890abcdef0002',
                name: 'Rahul Sharma (Officer Demo)',
                email: 'officer@demo.com',
                role: 'officer',
                token: generateToken('65e01234567890abcdef0002', 'officer', 'officer@demo.com')
            });
        }

        console.warn(`[AUTH REJECT] No matching credentials for "${normEmail}". User in memory: ${registeredMemoryUsers.has(normEmail)}`);
        return res.status(401).json({ error: 'Invalid email or password' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: error.message || 'Server error during login' });
    }
};
