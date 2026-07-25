const app = require('./app');

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn('⚠️  GEMINI_API_KEY is NOT set in .env — AI features will fail.');
        } else if (!key.startsWith('AIza')) {
            console.warn(`⚠️  GEMINI_API_KEY looks invalid (starts with "${key.substring(0,6)}..." instead of "AIza..."). AI may fail.`);
        } else {
            console.log('✅  GEMINI_API_KEY is configured.');
        }
    });
}

module.exports = app;
