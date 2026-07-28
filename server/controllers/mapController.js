const fetch = require('node-fetch');

/**
 * Search for a location using OpenStreetMap Nominatim.
 * Returns first result with latitude, longitude and display name.
 * @param {string} query - location query string
 * @returns {Promise<{lat:string,lng:string,address:string}>}
 */
async function searchLocation(query) {
  if (!query) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'CivicMind/1.0' } });
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const loc = data[0];
      return { lat: loc.lat, lng: loc.lon, address: loc.display_name };
    }
    return null;
  } catch (e) {
    console.warn('Map search error:', e.message);
    return null;
  }
}

exports.searchLocation = searchLocation;
