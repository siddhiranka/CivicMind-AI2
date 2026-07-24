const Complaint = require('../models/Complaint');
const { cloudinary } = require('../config/cloudinary');
const { GoogleGenAI } = require('@google/genai');
const { translateDynamicContent } = require('../utils/translator');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.createComplaint = async (req, res) => {
    try {
        const { description, locationStr, hasGps, lat, lng, language } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // 1. Convert to Base64 URI (Bypassing Cloudinary for MVP)
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;
        
        const uploadResponse = { secure_url: dataURI };

        // 2. Analyze with Gemini Vision
        const prompt = `Analyze this image in the context of community infrastructure and safety. 
        The user described the issue as: "${description}".
        The user claimed this is located at: "${locationStr}".
        User GPS Data Provided: ${hasGps === 'true' ? 'YES (Lat: ' + lat + ', Lng: ' + lng + ')' : 'NO'}.
        
        CRITICAL TASK: Act as a Responsible Enterprise Decision Intelligence AI. 
        You must perform a strict AI Evidence Assessment. Do not blindly trust the user.
        Always return structured data for all required fields. If information cannot be determined visually, EXPLICITLY STATE WHY instead of leaving fields blank.
        NEVER return "Analysis unavailable" or "No limitations specified". Be descriptive.
        If the image does not show clear evidence of an issue, or is unrelated to infrastructure/safety, set "isGenuine" to false and provide a helpful explanation in "limitations" or "reasoning" (e.g., "The AI could not identify clear evidence of an issue in this image.").
        
        Return a strict JSON object with the following structure:
        {
            "isGenuine": true, // false if image does not show a clear civic issue
            "evidenceAssessment": {
                "sceneMatch": 95, // 0-100 score of how well image matches description
                "locationVerified": false, // boolean, can you visually confirm it's the exact claimed location?
                "confidence": 90, // 0-100 score of your visual analysis confidence
                "overallStrength": 85, // 0-100 aggregate evidence score
                "sceneAnalysis": "The uploaded image appears consistent with flooding in an urban residential area...", // Must be descriptive, never blank
                "detectedObjects": ["water", "submerged vehicles", "debris"],
                "limitations": "The exact location cannot be verified from visual evidence alone. Depth of water cannot be accurately determined.", // Must state what you CANNOT see clearly
                "humanApprovalRequired": true,
                "reasoning": [
                    "Water accumulation detected.",
                    "Buildings appear flooded."
                ]
            },
            "issueDetected": "Short title of the issue",
            "enhancedDescription": "A professional, detailed complaint description.",
            "severity": "Low, Medium, High, or Critical",
            "risk": "Short description of potential consequences",
            "suggestedDepartment": "e.g., Road Maintenance",
            "estimatedPriority": "e.g., Immediate",
            "priorityScore": 95, // 0-100
            "recommendedAction": "e.g., Send inspection team immediately."
        }
        
        CRITICAL LOCALIZATION REQUIREMENT:
        You MUST generate all descriptive string fields (sceneAnalysis, limitations, reasoning, issueDetected, enhancedDescription, risk, recommendedAction) in the following language: ${language || 'en'}.
        If the language is 'hi', respond in Hindi. If 'mr', respond in Marathi. If 'en', respond in English. Do NOT mix languages. Ensure professional and formal tone.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                systemInstruction: "You are CivicMind's Evidence Assessment AI. Your primary job is to assess if an image contains clear evidence of a civic issue. Use objective, neutral language. If an issue cannot be verified, state 'Needs More Evidence' or 'Cannot Verify' rather than calling it fake.",
                responseMimeType: "application/json"
            }
        });

        let aiResult = {};
        try {
            aiResult = JSON.parse(response.text);
        } catch(e) {
            console.error("Failed to parse Gemini output:", response.text);
            aiResult = {
                isGenuine: false,
                evidenceAssessment: {
                    sceneMatch: 0, 
                    locationVerified: false, 
                    confidence: 0, 
                    overallStrength: 0,
                    sceneAnalysis: "AI failed to process image.",
                    detectedObjects: [],
                    limitations: "System error occurred.",
                    humanApprovalRequired: true,
                    reasoning: ["Failed to parse AI response."]
                },
                issueDetected: "Unknown",
                enhancedDescription: description,
                severity: "Medium",
                risk: "Unknown",
                suggestedDepartment: "General",
                estimatedPriority: "Normal",
                priorityScore: 50,
                recommendedAction: "Manual review required"
            };
        }

        // Generate random mock location if not provided
        let finalLat = hasGps === 'true' && lat ? parseFloat(lat) : 40.7128 + (Math.random() - 0.5) * 0.1;
        let finalLng = hasGps === 'true' && lng ? parseFloat(lng) : -74.0060 + (Math.random() - 0.5) * 0.1;

        // 3. Save to MongoDB
        let newComplaint = null;
        if (aiResult.isGenuine || !aiResult.isGenuine) {
            // We now save everything but mark fake ones with low score for dashboard review
            newComplaint = new Complaint({
                originalDescription: description,
                enhancedDescription: aiResult.enhancedDescription,
                enhancedDescription: aiResult.enhancedDescription || description,
                imageUrl: uploadResponse.secure_url,
                severity: aiResult.severity || 'Medium',
                confidence: aiResult.evidenceAssessment?.confidence || 50,
                riskAnalysis: aiResult.risk || 'No risk assessment provided.',
                suggestedDepartment: aiResult.suggestedDepartment || 'General',
                estimatedPriority: aiResult.estimatedPriority || 'Normal',
                priorityScore: aiResult.priorityScore || 50,
                location: {
                    lat: hasGps === 'true' ? parseFloat(lat) : null,
                    lng: hasGps === 'true' ? parseFloat(lng) : null,
                    address: locationStr || 'Reported Location'
                },
                evidence: {
                    sceneMatch: aiResult.evidenceAssessment?.sceneMatch || 0,
                    gpsAvailable: hasGps === 'true',
                    locationVerified: aiResult.evidenceAssessment?.locationVerified || false,
                    metadataAvailable: false,
                    overallStrength: aiResult.evidenceAssessment?.overallStrength || 0,
                    sceneAnalysis: aiResult.evidenceAssessment?.sceneAnalysis || "Detailed scene analysis not provided by AI.",
                    detectedObjects: aiResult.evidenceAssessment?.detectedObjects || [],
                    limitations: aiResult.evidenceAssessment?.limitations || "No explicit limitations stated by AI.",
                    humanApprovalRequired: aiResult.evidenceAssessment?.humanApprovalRequired !== false,
                    reasoning: aiResult.evidenceAssessment?.reasoning || []
                },
                recommendedAction: aiResult.recommendedAction || "Awaiting officer review.",
                status: 'Pending',
                user: req.user ? req.user.id : undefined
            });

            await newComplaint.save();
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
        let query = {};
        let complaints = await Complaint.find(query).sort({ createdAt: -1 }).lean();
        
        if (req.user && req.user.role === 'citizen') {
            complaints = complaints.map(c => {
                delete c.officerNotes;
                delete c.budgetEstimation;
                delete c.resourceAllocation;
                delete c.priorityScore;
                delete c.recommendedAction;
                return c;
            });
        }
        
        // Dynamic Translation of Dashboard Feed
        const lang = req.headers['x-language'] || req.query.lng || 'en';
        if (lang !== 'en' && complaints.length > 0) {
            const translatableArray = complaints.map(c => ({
                id: c._id.toString(),
                issueDetected: c.issueDetected,
                address: c.location?.address,
                suggestedDepartment: c.suggestedDepartment,
                status: c.status
            }));
            
            const translatedArray = await translateDynamicContent(translatableArray, lang);
            if (Array.isArray(translatedArray)) {
                complaints = complaints.map(c => {
                    const trans = translatedArray.find(t => t.id === c._id.toString());
                    if (trans) {
                        c.issueDetected = trans.issueDetected || c.issueDetected;
                        if (c.location) c.location.address = trans.address || c.location.address;
                        c.suggestedDepartment = trans.suggestedDepartment || c.suggestedDepartment;
                        c.status = trans.status || c.status;
                    }
                    return c;
                });
            }
        }
        
        res.status(200).json(complaints);
    } catch (error) {
        console.error('getComplaints error:', error);
        res.status(500).json({ error: 'Failed to fetch complaints' });
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
        
        // Ensure status is one of the valid enum values
        const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Needs Manual Inspection', 'Needs More Evidence'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const complaint = await Complaint.findByIdAndUpdate(
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
        
        if (!complaint) return res.status(404).json({ error: 'Not found' });
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.trackComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        let complaint = await Complaint.findOne({ complaintId: id }).lean();
        if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
        
        // RBAC: Hide internal decision data from citizens
        if (req.user && req.user.role === 'citizen') {
            delete complaint.officerNotes;
            delete complaint.budgetEstimation;
            delete complaint.resourceAllocation;
            delete complaint.priorityScore;
            delete complaint.recommendedAction;
            // Citizens CAN see evidence strength, reasoning, etc.
        }

        // Dynamic Translation of Detailed View
        const lang = req.headers['x-language'] || req.query.lng || 'en';
        if (lang !== 'en') {
            const fieldsToTranslate = {
                originalDescription: complaint.originalDescription,
                enhancedDescription: complaint.enhancedDescription,
                issueDetected: complaint.issueDetected,
                suggestedDepartment: complaint.suggestedDepartment,
                recommendedAction: complaint.recommendedAction,
                officerNotes: complaint.officerNotes,
                budgetEstimation: complaint.budgetEstimation,
                resourceAllocation: complaint.resourceAllocation,
                assignedOfficerName: complaint.assignedOfficerName,
                status: complaint.status
            };
            if (complaint.location) {
                fieldsToTranslate.address = complaint.location.address;
            }
            if (complaint.evidence) {
                fieldsToTranslate.sceneAnalysis = complaint.evidence.sceneAnalysis;
                fieldsToTranslate.limitations = complaint.evidence.limitations;
                fieldsToTranslate.reasoning = complaint.evidence.reasoning;
            }
            
            const translated = await translateDynamicContent(fieldsToTranslate, lang);
            if (translated) {
                complaint.originalDescription = translated.originalDescription || complaint.originalDescription;
                complaint.enhancedDescription = translated.enhancedDescription || complaint.enhancedDescription;
                complaint.issueDetected = translated.issueDetected || complaint.issueDetected;
                complaint.suggestedDepartment = translated.suggestedDepartment || complaint.suggestedDepartment;
                complaint.recommendedAction = translated.recommendedAction || complaint.recommendedAction;
                complaint.officerNotes = translated.officerNotes || complaint.officerNotes;
                complaint.budgetEstimation = translated.budgetEstimation || complaint.budgetEstimation;
                complaint.resourceAllocation = translated.resourceAllocation || complaint.resourceAllocation;
                complaint.assignedOfficerName = translated.assignedOfficerName || complaint.assignedOfficerName;
                complaint.status = translated.status || complaint.status;
                if (complaint.location) {
                    complaint.location.address = translated.address || complaint.location.address;
                }
                if (complaint.evidence) {
                    complaint.evidence.sceneAnalysis = translated.sceneAnalysis || complaint.evidence.sceneAnalysis;
                    complaint.evidence.limitations = translated.limitations || complaint.evidence.limitations;
                    complaint.evidence.reasoning = translated.reasoning || complaint.evidence.reasoning;
                }
            }
        }

        res.status(200).json(complaint);
    } catch (error) {
        console.error('trackComplaint error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.seedComplaints = async (req, res) => {
    try {
        await Complaint.deleteMany({});
        const dummyData = [
            {
                complaintId: 'CM-1001',
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
                location: { lat: 19.1136, lng: 72.8697, address: 'Andheri East, Mumbai' },
                evidence: { sceneMatch: 95, gpsAvailable: true, locationVerified: true, overallStrength: 92, reasoning: ['Clear visual of pothole', 'GPS matches'] }
            },
            {
                complaintId: 'CM-1002',
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
                location: { lat: 19.1843, lng: 72.8360, address: 'Malad West, Mumbai' },
                evidence: { sceneMatch: 90, gpsAvailable: false, locationVerified: false, overallStrength: 75, reasoning: ['Visible waste overflow'] }
            },
            {
                complaintId: 'CM-1003',
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
                location: { lat: 19.0760, lng: 72.8777, address: 'Kurla, Mumbai' },
                evidence: { sceneMatch: 85, gpsAvailable: true, locationVerified: true, overallStrength: 88, reasoning: ['Continuous flow visible'] }
            },
            {
                complaintId: 'CM-1004',
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
                location: { lat: 19.0144, lng: 72.8479, address: 'Dadar, Mumbai' },
                evidence: { sceneMatch: 90, gpsAvailable: true, locationVerified: true, overallStrength: 85, reasoning: ['Darkened pole visible'] }
            }
        ];
        await Complaint.insertMany(dummyData);
        res.status(200).json({ message: 'Database seeded successfully', count: dummyData.length });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to seed database' });
    }
};
