// src/utils/geocode.js
// Simple reverse‑geocode using OpenStreetMap Nominatim API.
// Returns a promise that resolves to a formatted address string or null.

const fetch = require('node-fetch');

/**
 * Reverse‑geocode latitude/longitude to a human readable address.
 * @param {number|string} lat Latitude value.
 * @param {number|string} lng Longitude value.
 * @returns {Promise<string|null>} Address string or null on failure.
 */
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CivicMind/1.0 (your@email.com)' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch (err) {
    console.warn('Reverse geocode failed:', err.message);
    return null;
  }
}

module.exports = { reverseGeocode };
