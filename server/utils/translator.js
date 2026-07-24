const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Translates a single text string or an array of strings/objects into the target language.
 * Uses Gemini to perform accurate context-aware translations.
 */
async function translateDynamicContent(content, targetLang) {
    if (!content || !targetLang || targetLang === 'en') {
        return content;
    }

    try {
        const prompt = `You are a professional translator fluent in English, Hindi, and Marathi.
        Translate the following content into the target language: "${targetLang === 'hi' ? 'Hindi' : 'Marathi'}".
        
        Rules:
        1. Maintain the exact meaning, tone, and any markdown formatting.
        2. Keep names, technical terms (like GPS), or IDs (like CM-1234) unchanged.
        3. If the input is a JSON string or object, translate only the values (not keys) and preserve the structure.
        4. Return ONLY the translated string or valid translated JSON. Do not include any explanation or additional text.
        
        Content to translate:
        ${typeof content === 'object' ? JSON.stringify(content) : content}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ text: prompt }]
        });

        const resultText = response.text.trim();
        
        if (typeof content === 'object') {
            // Find start and end of JSON in response to avoid parsing issues
            const startIdx = resultText.indexOf('{');
            const endIdx = resultText.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                const cleanedJson = resultText.substring(startIdx, endIdx + 1);
                return JSON.parse(cleanedJson);
            }
        }
        
        return resultText;
    } catch (error) {
        console.error('Translation error:', error);
        return content; // Fallback to original content on failure
    }
}

module.exports = { translateDynamicContent };
