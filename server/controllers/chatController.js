const Complaint = require('../models/Complaint');
const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.chatWithAI = async (req, res) => {
    try {
        const { message, language } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
        const apiKey = process.env.GEMINI_API_KEY;

        // Fetch recent complaints from DB, memory store, or seed defaults
        let dbComplaints = [];
        if (mongoose.connection.readyState === 1) {
            try {
                dbComplaints = await Complaint.find().sort({ createdAt: -1 }).limit(20).lean();
            } catch (dbErr) {
                console.warn('DB fetch warning in chat:', dbErr.message);
            }
        }

        // Combine memory complaints, db complaints, and default complaints
        const { memoryComplaints, DEFAULT_COMPLAINTS } = require('./complaintController');
        const seenKeys = new Set();
        const combined = [];

        if (memoryComplaints && Array.isArray(memoryComplaints)) {
            for (const mc of memoryComplaints) {
                const key = String(mc.complaintId || mc._id);
                if (key && !seenKeys.has(key)) {
                    seenKeys.add(key);
                    combined.push(mc);
                }
            }
        }

        for (const dbc of dbComplaints) {
            const key = String(dbc.complaintId || dbc._id);
            if (key && !seenKeys.has(key)) {
                seenKeys.add(key);
                combined.push(dbc);
            }
        }

        if (DEFAULT_COMPLAINTS && Array.isArray(DEFAULT_COMPLAINTS)) {
            for (const defc of DEFAULT_COMPLAINTS) {
                const key = String(defc.complaintId || defc._id);
                if (key && !seenKeys.has(key)) {
                    seenKeys.add(key);
                    combined.push(defc);
                }
            }
        }

        // Structure data for context
        const contextData = combined.map(c => ({
            id: c.complaintId || c._id,
            issue: c.issueDetected || c.originalDescription || 'Civic Issue',
            description: c.enhancedDescription || c.originalDescription || 'Reported issue under municipal review.',
            severity: c.severity || 'Medium',
            priorityScore: c.priorityScore || 75,
            status: c.status || 'Pending',
            location: c.location?.address || 'Municipal District',
            department: c.suggestedDepartment || 'Road Maintenance'
        }));

        const prompt = `You are CivicMind AI, an expert civic infrastructure assistant for citizens and municipal city officers. Answer the user's question with high accuracy, helpfulness, and conciseness.

User Question: "${message}"

Live Community Complaints Context Database:
${contextData.slice(0, 15).map(c => `• [ID: ${c.id}] ${c.issue} | Severity: ${c.severity} | Status: ${c.status} | Department: ${c.department} | Location: ${c.location}`).join('\n')}

INSTRUCTIONS:
1. If the user asks about a specific complaint ID (e.g. CM-1001, CM-1002, etc.), search the Live Community Complaints Context Database above and provide the exact status, location, severity, and department for that ID.
2. If asking about critical/urgent hazards, summarize the critical reports listed above.
3. If asking how to report an issue, explain step-by-step: click "Report Issue", enter description/GPS, upload an image or video photo, and click "Run AI Analysis".
4. Format your response cleanly with bullet points and bold text for key details.
5. Language: You MUST respond in ${langName}.`;

        if (apiKey && apiKey.length > 5) {
            try {
                const aiInstance = new GoogleGenAI({ apiKey });
                let response;
                try {
                    response = await aiInstance.models.generateContent({
                        model: 'gemini-2.0-flash',
                        contents: [{ text: prompt }]
                    });
                } catch (err20) {
                    console.warn('gemini-2.0-flash failed in chat, trying gemini-1.5-flash:', err20.message);
                    response = await aiInstance.models.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: [{ text: prompt }]
                    });
                }

                if (response && response.text) {
                    return res.json({ reply: response.text });
                }
            } catch (aiError) {
                console.warn('Gemini API call error in chat, using fallback contextual engine:', aiError.message);
            }
        }

        // Contextual Fallback Assistant Engine
        let reply = "";
        const lowerMsg = message.toLowerCase();

        // Check if user is asking for a specific ID
        const matchId = lowerMsg.match(/cm-\d{4}/i);
        if (matchId) {
            const targetId = matchId[0].toUpperCase();
            const found = contextData.find(c => String(c.id).toUpperCase() === targetId);
            if (found) {
                reply = `📋 **Complaint ${found.id} Details**:\n\n` +
                    `• **Issue**: ${found.issue}\n` +
                    `• **Status**: ${found.status}\n` +
                    `• **Severity**: ${found.severity}\n` +
                    `• **Assigned Department**: ${found.department}\n` +
                    `• **Location**: ${found.location}\n\n` +
                    `You can track detailed updates on the **Track Complaint** page.`;
            } else {
                reply = `No active record found for tracking ID **${targetId}**. Please verify your Complaint ID or check the Track Complaint page.`;
            }
        } else if (lowerMsg.includes('urgent') || lowerMsg.includes('critical') || lowerMsg.includes('hazard') || lowerMsg.includes('danger')) {
            const criticals = contextData.filter(c => c.severity === 'Critical' || c.severity === 'High');
            if (criticals.length > 0) {
                reply = `Currently, there are **${criticals.length} high-priority civic issues** recorded in your district:\n\n` +
                    criticals.slice(0, 3).map(c => `• **${c.issue}** [${c.id}] at *${c.location}* (Status: ${c.status})`).join('\n') +
                    `\n\nMunicipal crews are dispatched based on AI severity rankings. You can track live updates on the Dashboard.`;
            } else {
                reply = `No critical hazards are currently active in your district. All reported issues are under standard municipal review.`;
            }
        } else if (lowerMsg.includes('report') || lowerMsg.includes('submit') || lowerMsg.includes('create') || lowerMsg.includes('how to')) {
            reply = `To report a civic issue on CivicMind:\n\n` +
                `1. Click **"Report Issue"** in the navigation header.\n` +
                `2. Type the issue description or use **Voice Input** / **Live GPS** detection.\n` +
                `3. Upload evidence photo or video (up to 50MB).\n` +
                `4. Click **"Run AI Analysis"** — Gemini Vision will analyze the scene and route it automatically!`;
        } else {
            reply = `Hello! I am **CivicMind AI Assistant**.\n\n` +
                `You can ask me about:\n` +
                `• **Complaint Status** (e.g., "What is the status of CM-1001?")\n` +
                `• **Urgent / Critical hazard reports** in your area\n` +
                `• **Step-by-step instructions on reporting an issue**\n` +
                `• **Department routing and severity rankings**`;
        }

        res.json({ reply });
    } catch (error) {
        console.error('Chat controller error:', error);
        res.status(500).json({ error: 'Failed to process chat query' });
    }
};
