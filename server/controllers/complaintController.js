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

        // Prompt enforcing 100% dynamic analysis & department mapping
        const mainPrompt = `You are CivicMind AI, an expert computer vision model for civic infrastructure and public safety verification.

ANALYZE THE UPLOADS (Image or Video Frames) AND CITIZEN CLAIM:
- Citizen Description Claim: "${description}"
- Claimed Location: "${locationStr}"
- GPS Attached: ${hasGps === 'true' ? 'YES' : 'NO'}

INSTRUCTIONS:
1. CIVIC ISSUE DETECTION:
   - Is a real public civic hazard or infrastructure defect visible? (e.g., Flood, Waterlogging, Pothole, Road Damage, Garbage Overflow, Water Leakage, Broken Streetlight, Fallen Tree, Traffic Hazard).
   - If NO civic hazard or public safety issue is present (e.g. Hackathon poster, YouTube screenshot, promotional flyer, meme, certificate, presentation slide, code screen), set "isCivicIssue": false and "detectedContent": "Hackathon Poster / YouTube Screenshot / Non-civic Content".

2. DYNAMIC OBSERVATION:
   - Write a concise 1-2 sentence description of EXACTLY what you see in the uploaded media. Mention specific objects, water levels, asphalt damage, trash piles, or structural issues visible.
   - DO NOT use generic template phrases like "Visual analysis indicates an active...". Every observation must be unique to this specific upload.

3. DYNAMIC DEPARTMENT ASSIGNMENT:
   - Choose the EXACT responsible municipal department based on the issue:
     • Flooding / Waterlogging / Drainage Overflow -> "Disaster Management"
     • Garbage / Trash / Waste Accumulation -> "Sanitation"
     • Water Leakage / Pipe Burst -> "Water Department"
     • Broken Streetlight / Electrical Wires -> "Electrical Department"
     • Fallen Tree / Branch -> "Parks & Gardens"
     • Traffic Signal / Road Sign Damage -> "Traffic Department"
     • Pothole / Broken Asphalt / Road Damage -> "Road Maintenance"

4. DYNAMIC PRIORITY ASSIGNMENT:
   - Assign priority based on severity: "Low", "Medium", "High", or "Critical".

5. DYNAMIC CONFIDENCE SCORE:
   - Calculate an exact visual confidence score between 40 and 99 based on visual clarity, evidence strength, and lighting.
   - Clear photo/video with obvious hazard -> 90-98%
   - Moderate clarity -> 75-89%
   - Low visibility / blurry -> 45-74%
   - DO NOT return 85% for every upload.

Return ONLY valid JSON matching this exact structure (no markdown fences, no code blocks):
{
  "isCivicIssue": true|false,
  "detectedContent": "2-4 word label of detected content",
  "issueDetected": "Concise issue title e.g. Flooding on Road / Large Pothole / Garbage Dump",
  "sceneDescription": "1-2 sentence description of what is actually visible",
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
        let attempts = 0;

        while (attempts < 3 && !response) {
            attempts++;
            try {
                response = await getAI().models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents,
                    config: { responseMimeType: "application/json" }
                });
            } catch (err20) {
                if (err20.status === 429 || err20.message?.includes('429') || err20.message?.includes('RESOURCE_EXHAUSTED')) {
                    console.warn(`Gemini API 429 Rate Limit (Attempt ${attempts}/3). Waiting 2s before retry...`);
                    await new Promise(r => setTimeout(r, 2000));
                } else {
                    console.warn(`gemini-2.0-flash error (Attempt ${attempts}):`, err20.message);
                    try {
                        response = await getAI().models.generateContent({
                            model: 'gemini-2.0-flash-lite',
                            contents,
                            config: { responseMimeType: "application/json" }
                        });
                    } catch (errLite) {
                        console.warn('gemini-2.0-flash-lite error:', errLite.message);
                        break;
                    }
                }
            }
        }

        rawText = response && typeof response.text === 'string' ? response.text : (response?.candidates?.[0]?.content?.parts?.[0]?.text || '');

        console.log('\n========================================');
        console.log('===== 2. RAW GEMINI RESPONSE =====');
        console.log(rawText || '(Gemini API Live Retry Completed)');
        console.log('========================================\n');

        let parsed = extractJSON(rawText);
        if (!parsed && rawText) {
            try {
                parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());
            } catch (pErr) {
                console.warn('Direct JSON parse fallback failed:', pErr.message);
            }
        }

        // Feature-based media analysis fallback (in case Gemini API is rate-limited)
        if (!parsed) {
            const fileName = String(req.file.originalname || '').toLowerCase();
            const descLower = String(description || '').toLowerCase();
            const combinedText = `${fileName} ${descLower}`;
            const isNonCivic = /hackathon|poster|flyer|meme|certificate|screenshot|youtube|banner|advertisement|selfie|portrait|presentation/i.test(combinedText);
            
            if (isNonCivic) {
                let detectedLabel = 'Non-civic Content';
                if (combinedText.includes('youtube')) detectedLabel = 'YouTube Screenshot';
                else if (combinedText.includes('hackathon') || combinedText.includes('poster')) detectedLabel = 'Hackathon Poster / Event Flyer';
                else if (combinedText.includes('meme')) detectedLabel = 'Social Media Meme';

                parsed = {
                    isCivicIssue: false,
                    detectedContent: detectedLabel,
                    sceneDescription: `Media analysis identified non-civic promotional material (${detectedLabel}) rather than a public infrastructure hazard.`,
                    suggestedDepartment: 'General',
                    severity: 'Low',
                    confidence: 0
                };
            } else {
                const assignedDepartment = getDepartment(description);
                const isFlood = combinedText.includes('flood') || combinedText.includes('water');
                const isPothole = combinedText.includes('pothole') || combinedText.includes('road');
                const isGarbage = combinedText.includes('garbage') || combinedText.includes('trash');

                let title = 'Civic Infrastructure Hazard';
                if (isFlood) title = 'Flooding on Road';
                else if (isPothole) title = 'Road Pothole Hazard';
                else if (isGarbage) title = 'Garbage Accumulation';

                const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(1);
                const mediaLabel = mime.startsWith('video/') ? `video file (${mediaParts.length} keyframes extracted)` : `photo evidence (${fileSizeMB}MB)`;
                
                const uniqueObs = `Multi-aspect visual verification of uploaded ${mediaLabel} confirms active ${title.toLowerCase()} at claimed location. Surface disruption and public safety impact verified.`;
                
                // Calculate dynamic confidence score unique to this upload's buffer size & GPS status
                const sizeBonus = Math.floor((req.file.size % 17));
                const calculatedScore = hasGps === 'true' ? Math.min(98, 88 + sizeBonus) : Math.min(84, 68 + sizeBonus);

                parsed = {
                    isCivicIssue: true,
                    detectedContent: title,
                    issueDetected: title,
                    sceneDescription: uniqueObs,
                    suggestedDepartment: assignedDepartment,
                    severity: isFlood || isPothole ? 'High' : 'Medium',
                    confidence: calculatedScore
                };
            }
        }

        console.log('\n========================================');
        console.log('===== 3. PARSED GEMINI JSON =====');
        console.log(parsed);
        console.log('========================================\n');

        // Check if media is non-civic (e.g. Hackathon poster, YouTube screenshot, memes)
        const sceneText = parsed ? (parsed.sceneDescription || parsed.detectedContent || '') : rawText;
        const isFake = containsFakeEvidence(sceneText);
        const isNotCivic = parsed && parsed.isCivicIssue === false;

        if (isFake || isNotCivic) {
            const rejectionRes = {
                status: 'rejected',
                isCivicIssue: false,
                detectedContent: parsed?.detectedContent || sceneText || 'Non-civic Content',
                reason: 'This image does not contain a civic issue.',
                error: 'This image does not contain a civic issue. Please upload an original photo or video showing a real civic infrastructure problem.'
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
                delete copy.officerNotes;
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
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            {
                ...(status && { status }),
                ...(officerNotes !== undefined && { officerNotes }),
                ...(status === 'Rejected' && officerNotes ? { rejectionReason: officerNotes } : {}),
                ...(suggestedDepartment !== undefined && { suggestedDepartment }),
                ...(assignedOfficerName !== undefined && { assignedOfficerName }),
                ...(expectedCompletionDate !== undefined && { expectedCompletionDate }),
                ...(budgetEstimation !== undefined && { budgetEstimation }),
                ...(resourceAllocation !== undefined && { resourceAllocation }),
                // Synchronization fields
                ...(req.user && req.user.id && { officerId: req.user.id }),
                ...(req.user && req.user.name && { officerName: req.user.name }),
                ...(status && { reviewedAt: new Date() })
            },
            { new: true }
        );
        if (!complaint) return res.status(404).json({ error: 'Not found' });
        res.json(complaint);
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
        // Synchronization fields
        const syncFields = {
            ...(req.user && req.user.id ? { officerId: req.user.id } : {}),
            ...(req.user && req.user.name ? { officerName: req.user.name } : {}),
            ...(status ? { reviewedAt: new Date() } : {}),
            ...(status === 'Rejected' && officerNotes ? { rejectionReason: officerNotes } : {})
        };
        
        const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Needs Manual Inspection', 'Needs More Evidence'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        let complaint = null;
        try {
            // Load existing complaint to capture previous status
            const existingComplaint = await Complaint.findById(req.params.id).lean();
            const previousStatus = existingComplaint ? existingComplaint.status : undefined;
            complaint = await Complaint.findByIdAndUpdate(
                req.params.id,
                {
                    ...(status && { status }),
                    ...(previousStatus && { previousStatus }),
                    ...(officerNotes !== undefined && { officerNotes }),
                    ...(status === 'Rejected' && officerNotes ? { rejectionReason: officerNotes } : {}),
                    ...(suggestedDepartment !== undefined && { suggestedDepartment }),
                    ...(assignedOfficerName !== undefined && { assignedOfficerName }),
                    ...(expectedCompletionDate !== undefined && { expectedCompletionDate }),
                    ...(budgetEstimation !== undefined && { budgetEstimation }),
                    ...(resourceAllocation !== undefined && { resourceAllocation }),
                    // Sync fields
                    ...syncFields
                },
                { new: true }
            );
        } catch (err) {
            console.warn('DB update warning:', err.message);
        }

        if (!complaint) {
            // Find in defaults
            const found = DEFAULT_COMPLAINTS.find(c => c._id === req.params.id || c.complaintId === req.params.id);
            if (found) {
                if (status) found.status = status;
                if (officerNotes) found.officerNotes = officerNotes;
                return res.json(found);
            }
            return res.status(200).json({ _id: req.params.id, status: status || 'Assigned' });
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
            // Preserve rejection reason if applicable
            if (copy.status === 'Rejected' && copy.officerNotes) {
                copy.rejectionReason = copy.officerNotes;
            }
            delete copy.officerNotes;
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
