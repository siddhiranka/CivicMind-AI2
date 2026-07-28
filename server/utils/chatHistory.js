// src/utils/chatHistory.js
// Simple in‑memory store for chatbot conversation histories.
// Keyed by a user identifier (e.g., user ID, session ID, or "anonymous").
// Each entry is an array of message objects: { role: 'user'|'assistant', content: string }.

const historyStore = {};

/**
 * Retrieve the conversation history for a given user.
 * @param {string} userId - Identifier for the user (fallback to 'anonymous').
 * @returns {Array} Array of message objects (oldest first).
 */
function getHistory(userId = 'anonymous') {
  if (!historyStore[userId]) {
    historyStore[userId] = [];
  }
  return historyStore[userId];
}

/**
 * Append a new message to the user's history.
 * Keeps only the most recent 50 messages to bound memory usage.
 * @param {string} userId - Identifier for the user.
 * @param {{role: string, content: string}} message - Message object.
 */
function addMessage(userId = 'anonymous', message) {
  const hist = getHistory(userId);
  hist.push(message);
  if (hist.length > 50) {
    // Remove oldest entries beyond 50
    hist.splice(0, hist.length - 50);
  }
}

module.exports = { getHistory, addMessage };
