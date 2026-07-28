const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { connectCloudinary } = require('./config/cloudinary');
const seedDemoUsers = require('./utils/seedDemoUsers');

// Load env vars
dotenv.config();

// Connect to databases
connectDB().then(() => {
    seedDemoUsers();
});
connectCloudinary();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const complaintRoutes = require('./routes/complaintRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Basic route
app.get('/', (req, res) => {
    res.send('CivicMind AI API is running...');
});

// API Routes
app.use('/api/complaints', complaintRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
const mapRoutes = require('./routes/mapRoutes');
app.use('/api/map', mapRoutes);

module.exports = app;
