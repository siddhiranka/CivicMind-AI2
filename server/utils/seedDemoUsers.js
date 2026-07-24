const User = require('../models/User');
const bcrypt = require('bcryptjs');

const seedDemoUsers = async () => {
    try {
        // Check if demo citizen exists
        const citizenExists = await User.findOne({ email: 'citizen@demo.com' });
        if (!citizenExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Citizen@123', salt);
            await User.create({
                name: 'Siddhi (Citizen Demo)',
                email: 'citizen@demo.com',
                password: hashedPassword,
                role: 'citizen'
            });
            console.log('✅ Demo Citizen account created: citizen@demo.com');
        }

        // Check if demo officer exists
        const officerExists = await User.findOne({ email: 'officer@demo.com' });
        if (!officerExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Officer@123', salt);
            await User.create({
                name: 'Rahul Sharma (Officer Demo)',
                email: 'officer@demo.com',
                password: hashedPassword,
                role: 'officer'
            });
            console.log('✅ Demo Officer account created: officer@demo.com');
        }
    } catch (error) {
        console.error('Error seeding demo users:', error);
    }
};

module.exports = seedDemoUsers;
