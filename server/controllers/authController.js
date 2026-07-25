const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id, role, email) => {
    const secret = process.env.JWT_SECRET || 'civicmind_super_secret_hackathon_key_123';
    return jwt.sign({ id, role, email }, secret, { expiresIn: '30d' });
};

// In-memory store for newly registered accounts so sign-in works even if DB is in resilient mode
const registeredMemoryUsers = new Map();

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Please fill all required fields' });
        }

        const normEmail = String(email).toLowerCase().trim();

        // Check if user exists in memory cache
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

        // Always store in memory cache so login works instantly across page reloads
        registeredMemoryUsers.set(normEmail, userObj);

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

        // 1. Check in-memory registered users first (instant match for newly created accounts)
        if (registeredMemoryUsers.has(normEmail)) {
            const memUser = registeredMemoryUsers.get(normEmail);
            const isMatch = await bcrypt.compare(password, memUser.passwordHash);
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
                if (dbUser && (await bcrypt.compare(password, dbUser.password))) {
                    // Update memory cache
                    registeredMemoryUsers.set(normEmail, {
                        id: String(dbUser._id),
                        _id: String(dbUser._id),
                        name: dbUser.name,
                        email: dbUser.email,
                        passwordHash: dbUser.password,
                        role: dbUser.role
                    });

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
        if (normEmail === 'citizen@demo.com' && password === 'Citizen@123') {
            return res.json({
                _id: '65e01234567890abcdef0001',
                name: 'Siddhi (Citizen Demo)',
                email: 'citizen@demo.com',
                role: 'citizen',
                token: generateToken('65e01234567890abcdef0001', 'citizen', 'citizen@demo.com')
            });
        }

        if (normEmail === 'officer@demo.com' && password === 'Officer@123') {
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
