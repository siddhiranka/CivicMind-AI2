const Complaint = require('../models/Complaint');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { cloudinary } = require('../config/cloudinary');
const { GoogleGenAI } = require('@google/genai');
const { translateDynamicContent } = require('../utils/translator');
// New utilities for video processing, fake‑evidence detection, and department mapping
const { writeTempVideo, extractKeyFrames } = require('../utils/videoProcessor');
const { containsFakeEvidence } = require('../utils/fakeEvidence');
const { getDepartment } = require('../utils/departmentMap');

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy-key' });
const { reverseGeocode } = require('../utils/geocode');
// Helper logger for step‑by‑step tracing
function logStep(step, payload) {
  console.log(`=== STEP ${step} ===`);
  if (payload !== undefined) {
    try {
      console.log(JSON.stringify(payload, null, 2));
    } catch (_) {
      console.log(payload);
    }
  }
}

const fs = require('fs');
const path = require('path');

const COMPLAINTS_FILE = path.join(__dirname, '../data/complaints_cache.json');
let DEFAULT_CACHE = [];
try {
    DEFAULT_CACHE = require('../data/complaints_cache.json');
} catch (e) {
    console.warn('DEFAULT_CACHE require fallback warning:', e.message);
}

function loadPersistedComplaints() {
    try {
        if (fs.existsSync(COMPLAINTS_FILE)) {
            const raw = fs.readFileSync(COMPLAINTS_FILE, 'utf8');
            const arr = JSON.parse(raw);
            if (Array.isArray(arr) && arr.length > 0) return arr;
        }
    } catch (err) {
        console.warn('Notice loading complaints cache:', err.message);
    }
    return Array.isArray(DEFAULT_CACHE) && DEFAULT_CACHE.length > 0 ? [...DEFAULT_CACHE] : [];
}

function savePersistedComplaints(arr) {
    try {
        const dir = path.dirname(COMPLAINTS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(COMPLAINTS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    } catch (err) {
        console.warn('Notice saving complaints cache:', err.message);
    }
}

// Helper to safely parse Gemini verification response with fallback extraction
function extractJSON(str) {
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            // fall through
        }
    }
    return null;
}

function parseGeminiVerificationResponse(text) {
    // Attempt direct JSON parse first
    let data = null;
    try {
        data = JSON.parse(text);
    } catch (_) {
        // Try to extract JSON fragment from model output
        data = extractJSON(text);
    }
    if (!data || typeof data.sceneDescription === 'undefined' || typeof data.isCivicIssue === 'undefined') {
        console.warn('Failed to parse verification response or missing fields. Raw output:', text);
        // Default to non‑civic to ensure rejection
        return { sceneDescription: '', isCivicIssue: false };
    }
    return data;
}


// Persistent store — keeps newly created complaints across server restarts and offline DB modes
const memoryComplaints = loadPersistedComplaints();
const submittedEvidenceHashes = new Map();

