// server/scripts/cleanupFakeComplaints.js
// Script to purge fake/test complaints and non‑civic issues from MongoDB.
// Run with: `node server/scripts/cleanupFakeComplaints.js`

const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicmind';

async function connect() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('Connected to MongoDB');
}

async function cleanup() {
  const nonCivicResult = await Complaint.deleteMany({ isCivicIssue: false });
  console.log('Deleted non‑civic complaints:', nonCivicResult.deletedCount);

  const keywordRegex = /(hackathon|youtube|test|random)/i;
  const keywordResult = await Complaint.deleteMany({
    $or: [
      { originalDescription: { $regex: keywordRegex } },
      { enhancedDescription: { $regex: keywordRegex } },
    ],
  });
  console.log('Deleted keyword‑matched complaints:', keywordResult.deletedCount);
}

(async () => {
  try {
    await connect();
    await cleanup();
  } catch (err) {
    console.error('Cleanup script error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
})();
