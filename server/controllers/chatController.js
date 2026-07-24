const Complaint = require('../models/Complaint');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.chatWithAI = async (req, res) => {
    try {
        const { message, language } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

        // Fetch recent complaints to give the AI context
        const recentComplaints = await Complaint.find().sort({ createdAt: -1 }).limit(20);
        
        // Structure the data for Gemini
        const contextData = recentComplaints.map(c => ({
            id: c._id,
            issue: c.issueDetected,
            description: c.enhancedDescription,
            severity: c.severity,
            priorityScore: c.priorityScore,
            status: c.status
        }));

        const prompt = `You are CivicMind AI, an Enterprise Decision Intelligence system.
        The user is asking: "${message}"
        
        Here is the current live data of community complaints (latest 20 issues):
        ${JSON.stringify(contextData, null, 2)}
        
        Analyze this data and respond to the user's question. 
        CRITICAL TASK: Do NOT answer in normal conversational text. You must ONLY output a highly structured AI Decision Report using Markdown.
        
        Use the exact following format:
        
        ━━━━━━━━━━━━━━━━━━
        **AI Decision Report**
        ━━━━━━━━━━━━━━━━━━
        **Priority:** [Name of the issue to solve]
        
        **Reason:** [Bulleted list of why it's the priority based on data]
        
        **Confidence:** [Percentage]%
        
        **Impact:** [Low/Medium/High/Very High]
        
        **Estimated Cost:** [e.g., ₹1.2L or $5,000 depending on issue scope]
        
        **Timeline:** [e.g., 48 Hours]
        
        **Action:** [Exact department to assign and what they should do]
        ━━━━━━━━━━━━━━━━━━
        
        If the user's question isn't about solving an issue, adapt the format slightly to fit their question but KEEP the strict tabular/report look.
        
        CRITICAL LANGUAGE REQUIREMENT: You MUST respond ENTIRELY in ${langName}. Every single word of your response — including labels like "Priority:", "Reason:", "Confidence:", "Impact:", "Action:" — must be written in ${langName}. Do not mix any other language. Translate all labels, values, and reasoning into ${langName}.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { text: prompt }
            ]
        });

        res.json({ reply: response.text });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to communicate with AI' });
    }
};