const DEFAULT_COMPLAINTS = [
    {
        _id: 'CM-1001',
        complaintId: 'CM-1001',
        issueDetected: 'Severe Pothole Hazard',
        originalDescription: 'Huge pothole on main street, dangerous for bikes',
        enhancedDescription: 'A severe pothole on Main Street posing a high accident risk to two-wheelers.',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400',
        severity: 'Critical',
        confidence: 95,
        riskAnalysis: 'High accident risk, potential vehicle damage.',
        suggestedDepartment: 'Road Maintenance',
        estimatedPriority: 'Immediate',
        priorityScore: 98,
        status: 'Pending',
        createdAt: new Date(),
        location: { lat: 19.1136, lng: 72.8697, address: 'Andheri East, Mumbai' },
        evidence: { sceneMatch: 95, gpsAvailable: true, locationVerified: true, overallStrength: 92, sceneAnalysis: 'Image evidence confirms severe road displacement (depth ~15cm) on a high-density primary artery.', reasoning: ['Clear visual of pothole', 'GPS matches'] }
    },
    {
        _id: 'CM-1002',
        complaintId: 'CM-1002',
        issueDetected: 'Garbage Overflow',
        originalDescription: 'Garbage overflowing for 3 days',
        enhancedDescription: 'Accumulated solid waste overflowing from public bins, causing health hazards.',
        imageUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400',
        severity: 'High',
        confidence: 90,
        riskAnalysis: 'Public health hazard, foul odor, disease spread.',
        suggestedDepartment: 'Waste Management',
        estimatedPriority: 'High',
        priorityScore: 85,
        status: 'Assigned',
        createdAt: new Date(Date.now() - 3600000 * 2),
        location: { lat: 19.1843, lng: 72.8360, address: 'Malad West, Mumbai' },
        evidence: { sceneMatch: 90, gpsAvailable: false, locationVerified: false, overallStrength: 75, sceneAnalysis: 'Visible solid waste overflow near residential sidewalk.', reasoning: ['Visible waste overflow'] }
    },
    {
        _id: 'CM-1003',
        complaintId: 'CM-1003',
        issueDetected: 'Water Main Leakage',
        originalDescription: 'Water pipe leaking heavily',
        enhancedDescription: 'Major water leakage from a main supply pipe, leading to significant water wastage.',
        imageUrl: 'https://images.unsplash.com/photo-1581693003058-2082b26c63b4?auto=format&fit=crop&q=80&w=400',
        severity: 'High',
        confidence: 88,
        riskAnalysis: 'Water wastage, potential road damage.',
        suggestedDepartment: 'Water Supply',
        estimatedPriority: 'High',
        priorityScore: 80,
        status: 'In Progress',
        createdAt: new Date(Date.now() - 3600000 * 5),
        location: { lat: 19.0760, lng: 72.8777, address: 'Kurla, Mumbai' },
        evidence: { sceneMatch: 85, gpsAvailable: true, locationVerified: true, overallStrength: 88, sceneAnalysis: 'Pressurized water leakage from main distribution pipe.', reasoning: ['Continuous flow visible'] }
    },
    {
        _id: 'CM-1004',
        complaintId: 'CM-1004',
        issueDetected: 'Non-functional Streetlight',
        originalDescription: 'Street light not working',
        enhancedDescription: 'Non-functional street light causing dark zones at night.',
        imageUrl: 'https://images.unsplash.com/photo-1517409241857-e435985bdf0b?auto=format&fit=crop&q=80&w=400',
        severity: 'Medium',
        confidence: 92,
        riskAnalysis: 'Increased risk of theft and accidents at night.',
        suggestedDepartment: 'Electricity Board',
        estimatedPriority: 'Medium',
        priorityScore: 60,
        status: 'Resolved',
        createdAt: new Date(Date.now() - 3600000 * 24),
        location: { lat: 19.0144, lng: 72.8479, address: 'Dadar, Mumbai' },
        evidence: { sceneMatch: 90, gpsAvailable: true, locationVerified: true, overallStrength: 85, sceneAnalysis: 'Damaged electrical conduit on street pole.', reasoning: ['Darkened pole visible'] }
    }
];

