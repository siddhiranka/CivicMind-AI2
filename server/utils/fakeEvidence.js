// server/utils/fakeEvidence.js
// Regular expression patterns to detect non‑civic or fabricated content in images/videos.
// Used after Gemini analysis to reject reports that clearly show posters, ads, screenshots, etc.

const fakeEvidencePatterns = [
  /hackathon|poster|flyer|ad\s*banner|advertisement|event\s*banner/i,
  /youtube|thumbnail|video\s*preview|play\s*button|video\s*player/i,
  /screenshot|screen\s*capture|mobile\s*screen|computer\s*screen|browser/i,
  /certificate|presentation\s*slide|powerpoint|ppt|document/i,
  /meme|social\s*media|facebook|instagram|twitter|tiktok|whatsapp/i,
  /selfie|portrait|person\s*face|id\s*card|passport/i,
  /ai\s*generated|synthetic|midjourney|dalle|stable\s*diffusion/i
];

/**
 * Checks whether a detected scene description contains any fake‑evidence pattern.
 * If the scene description explicitly contains a civic hazard (like flood, waterlogging, pothole, garbage),
 * it returns false (valid report).
 * @param {string} sceneDescription – free‑text description returned by Gemini.
 * @returns {boolean} true if a fake pattern is found.
 */
function containsFakeEvidence(sceneDescription) {
  if (!sceneDescription) return false;

  const textLower = String(sceneDescription).toLowerCase();

  // If the scene explicitly matches non-civic media patterns (posters, screenshots, flyers, memes, selfies, slides) -> ALWAYS REJECT
  const patternMatch = fakeEvidencePatterns.some(pat => pat.test(textLower));
  if (patternMatch) return true;

  // Also check if scene explicitly mentions non-civic indicators
  const nonCivicTerms = ['poster', 'flyer', 'banner', 'hackathon', 'screenshot', 'youtube', 'certificate', 'presentation', 'meme', 'selfie', 'drawing', 'illustration', 'sketch'];
  if (nonCivicTerms.some(t => textLower.includes(t))) {
    return true;
  }

  return false;
}

module.exports = { containsFakeEvidence, fakeEvidencePatterns };
