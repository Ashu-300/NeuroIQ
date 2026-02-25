/**
 * Mongoose schemas for exam entities
 */
const mongoose = require('mongoose');

// Enums
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
    NO_FACE: 'NO_FACE',
    MULTIPLE_FACES: 'MULTIPLE_FACES',
    LOOKING_AWAY: 'LOOKING_AWAY',
    HEAD_TURN: 'HEAD_TURN',
};

// Exam Session Schema
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
    identity_verified: { type: Boolean, default: false },
    identity_snapshot_base64: { type: String, default: null },
});

// Violation Schema
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
    timestamp: { type: Date, default: Date.now, index: true },
    duration_seconds: { type: Number, default: null },
    metadata: { type: Object, default: {} },
});

// Exam Report Schema
const examReportSchema = new mongoose.Schema({
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
    created_at: { type: Date, default: Date.now },
});

// Create models
const ExamSession = mongoose.model('ExamSession', examSessionSchema, 'exam_sessions');
const Violation = mongoose.model('Violation', violationSchema, 'violations');
const ExamReport = mongoose.model('ExamReport', examReportSchema, 'exam_reports');

module.exports = {
    ExamSession,
    Violation,
    ExamReport,
    ExamStatusEnum,
    ViolationSeverityEnum,
    ViolationTypeEnum,
};