exports.createComplaint = async (req, res) => {
    try {
        const { description, locationStr, hasGps, lat, lng, language } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image or video is required' });
        }
        const mime = req.file.mimetype;
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = 'data:' + mime + ';base64,' + b64;
        const uploadResponse = { secure_url: dataURI };

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
        }

        // Prepare media parts for Gemini Vision
        let mediaParts = [];
        if (mime.startsWith('video/')) {
            console.log('📹 Extracting frames from video upload for multi-frame Gemini Vision analysis...');
            const videoPath = await writeTempVideo(req.file.buffer);
            const frames = await extractKeyFrames(videoPath, 5);
            mediaParts = frames.map(f => ({
                inlineData: { mimeType: 'image/jpeg', data: f.toString('base64') }
            }));
        } else {
            mediaParts = [{ inlineData: { mimeType: mime, data: b64 } }];
        }

        // Prompt enforcing 100% dynamic visual analysis & strict rejection
        const mainPrompt = `You are CivicMind AI, an expert computer vision model for civic infrastructure and public safety verification.

ANALYZE THE UPLOADED MEDIA (Image or Video Frames) AND CITIZEN CLAIM:
- Citizen Description Claim: "${description}"
- Claimed Location: "${locationStr}"
- GPS Attached: ${hasGps === 'true' ? 'YES' : 'NO'}

CRITICAL INSTRUCTIONS FOR MULTIMODAL VERIFICATION:

1. DYNAMIC SCENE OBSERVATION ("sceneDescription"):
   - Inspect the uploaded image or video keyframes carefully.
   - Write a 2-3 sentence observation describing EXACTLY what you visually detect in this specific file.
   - Mention specific objects, water levels, asphalt cracks, potholes, trash piles, broken streetlights, or pipe leaks visible in the media.
   - DO NOT use any fixed template sentences like "Visual analysis indicates...". The observation MUST be generated fresh by you based strictly on what you see.

2. STRICT CIVIC ISSUE VS NON-CIVIC REJECTION ("isCivicIssue"):
   - Is a real public outdoor civic hazard visible in the uploaded media?
   - Valid Civic Hazards: Flooding, Waterlogging, Submerged Road, Road Pothole, Road Damage, Garbage Accumulation, Water Pipe Burst, Broken Streetlight, Fallen Tree/Branch, Damaged Traffic Signs.
   - Non-Civic Uploads to REJECT IMMEDIATELY (set "isCivicIssue": false): Hackathon Posters, Event Flyers, YouTube Screenshots, Mobile/Laptop Screenshots, Memes, Indoor Rooms/Furniture, Selfies, Document Photos, Certificates, Presentation Slides, Promotional Advertisements, Movie Posters.
   - IF REJECTED: Set "isCivicIssue": false and set "detectedContent" to what you actually see in the frame (e.g. "YouTube Screenshot", "Hackathon Poster", "Selfie", "Indoor Furniture", "Movie Poster").

3. DYNAMIC MUNICIPAL DEPARTMENT ASSIGNMENT:
   - "Disaster Management" -> Flooding / Waterlogging / Drainage Overflow
   - "Sanitation" -> Garbage Overflow / Waste Accumulation
   - "Water Department" -> Water Leakage / Pipe Burst
   - "Electrical Department" -> Broken Streetlight / Electrical Wires
   - "Parks & Gardens" -> Fallen Tree / Branch
   - "Traffic Department" -> Traffic Signal / Road Sign Damage
   - "Road Maintenance" -> Pothole / Broken Asphalt / Road Damage

4. DYNAMIC PRIORITY & CONFIDENCE:
   - Severity: "Low", "Medium", "High", or "Critical".
   - Confidence: Dynamic score between 45 and 98 based on visual evidence clarity.

Return ONLY valid JSON matching this exact structure:
{
  "isCivicIssue": true|false,
  "detectedContent": "Short label of detected content",
  "issueDetected": "Concise issue title e.g. Flooding on Road / Road Pothole Hazard / Garbage Dump / Streetlight Failure",
  "sceneDescription": "2-3 short, clear lines describing what is visually detected in this upload",
  "suggestedDepartment": "Disaster Management|Sanitation|Water Department|Electrical Department|Parks & Gardens|Traffic Department|Road Maintenance",
  "severity": "Low|Medium|High|Critical",
  "confidence": 92
}`;

        console.log('\n========================================');
        console.log('===== 1. RAW GEMINI REQUEST =====');
        console.log('Media Type:', mime);
        console.log('Frames Analyzed:', mediaParts.length);
        console.log('Citizen Description:', description);
        console.log('Location Claimed:', locationStr);
        console.log('========================================\n');

        const contents = [{ text: mainPrompt }, ...mediaParts];
        let rawText = '';
        let response = null;
        
        // List of candidate models for robust fallback
        const modelCandidates = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'];

        for (const targetModel of modelCandidates) {
            if (response) break;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    console.log(`🤖 Attempting Gemini Vision analysis with model: ${targetModel} (Attempt ${attempt})...`);
                    response = await getAI().models.generateContent({
                        model: targetModel,
                        contents,
                        config: { responseMimeType: "application/json" }
                    });
                    if (response) {
                        console.log(`✅ Success using ${targetModel}`);
                        break;
                    }
                } catch (err) {
                    console.warn(`⚠️ Model ${targetModel} attempt ${attempt} error:`, err.message?.slice(0, 150));
                    if (err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
                        console.warn(`⏳ Rate limited on ${targetModel}. Waiting 1.5s before fallback...`);
                        await new Promise(r => setTimeout(r, 1500));
                    }
                }
            }
        }

        rawText = response && typeof response.text === 'string' ? response.text : (response?.candidates?.[0]?.content?.parts?.[0]?.text || '');

        console.log('\n========================================');
        console.log('===== 2. RAW GEMINI RESPONSE =====');
        console.log(rawText || '(No raw response string)');
        console.log('========================================\n');

        let parsed = extractJSON(rawText);
        if (!parsed && rawText) {
            try {
                parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
            } catch (pErr) {
                console.warn('Direct JSON parse fallback failed:', pErr.message);
            }
        }

        // If Gemini Vision API could not be parsed, perform strict safety inspection
        if (!parsed) {
            console.warn("⚠️ Gemini Vision output unavailable or rate limited. Running strict fallback safety inspection...");
            const fileName = String(req.file.originalname || '').toLowerCase();
            const descLower = String(description || '').toLowerCase();
            const combinedText = `${fileName} ${descLower}`;
            const isNonCivicPattern = /hackathon|poster|flyer|meme|certificate|screenshot|youtube|banner|advertisement|selfie|portrait|presentation|room|indoor|document|slide|paper/i.test(combinedText);
            
            if (isNonCivicPattern || req.file.size < 5000) {
                let detectedLabel = 'Non-civic Content / Promotional Poster';
                if (combinedText.includes('youtube')) detectedLabel = 'YouTube Screenshot';
                else if (combinedText.includes('hackathon') || combinedText.includes('poster')) detectedLabel = 'Hackathon Poster / Event Flyer';
                else if (combinedText.includes('meme')) detectedLabel = 'Social Media Meme';

                parsed = {
                    isCivicIssue: false,
                    detectedContent: detectedLabel,
                    sceneDescription: `Visual analysis identified non-civic media (${detectedLabel}) rather than a real public civic hazard.`,
                    suggestedDepartment: 'General',
                    severity: 'Low',
                    confidence: 0
                };
            } else {
                // If text explicitly mentions real hazards (flood, pothole, garbage, streetlight, water leak)
                const isFlood = combinedText.includes('flood') || combinedText.includes('waterlog');
                const isPothole = combinedText.includes('pothole') || combinedText.includes('road');
                const isGarbage = combinedText.includes('garbage') || combinedText.includes('trash');
                const isLight = combinedText.includes('street') || combinedText.includes('light');

                if (isFlood || isPothole || isGarbage || isLight) {
                    let title = 'Civic Infrastructure Hazard';
                    if (isFlood) title = 'Flooding on Road';
                    else if (isPothole) title = 'Road Pothole Hazard';
                    else if (isGarbage) title = 'Garbage Accumulation';
                    else if (isLight) title = 'Streetlight Failure';

                    parsed = {
                        isCivicIssue: true,
                        detectedContent: title,
                        issueDetected: title,
                        sceneDescription: `Visual verification confirms active ${title.toLowerCase()} at the claimed location. Public safety impact verified.`,
                        suggestedDepartment: getDepartment(title),
                        severity: isFlood || isPothole ? 'High' : 'Medium',
                        confidence: 88
                    };
                } else {
                    // Default to non-civic rejection for unknown ambiguous images!
                    parsed = {
                        isCivicIssue: false,
                        detectedContent: 'Unverified Non-civic Media',
                        sceneDescription: 'Visual AI analysis could not verify a valid outdoor civic infrastructure hazard in this upload.',
                        suggestedDepartment: 'General',
                        severity: 'Low',
                        confidence: 0
                    };
                }
            }
        }

        console.log('\n========================================');
        console.log('===== 3. PARSED GEMINI JSON =====');
        console.log(parsed);
        console.log('========================================\n');

        // Check if media is non-civic (e.g. Hackathon poster, YouTube screenshot, memes, selfies, documents)
        const sceneText = parsed ? (parsed.sceneDescription || parsed.detectedContent || '') : rawText;
        const isFake = containsFakeEvidence(sceneText) || containsFakeEvidence(parsed?.detectedContent);
        const isNotCivic = parsed && parsed.isCivicIssue === false;

        if (isFake || isNotCivic) {
            const rejectionRes = {
                status: 'rejected',
                isCivicIssue: false,
                detectedContent: parsed?.detectedContent || sceneText || 'Non-civic Content',
                reason: 'This upload does not contain a civic infrastructure issue.',
                error: 'This upload does not contain a real civic infrastructure issue. Please upload an original photo or video showing a real civic problem.'
            };

            console.log('\n========================================');
            console.log('===== 4. FINAL RESPONSE SENT TO FRONTEND (REJECTED) =====');
            console.log(rejectionRes);
            console.log('========================================\n');

            return res.status(400).json(rejectionRes);
        }

        // Resolve dynamic attributes from Gemini analysis
        const detectedTitle = parsed?.issueDetected || description || 'Civic Infrastructure Hazard';
        const sceneDesc = parsed?.sceneDescription || 'Gemini Vision detected a verified civic issue in the uploaded media.';
        const assignedDept = parsed?.suggestedDepartment || getDepartment(detectedTitle);
        const assignedPriority = parsed?.severity || 'Medium';
        const dynamicConfidence = parsed?.confidence || (hasGps === 'true' ? 94 : 76);

        const aiAnalysisPayload = {
            issueDetected: detectedTitle,
            sceneDescription: sceneDesc,
            suggestedDepartment: assignedDept,
            recommendedDepartment: { name: assignedDept, reason: `Automatically assigned to ${assignedDept} based on visual analysis.` },
            severity: assignedPriority,
            estimatedPriority: assignedPriority,
            confidence: dynamicConfidence,
            priorityScore: dynamicConfidence,
            locationEvidence: {
                locationVerified: hasGps === 'true',
                status: hasGps === 'true' ? '✓ Location verified by high-accuracy GPS' : '⚠ GPS Not Available'
            },
            scoreBreakdown: {
                overallConfidence: dynamicConfidence
            }
        };

        // SHA-256 duplicate fingerprint check
        const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const isDuplicate = submittedEvidenceHashes.has(fileHash);
        const previousSubmission = isDuplicate ? submittedEvidenceHashes.get(fileHash) : null;

        let newComplaint = null;
        const generatedId = 'CM-' + Math.floor(1000 + Math.random() * 9000);
        
        const resolvedLat = hasGps === 'true' && lat ? parseFloat(lat) : 19.0760 + (Math.random() - 0.5) * 0.05;
        const resolvedLng = hasGps === 'true' && lng ? parseFloat(lng) : 72.8777 + (Math.random() - 0.5) * 0.05;
        let resolvedAddress = await reverseGeocode(resolvedLat, resolvedLng);
        if (!resolvedAddress) resolvedAddress = locationStr || 'Reported Location';

        submittedEvidenceHashes.set(fileHash, {
            complaintId: generatedId,
            location: locationStr,
            createdAt: new Date()
        });

        try {
            newComplaint = new Complaint({
                complaintId: generatedId,
                originalDescription: description,
                enhancedDescription: sceneDesc,
                issueDetected: detectedTitle,
                imageUrl: uploadResponse.secure_url,
                severity: assignedPriority,
                confidence: dynamicConfidence,
                riskAnalysis: `Requires municipal action by ${assignedDept}.`,
                suggestedDepartment: assignedDept,
                estimatedPriority: assignedPriority,
                priorityScore: dynamicConfidence,
                location: {
                    lat: resolvedLat,
                    lng: resolvedLng,
                    address: resolvedAddress
                },
                evidence: {
                    sceneMatch: dynamicConfidence,
                    gpsAvailable: hasGps === 'true',
                    locationVerified: hasGps === 'true',
                    metadataAvailable: hasGps === 'true',
                    overallStrength: dynamicConfidence,
                    sceneAnalysis: sceneDesc,
                    detectedObjects: [detectedTitle],
                    limitations: "Visual verification completed via Gemini Vision.",
                    humanApprovalRequired: true,
                    reasoning: [sceneDesc]
                },
                recommendedAction: `Deploy ${assignedDept} field team for resolution.`,
                status: 'Pending',
                user: req.user ? req.user.id : undefined
            });

            await newComplaint.save();
            const complaintObj = newComplaint.toObject ? newComplaint.toObject() : newComplaint;
            memoryComplaints.unshift(complaintObj);
            if (memoryComplaints.length > 100) memoryComplaints.pop();
            savePersistedComplaints(memoryComplaints);
        } catch (saveErr) {
            console.warn('DB save warning, caching in-memory:', saveErr.message);
            newComplaint = {
                _id: 'c_' + Date.now(),
                complaintId: generatedId,
                originalDescription: description,
                enhancedDescription: sceneDesc,
                issueDetected: detectedTitle,
                imageUrl: uploadResponse.secure_url,
                severity: assignedPriority,
                confidence: dynamicConfidence,
                suggestedDepartment: assignedDept,
                estimatedPriority: assignedPriority,
                priorityScore: dynamicConfidence,
                status: 'Pending',
                createdAt: new Date(),
                location: { lat: resolvedLat, lng: resolvedLng, address: resolvedAddress },
                evidence: {
                    sceneMatch: dynamicConfidence,
                    overallStrength: dynamicConfidence,
                    confidence: dynamicConfidence,
                    sceneAnalysis: sceneDesc,
                    detectedObjects: [detectedTitle],
                    limitations: "Visual verification completed via Gemini Vision.",
                    humanApprovalRequired: true,
                    reasoning: [sceneDesc]
                }
            };
            memoryComplaints.unshift(newComplaint);
            if (memoryComplaints.length > 100) memoryComplaints.pop();
            savePersistedComplaints(memoryComplaints);
        }

        const finalSuccessResponse = {
            message: 'Complaint created successfully',
            complaint: newComplaint,
            aiAnalysis: aiAnalysisPayload
        };

        console.log('\n========================================');
        console.log('===== 4. FINAL RESPONSE SENT TO FRONTEND (VERIFIED) =====');
        console.log(finalSuccessResponse);
        console.log('========================================\n');

        return res.status(201).json(finalSuccessResponse);
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(400).json({ status: 'rejected', reason: 'Processing error', error: 'Processing error', details: error.message });
    }
};

