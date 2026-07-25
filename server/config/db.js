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
        const conn = await mongoose.connect(process.env.MONGO_URI, {
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
