const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const complaintController = require('../controllers/complaintController');
const { protect, authorizeRoles } = require('../middleware/auth');

router.post('/', protect, upload.single('image'), complaintController.createComplaint);
router.get('/', protect, complaintController.getComplaints);
router.patch('/:id/status', protect, authorizeRoles('officer'), complaintController.updateStatus);
router.patch('/:id/review', protect, authorizeRoles('officer'), complaintController.reviewComplaint);
router.patch('/:id/undo', protect, authorizeRoles('officer'), complaintController.undoReview);
router.post('/seed', complaintController.seedComplaints);
router.get('/track/:id', protect, complaintController.trackComplaint);

module.exports = router;