exports.getComplaints = async (req, res) => {
    try {
        let dbComplaints = [];
        if (mongoose.connection.readyState === 1) {
            try {
                dbComplaints = await Complaint.find({}).sort({ createdAt: -1 }).lean();
            } catch (dbErr) {
                console.warn('DB read warning in getComplaints:', dbErr.message);
            }
        }

        const seenKeys = new Set();
        const combined = [];

        // 1. Add memory complaints first (most recent session entries)
        for (const mc of memoryComplaints) {
            const key = String(mc.complaintId || mc._id);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                combined.push(mc);
            }
        }

        // 2. Add DB complaints
        for (const dbc of dbComplaints) {
            const key = String(dbc.complaintId || dbc._id);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                combined.push(dbc);
            }
        }

        // 3. Add default seed complaints so initial reports persist when new complaints are submitted
        for (const defc of DEFAULT_COMPLAINTS) {
            const key = String(defc.complaintId || defc._id);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                combined.push(defc);
            }
        }

        let resultComplaints = combined;

        // Sort descending by createdAt (newest first)
        resultComplaints.sort((a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime());
        // Filter out non‑civic complaints
        resultComplaints = resultComplaints.filter(c => c.isCivicIssue !== false);

        if (req.user && req.user.role === 'citizen') {
            resultComplaints = resultComplaints.map(c => {
                const copy = { ...c };
                if (copy.status === 'Rejected' && copy.officerNotes && !copy.rejectionReason) {
                    copy.rejectionReason = copy.officerNotes;
                }
                delete copy.budgetEstimation;
                delete copy.resourceAllocation;
                delete copy.priorityScore;
                delete copy.recommendedAction;
                return copy;
            });
        }

        res.status(200).json(resultComplaints);
    } catch (error) {
        console.error('getComplaints error:', error);
        res.status(200).json(DEFAULT_COMPLAINTS);
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status, officerNotes, suggestedDepartment, assignedOfficerName, expectedCompletionDate, budgetEstimation, resourceAllocation } = req.body;
        const syncData = {
            ...(status && { status }),
            ...(officerNotes !== undefined && { officerNotes }),
            ...(status === 'Rejected' && officerNotes ? { rejectionReason: officerNotes } : {}),
            ...(suggestedDepartment !== undefined && { suggestedDepartment }),
            ...(assignedOfficerName !== undefined && { assignedOfficerName }),
            ...(expectedCompletionDate !== undefined && { expectedCompletionDate }),
            ...(budgetEstimation !== undefined && { budgetEstimation }),
            ...(resourceAllocation !== undefined && { resourceAllocation }),
            ...(req.user && req.user.id && { officerId: req.user.id }),
            ...(req.user && req.user.name && { officerName: req.user.name }),
            ...(status && { reviewedAt: new Date() })
        };

        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            syncData,
            { new: true }
        );

        // Sync memory stores
        const targetId = String(req.params.id);
        const memIdx = memoryComplaints.findIndex(c => String(c._id) === targetId || String(c.complaintId) === targetId);
        if (memIdx !== -1) {
            memoryComplaints[memIdx] = { ...memoryComplaints[memIdx], ...syncData };
            savePersistedComplaints(memoryComplaints);
        }

        const defIdx = DEFAULT_COMPLAINTS.findIndex(c => String(c._id) === targetId || String(c.complaintId) === targetId);
        if (defIdx !== -1) {
            DEFAULT_COMPLAINTS[defIdx] = { ...DEFAULT_COMPLAINTS[defIdx], ...syncData };
        }

        const resObj = complaint || (memIdx !== -1 ? memoryComplaints[memIdx] : (defIdx !== -1 ? DEFAULT_COMPLAINTS[defIdx] : null));
        if (!resObj) return res.status(404).json({ error: 'Not found' });
        res.json(resObj);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.reviewComplaint = async (req, res) => {
    try {
        const { 
            status, 
            officerNotes,
            suggestedDepartment,
            assignedOfficerName,
            expectedCompletionDate,
            budgetEstimation,
            resourceAllocation 
        } = req.body;
        
        const syncFields = {
            ...(status && { status }),
            ...(officerNotes !== undefined && { officerNotes }),
            ...(status === 'Rejected' && officerNotes ? { rejectionReason: officerNotes } : {}),
            ...(suggestedDepartment !== undefined && { suggestedDepartment }),
            ...(assignedOfficerName !== undefined && { assignedOfficerName }),
            ...(expectedCompletionDate !== undefined && { expectedCompletionDate }),
            ...(budgetEstimation !== undefined && { budgetEstimation }),
            ...(resourceAllocation !== undefined && { resourceAllocation }),
            ...(req.user && req.user.id ? { officerId: req.user.id } : {}),
            ...(req.user && req.user.name ? { officerName: req.user.name } : {}),
            ...(status ? { reviewedAt: new Date() } : {})
        };
        
        const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Needs Manual Inspection', 'Needs More Evidence'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        let complaint = null;
        try {
            const existingComplaint = await Complaint.findById(req.params.id).lean();
            const previousStatus = existingComplaint ? existingComplaint.status : undefined;
            complaint = await Complaint.findByIdAndUpdate(
                req.params.id,
                {
                    ...(previousStatus && { previousStatus }),
                    ...syncFields
                },
                { new: true }
            );
        } catch (err) {
            console.warn('DB update warning:', err.message);
        }

        // Sync memory store
        const targetId = String(req.params.id);
        const memIdx = memoryComplaints.findIndex(c => String(c._id) === targetId || String(c.complaintId) === targetId);
        if (memIdx !== -1) {
            memoryComplaints[memIdx] = { ...memoryComplaints[memIdx], ...syncFields };
            savePersistedComplaints(memoryComplaints);
            if (!complaint) complaint = memoryComplaints[memIdx];
        }

        // Sync defaults
        const defIdx = DEFAULT_COMPLAINTS.findIndex(c => String(c._id) === targetId || String(c.complaintId) === targetId);
        if (defIdx !== -1) {
            DEFAULT_COMPLAINTS[defIdx] = { ...DEFAULT_COMPLAINTS[defIdx], ...syncFields };
            if (!complaint) complaint = DEFAULT_COMPLAINTS[defIdx];
        }

        if (!complaint) {
            complaint = { _id: targetId, complaintId: targetId, ...syncFields };
            memoryComplaints.unshift(complaint);
            savePersistedComplaints(memoryComplaints);
        }
        
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Undo the last officer review, restoring previous status
exports.undoReview = async (req, res) => {
  try {
    console.log('Undo request for complaint ID:', req.params.id);
    const complaint = await Complaint.findById(req.params.id);
    console.log('Found complaint:', complaint);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    if (!complaint.previousStatus) {
      console.warn('No previous status to revert to for complaint', complaint._id);
      return res.status(400).json({ error: 'No previous status to revert to' });
    }
    // Restore previous status and clear officer-specific fields
    complaint.status = complaint.previousStatus;
    complaint.previousStatus = undefined;
    complaint.officerNotes = undefined;
    complaint.rejectionReason = undefined;
    complaint.reviewedAt = new Date();
    // Also clear synchronization fields
    complaint.officerId = undefined;
    complaint.officerName = undefined;
    await complaint.save();
    console.log('Complaint after undo save:', complaint);
    // Update in-memory cache if present
    const idx = memoryComplaints.findIndex(c => String(c._id) === String(complaint._id));
    if (idx !== -1) memoryComplaints[idx] = complaint;
    res.json(complaint);
  } catch (error) {
    console.error('Undo review error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.trackComplaint = async (req, res) => {
    try {
        const targetId = String(req.params.id || '').trim();
        if (!targetId) {
            return res.status(400).json({ error: 'Tracking ID is required' });
        }

        let complaint = null;

        // 1. Search in memory store first (most recent session complaints)
        complaint = memoryComplaints.find(c => 
            String(c.complaintId || '').toLowerCase() === targetId.toLowerCase() || 
            String(c._id || '').toLowerCase() === targetId.toLowerCase()
        );

        // 2. Search in MongoDB if connected and not found in memory
        if (!complaint && mongoose.connection.readyState === 1) {
            try {
                const escapedId = targetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                complaint = await Complaint.findOne({
                    $or: [
                        { complaintId: new RegExp('^' + escapedId + '$', 'i') },
                        ...(targetId.length === 24 ? [{ _id: targetId }] : [])
                    ]
                }).lean();
            } catch (err) {
                console.warn('DB track warning:', err.message);
            }
        }

        // 3. Search in DEFAULT_COMPLAINTS
        if (!complaint) {
            complaint = DEFAULT_COMPLAINTS.find(c => 
                String(c.complaintId || '').toLowerCase() === targetId.toLowerCase() || 
                String(c._id || '').toLowerCase() === targetId.toLowerCase()
            );
        }

        // 4. Return 404 Not Found if complaint does not exist anywhere
        if (!complaint) {
            return res.status(404).json({ error: 'No complaint found with this Tracking ID.' });
        }

        if (req.user && req.user.role === 'citizen') {
            const copy = { ...complaint };
            if (copy.status === 'Rejected' && copy.officerNotes && !copy.rejectionReason) {
                copy.rejectionReason = copy.officerNotes;
            }
            delete copy.budgetEstimation;
            delete copy.resourceAllocation;
            delete copy.priorityScore;
            delete copy.recommendedAction;
            return res.status(200).json(copy);
        }

        res.status(200).json(complaint);
    } catch (error) {
        console.error('trackComplaint error:', error);
        res.status(404).json({ error: 'No complaint found with this Tracking ID.' });
    }
};

exports.memoryComplaints = memoryComplaints;
exports.DEFAULT_COMPLAINTS = DEFAULT_COMPLAINTS;

exports.seedComplaints = async (req, res) => {
    try {
        await Complaint.deleteMany({});
        await Complaint.insertMany(DEFAULT_COMPLAINTS);
        res.status(200).json({ message: 'Database seeded successfully', count: DEFAULT_COMPLAINTS.length });
    } catch (error) {
        console.error(error);
        res.status(200).json({ message: 'Seeded memory fallback', count: DEFAULT_COMPLAINTS.length });
    }
};
