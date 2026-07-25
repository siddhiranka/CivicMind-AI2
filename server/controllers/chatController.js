const Complaint = require('../models/Complaint');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.chatWithAI = async (req, res) => {
    try {
        const { message, language } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
        const apiKey = process.env.GEMINI_API_KEY;

        // Fetch recent complaints to give the AI context
        let recentComplaints = [];
        try {
            recentComplaints = await Complaint.find().sort({ createdAt: -1 }).limit(20);
        } catch (dbErr) {
            console.warn('DB fetch warning in chat:', dbErr.message);
        }
        
        // Structure data for context
        const contextData = recentComplaints.map(c => ({
            id: c.complaintId || c._id,
            issue: c.issueDetected || c.originalDescription,
            description: c.enhancedDescription || c.originalDescription,
            severity: c.severity || 'Medium',
            priorityScore: c.priorityScore || 75,
            status: c.status || 'Pending',
            location: c.location?.address || 'Municipal area'
        }));

        const prompt = `You are CivicMind AI, an intelligent civic assistant for citizens and city officers. Answer the user's question clearly, helpfully, and concisely.

User Question: "${message}"

Live Community Complaints Context:
${contextData.length > 0 ? contextData.slice(0, 10).map(c => `- ${c.issue} (${c.severity} Severity, Status: ${c.status}, Location: ${c.location})`).join('\n') : 'No active complaint records in database.'}

RULES:
- Answer directly and helpfully in 2-4 sentences or short bullet points.
- If asking about urgent/critical issues, reference the live complaints data above.
- If asking how to report, explain taking a clear photo, setting location (or live GPS), and running AI analysis.
- Language: Respond entirely in ${langName}.`;

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
                    console.warn('gemini-2.0-flash failed, trying gemini-1.5-flash:', err20.message);
                    response = await aiInstance.models.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: [{ text: prompt }]
                    });
                }

                if (response && response.text) {
                    return res.json({ reply: response.text });
                }
            } catch (aiError) {
                console.warn('Gemini API call error in chat, using intelligent assistant engine:', aiError.message);
            }
        }

        // Intelligent Contextual Assistant Engine (Fallback)
        let reply = "";
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('urgent') || lowerMsg.includes('critical') || lowerMsg.includes('hazard') || lowerMsg.includes('danger')) {
            const criticals = contextData.filter(c => c.severity === 'Critical' || c.severity === 'High');
            if (criticals.length > 0) {
                reply = `Currently, there are **${criticals.length} high-priority issues** flagged in your district:\n\n` +
                    criticals.slice(0, 3).map(c => `• **${c.issue}** at *${c.location}* (Status: ${c.status})`).join('\n') +
                    `\n\nOfficers are dispatched based on AI severity ranking. You can track their status on the Dashboard.`;
            } else {
                reply = `No critical hazards are currently active in your district. All reported issues are under standard municipal review.`;
            }
        } else if (lowerMsg.includes('report') || lowerMsg.includes('submit') || lowerMsg.includes('create') || lowerMsg.includes('how to')) {
            reply = `To report a civic issue:\n\n` +
                `1. Click **"Report Issue"** in the top navigation.\n` +
                `2. Describe the problem or use **Voice Input** / **Live GPS** detection.\n` +
                `3. Upload a clear photo of the infrastructure issue.\n` +
                `4. Click **"Run AI Analysis"** — Gemini Vision will inspect the image and route it automatically!`;
        } else if (lowerMsg.includes('pothole') || lowerMsg.includes('road') || lowerMsg.includes('water') || lowerMsg.includes('garbage')) {
            const matches = contextData.filter(c => c.issue.toLowerCase().includes(lowerMsg) || c.description.toLowerCase().includes(lowerMsg));
            if (matches.length > 0) {
                reply = `We found **${matches.length} matching report(s)** in community records:\n\n` +
                    matches.slice(0, 3).map(c => `• **${c.issue}** at *${c.location}* — Priority: ${c.severity}`).join('\n') +
                    `\n\nYou can track updates or report additional evidence anytime.`;
            } else {
                reply = `No matching complaints found in current records. Please use the **"Report Issue"** tab to submit a new report with a photo so AI vision can analyze it.`;
            }
        } else {
            reply = `Hello! I am **CivicMind AI Assistant**. I analyze live city infrastructure reports, severity levels, and department routing.\n\n` +
                `You can ask me about:\n` +
                `• **Urgent / Critical hazard reports** in your area\n` +
                `• **How to submit a new civic issue** with live GPS\n` +
                `• **Complaint resolution status and department tracking**`;
        }

        res.json({ reply });
    } catch (error) {
        console.error('Chat controller error:', error);
        res.status(500).json({ error: 'Failed to process chat query' });
    }
};
