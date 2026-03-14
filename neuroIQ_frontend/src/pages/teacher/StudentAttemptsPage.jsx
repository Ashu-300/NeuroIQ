import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Modal } from '../../components/ui';
import { getExamStudentsWithReports, getProctoringReport } from '../../api/proctoring.api';
import { checkStudentEvaluationExists } from '../../api/answer.api';

// Helper to normalize MongoDB ObjectID
const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.$oid) return value.$oid;
  return String(value);
};

// Helper to format cheating probability (0-1 range → percentage)
const formatProbability = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `${(num * 100).toFixed(1)}%`;
};

const StudentAttemptsPage = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get exam reference from state or localStorage (for persistence across refreshes)
  const examRef = useMemo(() => {
    // First try from navigation state
    if (location.state?.question_bank_id) {
      return {
        question_bank_id: normalizeId(location.state.question_bank_id),
        exam_title: location.state.exam_title || '',
        subject: location.state.subject || '',
      };
    }
    // Fallback to localStorage
    const stored = localStorage.getItem(`exam_ref_${examId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          question_bank_id: normalizeId(parsed.question_bank_id),
          exam_title: parsed.exam_title || '',
          subject: parsed.subject || '',
        };
      } catch {
        return { question_bank_id: '', exam_title: '', subject: '' };
      }
    }
    return { question_bank_id: '', exam_title: '', subject: '' };
  }, [examId, location.state]);
  
  const questionBankId = examRef.question_bank_id;
  const examTitle = examRef.exam_title;
  const examSubject = examRef.subject;
  
  const [examDetails, setExamDetails] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState({}); // studentId -> boolean

  useEffect(() => {
    if (examId) {
      console.log('StudentAttemptsPage mounted with:', { examId, questionBankId, examTitle, examSubject });
      fetchData();
    }
  }, [examId, questionBankId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch student attempts
      const studentsData = await getExamStudentsWithReports(examId);
      const studentsList = studentsData.students || [];
      setStudents(studentsList);

      // Check evaluation status for each student (using question_bank_id)
      if (questionBankId && studentsList.length > 0) {
        const statusPromises = studentsList.map(async (student) => {
          const isEvaluated = await checkStudentEvaluationExists(questionBankId, student.student_id);
          return { studentId: student.student_id, isEvaluated };
        });
        
        const statuses = await Promise.all(statusPromises);
        const statusMap = {};
        statuses.forEach(({ studentId, isEvaluated }) => {
          statusMap[studentId] = isEvaluated;
        });
        setEvaluationStatus(statusMap);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (student) => {
    try {
      setReportLoading(true);
      setShowReportModal(true);
      const report = await getProctoringReport({
        examId,
        studentId: student.student_id,
        sessionId: student.session_id,
      });
      setSelectedReport(report);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setSelectedReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'auto_submitted': return 'bg-orange-100 text-orange-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Student Attempts {(examTitle || examDetails?.exam_name) && `- ${examTitle || examDetails?.exam_name}`}
          </h1>
          <p className="text-gray-500 mt-1">
            View student proctoring reports and violation details
          </p>
          {!questionBankId && (
            <p className="text-orange-500 text-sm mt-1">
              Warning: Missing question bank reference. Evaluation may not work properly.
            </p>
          )}
        </div>
        <Button onClick={fetchData} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Exam Info Card */}
      {examDetails && (
        <Card padding="md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Subject</p>
              <p className="font-medium">{examDetails.subject || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Branch</p>
              <p className="font-medium">{examDetails.branch || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Semester</p>
              <p className="font-medium">{examDetails.semester || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Students</p>
              <p className="font-medium text-indigo-600">{students.length}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Students List */}
      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-600">Loading student attempts...</span>
          </div>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No attempts yet</h3>
            <p className="mt-2 text-gray-500">No students have attempted this exam yet.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warnings</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Violations</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const report = student.proctoring_report;
                  const hasReport = !!report;
                  const violationCount = report?.violations?.length || student.violation_count || 0;
                  
                  return (
                    <tr key={student.session_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {student.student_id?.slice(0, 12)}...
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(student.status)}`}>
                          {student.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {student.start_time ? new Date(student.start_time).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {report ? formatDuration(report.duration_seconds) : 'N/A'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          student.warnings > 2 ? 'bg-red-100 text-red-800' :
                          student.warnings > 0 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {student.warnings || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          violationCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {violationCount}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewReport(student)}
                            disabled={!hasReport && student.status === 'active'}
                          >
                            {hasReport ? 'View Report' : 'No Report'}
                          </Button>
                          {evaluationStatus[student.student_id] ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                              onClick={() => navigate(`/teacher/exam/${examId}/evaluate/${student.session_id}/${student.student_id}`, {
                                state: {
                                  question_bank_id: questionBankId,
                                  exam_title: examTitle,
                                  subject: examSubject,
                                  viewOnly: true,
                                }
                              })}
                            >
                              <svg className="w-4 h-4 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              View Evaluation
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={student.status === 'active' || !questionBankId}
                              onClick={() => navigate(`/teacher/exam/${examId}/evaluate/${student.session_id}/${student.student_id}`, {
                                state: {
                                  question_bank_id: questionBankId,
                                  exam_title: examTitle,
                                  subject: examSubject,
                                }
                              })}
                              title={!questionBankId ? 'Missing exam reference. Please go back and try again.' : ''}
                            >
                              Evaluate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Proctoring Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => { setShowReportModal(false); setSelectedReport(null); }}
        title="Proctoring Report"
        size="lg"
      >
        <div className="space-y-6">
          {reportLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-gray-600">Loading report...</span>
            </div>
          ) : selectedReport ? (
            <>
              {/* Report Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Status</p>
                  <span className={`px-2 py-1 text-sm rounded-full ${getStatusColor(selectedReport.status)}`}>
                    {selectedReport.status?.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Duration</p>
                  <p className="font-medium">{formatDuration(selectedReport.duration_seconds)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Warnings</p>
                  <p className="font-medium text-orange-600">{selectedReport.total_warnings}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Identity</p>
                  <p className={`font-medium ${selectedReport.identity_verified ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedReport.identity_verified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Avg. Cheating Probability</p>
                  <p className="font-medium text-indigo-600">
                    {formatProbability(selectedReport.average_cheating_probability)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Max Cheating Probability</p>
                  <p className="font-medium text-indigo-600">
                    {formatProbability(selectedReport.max_cheating_probability)}
                  </p>
                </div>
              </div>

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Start Time</p>
                  <p className="font-medium">
                    {selectedReport.start_time ? new Date(selectedReport.start_time).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Time</p>
                  <p className="font-medium">
                    {selectedReport.end_time ? new Date(selectedReport.end_time).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Violations List */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Violations ({Array.isArray(selectedReport.violations) ? selectedReport.violations.length : 0})
                </h4>
                {Array.isArray(selectedReport.violations) && selectedReport.violations.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedReport.violations.map((violationId, idx) => (
                      <div
                        key={violationId || idx}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            #{idx + 1}
                          </span>
                          <span className="font-mono text-sm text-gray-900">
                            {String(violationId).slice(0, 12)}...
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2">No violations detected</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No report available for this session.
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => { setShowReportModal(false); setSelectedReport(null); }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentAttemptsPage;
