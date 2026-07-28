const mongoose = require('mongoose');
const dns = require('dns');

// Disable Mongoose command buffering so queries return instantly without 10s delays when DB is offline
mongoose.set('bufferCommands', false);

// Prefer IPv4 for DNS resolution to avoid Windows ECONNREFUSED on MongoDB SRV records
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    // Ignore if not supported in node version
}

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri || typeof uri !== 'string' || !uri.trim()) {
            console.warn('⚠️ MONGO_URI is not set. Server running in resilient mode.');
            return;
        }
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 3000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Warning: ${error.message}`);
        console.log(`⚠️ Server running in resilient mode.`);
    }
};

module.exports = connectDB;
