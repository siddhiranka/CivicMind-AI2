const multer = require('multer');
const path = require('path');

// Configure multer to use memory storage since we're uploading to cloudinary directly
const storage = multer.memoryStorage();

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit to support videos
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.mov', '.webm'];
        if (!allowedExts.includes(ext) && !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Only images (JPG, JPEG, PNG, WEBP) and videos (MP4, MOV, WEBM) are allowed'));
        }
        cb(null, true);
    }
});

module.exports = upload;
