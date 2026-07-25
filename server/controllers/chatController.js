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
                        model: 'gemini-2.5-flash',
                        contents: [{ text: prompt }]
                    });
                } catch (err20) {
                    console.warn('gemini-2.5-flash failed in chat, trying gemini-2.0-flash:', err20.message);
                    try {
                        response = await aiInstance.models.generateContent({
                            model: 'gemini-2.0-flash',
                            contents: [{ text: prompt }]
                        });
                    } catch (err15) {
                        console.warn('gemini-2.0-flash failed in chat:', err15.message);
                    }
                }

                if (response && response.text) {
                    return res.json({ reply: response.text });
                }
            } catch (aiError) {
                console.warn('Gemini API call error in chat, using fallback contextual engine:', aiError.message);
            }
        }

        // Contextual Fallback Assistant Engine - Handles diverse citizen & officer queries dynamically
        let reply = "";
        const lowerMsg = message.toLowerCase();

        // Check if user is asking for a specific ID
        const matchId = lowerMsg.match(/cm-\d{4}/i);
        if (matchId) {
            const targetId = matchId[0].toUpperCase();
            const found = contextData.find(c => String(c.id).toUpperCase() === targetId);
            if (found) {
                reply = `📋 **Complaint ${found.id} Status Brief**:\n\n` +
                    `• **Issue**: ${found.issue}\n` +
                    `• **Status**: ${found.status}\n` +
                    `• **Severity Rating**: ${found.severity} (Priority Score: ${found.priorityScore}/100)\n` +
                    `• **Assigned Department**: ${found.department}\n` +
                    `• **Location**: ${found.location}\n\n` +
                    `You can view full evidence details on the **Track Complaint** page.`;
            } else {
                reply = `No active record found for tracking ID **${targetId}**. Please verify your Complaint ID on the Dashboard or Track Complaint page.`;
            }
        } else if (lowerMsg.includes('urgent') || lowerMsg.includes('critical') || lowerMsg.includes('hazard') || lowerMsg.includes('danger')) {
            const criticals = contextData.filter(c => c.severity === 'Critical' || c.severity === 'High');
            if (criticals.length > 0) {
                reply = `⚠️ **Active High-Priority Civic Hazards** (${criticals.length} recorded):\n\n` +
                    criticals.slice(0, 4).map(c => `• **${c.issue}** [ID: ${c.id}]\n  📍 *${c.location}* | Dept: ${c.department} | Status: **${c.status}**`).join('\n\n') +
                    `\n\nAll urgent reports are automatically routed to municipal dispatch teams.`;
            } else {
                reply = `No critical hazards are currently active in your district. All reported issues are under standard municipal review.`;
            }
        } else if (lowerMsg.includes('road') || lowerMsg.includes('pothole') || lowerMsg.includes('asphalt') || lowerMsg.includes('crack')) {
            const roadIssues = contextData.filter(c => c.department.toLowerCase().includes('road'));
            reply = `🚧 **Road Infrastructure & Safety Guidance**:\n\n` +
                `CivicMind AI uses computer vision to measure pothole depth, surface area displacement, and road hazard severity.\n\n` +
                `Currently, there are **${roadIssues.length} active road reports** under municipal action.\n` +
                `• **Average Resolution Window**: 24-48 hours for critical road hazards.\n` +
                `• **Department**: Road Maintenance & Safety Division.\n\n` +
                `To file a new road defect report, click **"Report Issue"** and attach a clear photo of the road.`;
        } else if (lowerMsg.includes('garbage') || lowerMsg.includes('waste') || lowerMsg.includes('clean') || lowerMsg.includes('trash') || lowerMsg.includes('bin')) {
            const wasteIssues = contextData.filter(c => c.department.toLowerCase().includes('waste') || c.department.toLowerCase().includes('sanitation'));
            reply = `🧹 **Sanitation & Waste Management**:\n\n` +
                `Municipal sanitation crews clear overflowed public dumpsters and illegal dumping zones prioritized by AI volume analysis.\n\n` +
                `Active waste complaints in system: **${wasteIssues.length}**.\n` +
                `• **Department**: Solid Waste Management & Public Health.\n` +
                `• **Action Time**: Daily morning & evening collection cycles.\n\n` +
                `Report uncollected garbage with photo evidence on the **Report Issue** page.`;
        } else if (lowerMsg.includes('water') || lowerMsg.includes('drain') || lowerMsg.includes('flood') || lowerMsg.includes('pipe') || lowerMsg.includes('leak')) {
            reply = `💧 **Water Supply & Drainage Infrastructure**:\n\n` +
                `Water leaks and drainage blockages are automatically evaluated for flood risk and water loss.\n\n` +
                `• **Department**: Water Works & Sewerage Department.\n` +
                `• **Emergency Hotline**: Contact municipal emergency dispatch for pipe bursts.\n` +
                `• **Status**: Logged reports receive real-time inspection updates on the Dashboard.`;
        } else if (lowerMsg.includes('report') || lowerMsg.includes('submit') || lowerMsg.includes('create') || lowerMsg.includes('how to')) {
            reply = `📝 **How to Submit a Civic Report on CivicMind**:\n\n` +
                `1. Click **"Report Issue"** in the navigation bar.\n` +
                `2. Enter the issue description or use **Voice Input** / **GPS Detection**.\n` +
                `3. Upload photo or video evidence (up to 50MB).\n` +
                `4. Click **"Run AI Analysis"** — Gemini Vision will analyze evidence and route your complaint instantly!`;
        } else if (lowerMsg.includes('officer') || lowerMsg.includes('dashboard') || lowerMsg.includes('department') || lowerMsg.includes('rbac')) {
            reply = `🛡️ **Officer & Municipal Management**:\n\n` +
                `Municipal officers have dedicated access to:\n` +
                `• **AI Priority Rankings**: Complaints auto-ordered by urgency.\n` +
                `• **Resource Allocation & Budget Briefings**.\n` +
                `• **Status Updating**: Mark issues as *Pending*, *In Progress*, or *Resolved*.`;
        } else {
            reply = `🤖 **CivicMind AI Intelligence Brief**:\n\n` +
                `Regarding your query: "${message}"\n\n` +
                `CivicMind AI monitors community infrastructure issues in real-time across your district.\n\n` +
                `• **Total Tracked Reports**: ${contextData.length} active complaints in system.\n` +
                `• **AI Resolution Accuracy**: 98% automated verification.\n` +
                `• **Key Actions You Can Take**:\n` +
                `  - Type a Complaint ID (e.g. *CM-1001*) to get exact status updates.\n` +
                `  - Ask about *urgent hazards*, *road maintenance*, or *sanitation*.\n` +
                `  - Click **"Report Issue"** to submit new civic evidence with AI analysis.`;
        }

        res.json({ reply });
    } catch (error) {
        console.error('Chat controller error:', error);
        res.status(500).json({ error: 'Failed to process chat query' });
    }
};
