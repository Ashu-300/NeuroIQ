const mongoose = require('mongoose');

const ExamStatusEnum = {
    ACTIVE: 'active',
    SUBMITTED: 'submitted',
    AUTO_SUBMITTED: 'auto_submitted',
};

const ViolationSeverityEnum = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
};

const ViolationTypeEnum = {
    CHEATING_PROBABILITY: 'CHEATING_PROBABILITY',
};

const examSessionSchema = new mongoose.Schema({
    _id: { type: String, required: true },

    student_id: { type: String, required: true, index: true },

    exam_id: { type: String, required: true, index: true },

    status: {
        type: String,
        enum: Object.values(ExamStatusEnum),
        default: ExamStatusEnum.ACTIVE
    },

    start_time: { type: Date, default: Date.now },

    end_time: { type: Date, default: null },

    warnings: { type: Number, default: 0 },

    violation_count: { type: Number, default: 0 },

   
});


// Violation Schema (probability based)
const violationSchema = new mongoose.Schema({
    _id: { type: String, required: true },

    session_id: { type: String, required: true, index: true },

    student_id: { type: String, required: true },

    violation_type: {
        type: String,
        enum: Object.values(ViolationTypeEnum),
        required: true
    },

    severity: {
        type: String,
        enum: Object.values(ViolationSeverityEnum),
        required: true
    },

    cheating_probability: { type: Number, required: true },

    threshold: { type: Number, default: 0.7 },

    timestamp: { type: Date, default: Date.now, index: true },

    metadata: { type: Object, default: {} },
});


// Exam Report Schema
const proctoringReportSchema = new mongoose.Schema({
    _id: { type: String, required: true },

    session_id: { type: String, required: true, index: true },

    student_id: { type: String, required: true },

    exam_id: { type: String, required: true, index: true },

    start_time: { type: Date, required: true },

    end_time: { type: Date, required: true },

    duration_seconds: { type: Number, required: true },

    status: { type: String, required: true },

    total_warnings: { type: Number, default: 0 },

    violations: { type: Array, default: [] },

    identity_verified: { type: Boolean, default: false },

    average_cheating_probability: { type: Number, default: 0 },  // ✅ NEW

    max_cheating_probability: { type: Number, default: 0 },  // optional but useful

    created_at: { type: Date, default: Date.now },
});


// Create models
const ExamSession = mongoose.model('ExamSession', examSessionSchema, 'exam_sessions');
const Violation = mongoose.model('Violation', violationSchema, 'violations');
const ProctoringReport = mongoose.model('ProctoringReport', proctoringReportSchema, 'proctoring_reports');

module.exports = {
    ExamSession,
    Violation,
    ProctoringReport,
    ExamStatusEnum,
    ViolationSeverityEnum,
    ViolationTypeEnum,
};