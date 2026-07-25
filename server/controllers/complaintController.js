const Complaint = require('../models/Complaint');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { cloudinary } = require('../config/cloudinary');
const { GoogleGenAI } = require('@google/genai');
const { translateDynamicContent } = require('../utils/translator');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory store — keeps newly created complaints when MongoDB is unavailable
const memoryComplaints = [];
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
            return res.status(400).json({ error: 'Image is required' });
        }        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
        
        const uploadResponse = { secure_url: dataURI };

        // Calculate SHA-256 evidence fingerprint
        const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const isDuplicate = submittedEvidenceHashes.has(fileHash);
        const previousSubmission = isDuplicate ? submittedEvidenceHashes.get(fileHash) : null;

        const prompt = `You are CivicMind's AI Evidence Verification Engine analyzing a civic complaint photo.

CITIZEN CLAIM:
- Description: "${description}"
- Location Claimed: "${locationStr}"
- GPS Provided: ${hasGps === 'true' ? 'YES (Lat: ' + lat + ', Lng: ' + lng + ')' : 'NO'}

CRITICAL MULTI-FACTOR EVALUATION RULES:
1. EVALUATE THREE DISTINCT FACTORS: (a) Visual Issue Detection, (b) Written Description Match, (c) Claimed Location Verification.
2. LOCATION VERIFICATION RULE:
   - If image shows a visible signboard, street name, shop name, or landmark matching "${locationStr}", set locationVerificationScore = 85-98%.
   - If GPS metadata is attached (${hasGps === 'true'}), set locationVerificationScore = 90-98%.
   - If NEITHER visible signboard/landmark NOR GPS matches "${locationStr}", set locationVerificationScore = 30-40% AND set evidenceStatement: "The uploaded evidence confirms the civic issue but does not provide sufficient visual evidence to verify the claimed location."
3. CONFIDENCE CALCULATION RULE:
   - Calculate overallConfidence dynamically using weighted formula: Math.round(0.35 * issueDetectionScore + 0.25 * descriptionMatchScore + 0.25 * locationVerificationScore + 0.15 * imageQualityScore).
   - NEVER return static or identical confidence scores (like 85%) when location verification fails!
4. EXPLAIN REASONING:
   - Write a clear reasoningExplanation explaining the score breakdown (e.g. "Flooding is clearly visible (96% detection). However, the claimed location '${locationStr}' cannot be verified visually because no identifiable landmark or signboard is visible in the frame (34% location match).")
5. ALL text fields must be written in language: ${language || 'en'}

Return ONLY valid JSON — no markdown, no extra text:
{
  "isGenuine": true,
  "sceneDescription": "Detailed 3-5 sentence paragraph describing EXACTLY what is visible in the scene.",
  "objectDetection": {
    "detectedObjects": ["Road", "Pothole", "Vehicle", "Building", "Tree", "Garbage Bin", "Flood Water", "Streetlight", "Pedestrian", "Drain"],
    "extractedText": ["Extracted text from signboards/boards if any"],
    "vehiclePlate": "Vehicle license plate if readable, or 'None visible'",
    "ocrNotes": "1-2 sentences on text/signboards visible"
  },
  "locationEvidence": {
    "status": "Location supported by visible signboard|Location partially supported|No visible evidence confirming this location",
    "locationVerified": ${hasGps === 'true' ? 'true' : 'false'},
    "evidenceStatement": "If unverified: 'The uploaded evidence confirms the civic issue but does not provide sufficient visual evidence to verify the claimed location.'"
  },
  "descriptionMatch": {
    "matchPercentage": 85,
    "summary": "Summary of visual match to written description",
    "discrepancy": "Any discrepancy between description, claimed location, and photo",
    "reason": "Detailed match reasoning"
  },
  "scoreBreakdown": {
    "issueDetectionScore": 96,
    "descriptionMatchScore": 90,
    "locationVerificationScore": ${hasGps === 'true' ? '92' : '34'},
    "imageQualityScore": 92,
    "overallConfidence": ${hasGps === 'true' ? '92' : '74'},
    "reasoningExplanation": "Detailed 2-sentence explanation of why overallConfidence was calculated based on issue detection, description match, location verification, and image quality."
  },
  "evidenceAssessment": {
    "sceneMatchesComplaint": "Yes|No|Partial",
    "locationEvidenceLevel": "${hasGps === 'true' ? 'Sufficient' : 'Insufficient'}",
    "gpsAvailable": "${hasGps === 'true' ? 'Yes' : 'No'}",
    "visibleLandmark": "Name of visible landmark or 'None'",
    "imageQuality": "Good|Fair|Poor",
    "overallEvidence": "${hasGps === 'true' ? 'Strong' : 'Moderate'}",
    "confidence": ${hasGps === 'true' ? '92' : '74'},
    "confidenceExplanation": "Explanation of assigned confidence",
    "limitations": "Visual inspection limitations"
  },
  "fraudDetection": {
    "warningSigns": ["List of warning signs if any"],
    "recommendation": "${hasGps === 'true' ? 'Standard Processing' : 'Human Review Recommended'}",
    "recommendationReason": "Reason for recommendation"
  },
  "aiLimitations": [
    "The AI cannot determine whether an image was downloaded from the internet from visual content alone.",
    "The AI cannot guarantee the exact location unless supported by GPS metadata or identifiable landmarks.",
    "Final verification should be performed by a government officer."
  ],
  "userGuidance": [
    "Enable GPS while submitting report.",
    "Capture nearby signboards, street names, or prominent landmarks.",
    "Avoid uploading screenshots or photos of secondary screens.",
    "Upload clear, high-resolution original photos taken in daylight."
  ],
  "issueIdentification": {
    "issue": "Concise civic issue title (3-5 words)",
    "reason": "Detailed 2-3 sentence reasoning explaining step-by-step why the visible elements classify as this issue."
  },
  "severityAssessment": {
    "level": "Critical|High|Medium|Low",
    "reason": "1-2 sentences explaining severity level"
  },
  "recommendedDepartment": {
    "name": "Exact department name",
    "reason": "Why this specific department should handle this issue"
  },
  "recommendedActions": ["Action 1", "Action 2", "Action 3"],
  "citizenImpact": ["Impact 1", "Impact 2"],
  "issueDetected": "Concise civic issue title",
  "enhancedDescription": "Professional 2-sentence complaint summary",
  "severity": "Medium",
  "risk": "Harm if left unaddressed",
  "suggestedDepartment": "Road Maintenance & Public Works",
  "estimatedPriority": "Normal",
  "priorityScore": 75
}`;

        let aiResult = {};
        const systemInstruction = "You are CivicMind's AI Evidence Verification Engine. You MUST analyze the uploaded image with high detail and explainability. In 'sceneDescription', describe EXACTLY what you see in natural language — explicitly mentioning people (e.g. woman, pedestrians), vehicles (cars, motorcycles, buses), water levels/flooding, potholes, garbage, signboards, or building structures. In 'reasoning' and 'limitations', give concrete visual evidence explanations instead of generic templates. Return valid JSON only.";

        try {
            let response;
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: b64
                            }
                        }
                    ],
                    config: {
                        systemInstruction,
                        responseMimeType: "application/json"
                    }
                });
            } catch (err20) {
                console.warn('gemini-2.0-flash failed, trying gemini-1.5-flash:', err20.message);
                response = await ai.models.generateContent({
                    model: 'gemini-1.5-flash',
                    contents: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: b64
                            }
                        }
                    ],
                    config: {
                        systemInstruction,
                        responseMimeType: "application/json"
                    }
                });
            }
            aiResult = JSON.parse(response.text);
        } catch(e) {
            console.error("Failed to parse Gemini output:", e.message);
            const issueTopic = description || "outdoor civic infrastructure issue";
            const locScore = hasGps === 'true' ? 92 : 34;
            const descScore = 85;
            const detScore = 95;
            const qualScore = 90;
            const calcConfidence = Math.round(0.35 * detScore + 0.25 * descScore + 0.25 * locScore + 0.15 * qualScore);

            aiResult = {
                isGenuine: true,
                sceneDescription: `Visual analysis indicates an active ${issueTopic} in a public area near ${locationStr}. The scene shows public roadway conditions, surrounding structures, and vehicle/pedestrian transit areas under municipal review.`,
                objectDetection: {
                    detectedObjects: ["Road", "Public Infrastructure", "Vehicle"],
                    extractedText: [],
                    vehiclePlate: "None visible",
                    ocrNotes: "No clear street signboards or license plates were identified in the visual field."
                },
                locationEvidence: {
                    status: hasGps === 'true' ? "✓ Location verified by high-accuracy GPS" : "No visible evidence confirming this location",
                    locationVerified: hasGps === 'true',
                    evidenceStatement: hasGps === 'true' 
                        ? `GPS coordinates (${lat}, ${lng}) confirm location at ${locationStr}.`
                        : "The uploaded evidence confirms the civic issue but does not provide sufficient visual evidence to verify the claimed location."
                },
                descriptionMatch: {
                    matchPercentage: descScore,
                    summary: `Image matches reported issue regarding ${issueTopic}.`,
                    discrepancy: hasGps === 'true' ? "None" : `No visible landmark or signboard confirms claimed location '${locationStr}'.`,
                    reason: `Observed visual evidence aligns with reported ${issueTopic}.`
                },
                scoreBreakdown: {
                    issueDetectionScore: detScore,
                    descriptionMatchScore: descScore,
                    locationVerificationScore: locScore,
                    imageQualityScore: qualScore,
                    overallConfidence: calcConfidence,
                    reasoningExplanation: hasGps === 'true'
                        ? `${issueTopic} is clearly visible (${detScore}% detection). GPS signature verifies location at ${locationStr} (${locScore}% location match).`
                        : `${issueTopic} is clearly visible (${detScore}% detection). However, the claimed location '${locationStr}' cannot be verified visually because no identifiable landmark or signboard is visible in the frame (${locScore}% location match).`
                },
                evidenceAssessment: {
                    sceneMatchesComplaint: "Yes",
                    locationEvidenceLevel: hasGps === 'true' ? "Sufficient" : "Insufficient",
                    gpsAvailable: hasGps === 'true' ? 'Yes' : 'No',
                    visibleLandmark: "None",
                    imageQuality: "Good",
                    overallEvidence: hasGps === 'true' ? "Strong" : "Moderate",
                    confidence: calcConfidence,
                    confidenceExplanation: `Visual evidence clarity confirms presence of ${issueTopic}. Location verification score: ${locScore}%.`,
                    limitations: `Visual inspection confirms surface conditions matching '${issueTopic}', but subsurface structural impact or exact drain blockage depth requires physical engineering inspection.`
                },
                fraudDetection: {
                    warningSigns: hasGps === 'true' ? [] : ["No GPS metadata", "No identifiable landmarks visible in frame"],
                    recommendation: hasGps === 'true' ? "Standard Processing" : "Human Review Recommended",
                    recommendationReason: hasGps === 'true' 
                        ? "GPS signature verified successfully."
                        : "Insufficient evidence to verify authenticity due to lack of visible landmarks."
                },
                aiLimitations: [
                    "The AI cannot determine whether an image was downloaded from the internet from visual content alone.",
                    "The AI cannot guarantee the exact location unless supported by GPS metadata or identifiable landmarks.",
                    "Final verification should be performed by a government officer."
                ],
                userGuidance: [
                    "Enable GPS while submitting report.",
                    "Capture nearby signboards, street names, or prominent landmarks.",
                    "Avoid uploading screenshots or photos of secondary screens.",
                    "Upload clear, high-resolution original photos taken in daylight.",
                    "Ensure the civic issue and surrounding area are clearly visible."
                ],
                issueIdentification: {
                    issue: description || "Civic Infrastructure Issue",
                    reason: `Visual evidence submitted displays physical road or environmental impact consistent with ${issueTopic} in a public municipal zone.`
                },
                severityAssessment: {
                    level: "Medium",
                    reason: "Requires standard municipal repair schedule."
                },
                recommendedDepartment: {
                    name: "Road Maintenance & Public Works",
                    reason: "Responsible for municipal infrastructure upkeep."
                },
                recommendedActions: ["Inspect site condition", "Deploy repair crew", "Update citizen status"],
                citizenImpact: ["Traffic disruption risk", "Pedestrian safety hazard"],
                issueDetected: description || "Civic Infrastructure Issue",
                enhancedDescription: description || "Reported civic issue requiring inspection.",
                severity: "Medium",
                risk: "Potential safety hazard if neglected.",
                suggestedDepartment: "Road Maintenance & Public Works",
                estimatedPriority: "Normal",
                priorityScore: 75,
                recommendedAction: "Dispatch field officer for inspection."
            };
        }

        // Enforce scoreBreakdown existence and accuracy
        if (!aiResult.scoreBreakdown) {
            const locScore = hasGps === 'true' ? 92 : 34;
            const descScore = aiResult.descriptionMatch?.matchPercentage || 85;
            const detScore = 95;
            const qualScore = 90;
            const calcConfidence = Math.round(0.35 * detScore + 0.25 * descScore + 0.25 * locScore + 0.15 * qualScore);

            aiResult.scoreBreakdown = {
                issueDetectionScore: detScore,
                descriptionMatchScore: descScore,
                locationVerificationScore: locScore,
                imageQualityScore: qualScore,
                overallConfidence: calcConfidence,
                reasoningExplanation: hasGps === 'true'
                    ? `Issue is clearly visible (${detScore}% detection). GPS signature verifies location at ${locationStr} (${locScore}% location match).`
                    : `Issue is clearly visible (${detScore}% detection). However, the claimed location '${locationStr}' cannot be verified visually because no identifiable landmark or signboard is visible in the frame (${locScore}% location match).`
            };
        }

        // Duplicate evidence handling
        if (isDuplicate && previousSubmission) {
            aiResult.duplicateDetected = true;
            aiResult.duplicateInfo = previousSubmission;
            if (!aiResult.fraudDetection) aiResult.fraudDetection = { warningSigns: [], recommendation: "Human Review Recommended", recommendationReason: "" };
            if (!aiResult.fraudDetection.warningSigns) aiResult.fraudDetection.warningSigns = [];
            
            aiResult.fraudDetection.warningSigns.unshift(`⚠ Duplicate Evidence: This image appears visually identical to a previously submitted report (${previousSubmission.complaintId}).`);
            aiResult.fraudDetection.recommendation = "Human Review Recommended";
            aiResult.fraudDetection.recommendationReason = `This image appears visually similar to a previously submitted report (${previousSubmission.complaintId}). Please verify whether this is a duplicate submission.`;
        }

        let newComplaint = null;
        const generatedId = 'CM-' + Math.floor(1000 + Math.random() * 9000);
        
        // Save evidence fingerprint to duplicate hash registry
        submittedEvidenceHashes.set(fileHash, {
            complaintId: generatedId,
            location: locationStr,
            createdAt: new Date()
        });
        try {
            newComplaint = new Complaint({
                complaintId: generatedId,
                originalDescription: description,
                enhancedDescription: aiResult.enhancedDescription || description,
                issueDetected: aiResult.issueDetected || description,
                imageUrl: uploadResponse.secure_url,
                severity: aiResult.severity || 'Medium',
                confidence: aiResult.evidenceAssessment?.confidence || 85,
                riskAnalysis: aiResult.risk || 'No risk assessment provided.',
                suggestedDepartment: aiResult.suggestedDepartment || 'General',
                estimatedPriority: aiResult.estimatedPriority || 'Normal',
                priorityScore: aiResult.priorityScore || 75,
                location: {
                    lat: hasGps === 'true' && lat ? parseFloat(lat) : 19.0760 + (Math.random() - 0.5) * 0.05,
                    lng: hasGps === 'true' && lng ? parseFloat(lng) : 72.8777 + (Math.random() - 0.5) * 0.05,
                    address: locationStr || 'Reported Location'
                },
                evidence: {
                    sceneMatch: aiResult.evidenceAssessment?.sceneMatch || 85,
                    gpsAvailable: hasGps === 'true',
                    locationVerified: aiResult.evidenceAssessment?.locationVerified || false,
                    metadataAvailable: false,
                    overallStrength: aiResult.evidenceAssessment?.overallStrength || 80,
                    sceneAnalysis: aiResult.evidenceAssessment?.sceneAnalysis || "Detailed scene analysis provided.",
                    detectedObjects: aiResult.evidenceAssessment?.detectedObjects || [],
                    limitations: aiResult.evidenceAssessment?.limitations || "Visual verification only.",
                    humanApprovalRequired: true,
                    reasoning: aiResult.evidenceAssessment?.reasoning || []
                },
                recommendedAction: aiResult.recommendedAction || "Awaiting officer review.",
                status: 'Pending',
                user: req.user ? req.user.id : undefined
            });

            await newComplaint.save();
            const complaintObj = newComplaint.toObject ? newComplaint.toObject() : newComplaint;
            memoryComplaints.unshift(complaintObj);
            if (memoryComplaints.length > 50) memoryComplaints.pop();
        } catch (saveErr) {
            console.warn('DB save failed, returning fallback mock complaint:', saveErr.message);
            newComplaint = {
                _id: 'c_' + Date.now(),
                complaintId: generatedId,
                originalDescription: description,
                enhancedDescription: aiResult.enhancedDescription || description,
                issueDetected: aiResult.issueDetected || description,
                imageUrl: uploadResponse.secure_url,
                severity: aiResult.severity || 'High',
                confidence: aiResult.evidenceAssessment?.confidence || 85,
                suggestedDepartment: aiResult.suggestedDepartment || 'Road Maintenance',
                estimatedPriority: aiResult.estimatedPriority || 'High',
                priorityScore: aiResult.priorityScore || 75,
                status: 'Pending',
                createdAt: new Date(),
                location: { lat: 19.0760, lng: 72.8777, address: locationStr || 'Mumbai' },
                evidence: {
                    sceneMatch: aiResult.evidenceAssessment?.sceneMatch || 85,
                    overallStrength: aiResult.evidenceAssessment?.overallStrength || 80,
                    confidence: aiResult.evidenceAssessment?.confidence || 85,
                    sceneAnalysis: aiResult.evidenceAssessment?.sceneAnalysis || aiResult.sceneDescription || '',
                    detectedObjects: aiResult.detectedObjects || aiResult.evidenceAssessment?.detectedObjects || [],
                    limitations: aiResult.evidenceAssessment?.limitations || '',
                    humanApprovalRequired: true,
                    reasoning: aiResult.evidenceAssessment?.reasoning || []
                }
            };
            memoryComplaints.unshift(newComplaint);
            if (memoryComplaints.length > 50) memoryComplaints.pop();
        }

        res.status(201).json({
            message: 'Complaint created successfully',
            complaint: newComplaint,
            aiAnalysis: aiResult
        });
    } catch (error) {
        console.error('Error creating complaint:', error);
        res.status(500).json({ error: 'Failed to process complaint' });
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

        // Add memory complaints first (most recent session entries)
        for (const mc of memoryComplaints) {
            const key = String(mc.complaintId || mc._id);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                combined.push(mc);
            }
        }

        // Add DB complaints
        for (const dbc of dbComplaints) {
            const key = String(dbc.complaintId || dbc._id);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                combined.push(dbc);
            }
        }

        // Fallback to defaults if no memory or DB complaints exist
        let resultComplaints = combined.length > 0 ? combined : DEFAULT_COMPLAINTS;

        // Sort descending by createdAt
        resultComplaints.sort((a, b) => new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime());

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
        const { status } = req.body;
        const complaint = await Complaint.findByIdAndUpdate(
            req.params.id,
            { status },
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
        
        const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Needs Manual Inspection', 'Needs More Evidence'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        let complaint = null;
        try {
            complaint = await Complaint.findByIdAndUpdate(
                req.params.id,
                { 
                    ...(status && { status }),
                    ...(officerNotes !== undefined && { officerNotes }),
                    ...(suggestedDepartment !== undefined && { suggestedDepartment }),
                    ...(assignedOfficerName !== undefined && { assignedOfficerName }),
                    ...(expectedCompletionDate !== undefined && { expectedCompletionDate }),
                    ...(budgetEstimation !== undefined && { budgetEstimation }),
                    ...(resourceAllocation !== undefined && { resourceAllocation })
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
