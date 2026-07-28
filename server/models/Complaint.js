const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    complaintId: { type: String, unique: true },
    originalDescription: { type: String, required: true },
    enhancedDescription: { type: String },
    imageUrl: { type: String, required: true },
    severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    isCivicIssue: { type: Boolean, default: true },
    riskAnalysis: { type: String },
    suggestedDepartment: { type: String },
    estimatedPriority: { type: String },
    priorityScore: { type: Number },
    status: { type: String, enum: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Needs Manual Inspection', 'Needs More Evidence'], default: 'Pending' },
    previousStatus: { type: String, enum: ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'Needs Manual Inspection', 'Needs More Evidence'], default: 'Pending' },
    location: {
        lat: { type: Number },
        lng: { type: Number },
        address: { type: String }
    },
    evidence: {
        sceneMatch: { type: Number, default: 0 },
        gpsAvailable: { type: Boolean, default: false },
        locationVerified: { type: Boolean, default: false },
        metadataAvailable: { type: Boolean, default: false },
        overallStrength: { type: Number, default: 0 },
        sceneAnalysis: { type: String, default: "" },
        detectedObjects: { type: [String], default: [] },
        limitations: { type: String, default: "No limitations specified." },
        humanApprovalRequired: { type: Boolean, default: true },
        reasoning: { type: [String], default: [] }
    },
    recommendedAction: { type: String },
    officerNotes: { type: String, default: "" },
    budgetEstimation: { type: String },
    resourceAllocation: { type: String },
    // Synchronization fields
    officerId: { type: String },
    officerName: { type: String },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    // Existing fields continue
    timeline: [{ event: { type: String }, timestamp: { type: Date, default: Date.now } }],

}, { timestamps: true });

complaintSchema.pre('save', function(next) {
    if (!this.complaintId) {
        // Generate a random ID like CM-1024
        this.complaintId = 'CM-' + Math.floor(1000 + Math.random() * 9000);
    }
    next();
});

module.exports = mongoose.model('Complaint', complaintSchema);
